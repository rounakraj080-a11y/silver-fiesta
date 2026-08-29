const jwt = require("jsonwebtoken");
const { db, id } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

// In-memory presence: who is currently "in" each voice channel.
// { [channelId]: Map<userId, { id, username, avatarColor }> }
const voicePresence = new Map();

// Global online presence, counted by number of open sockets per user
// (a user can have the app open in more than one tab).
const onlineSocketCounts = new Map();

function broadcastPresence(io) {
  io.emit("presence_update", { onlineUserIds: Array.from(onlineSocketCounts.keys()) });
}

function voiceListFor(channelId) {
  const map = voicePresence.get(channelId);
  return map ? Array.from(map.values()) : [];
}

function leaveAllVoiceChannels(io, socket) {
  for (const [channelId, members] of voicePresence.entries()) {
    if (members.has(socket.data.user.id)) {
      members.delete(socket.data.user.id);
      io.to(`voice:${channelId}`).emit("voice_update", {
        channelId,
        members: voiceListFor(channelId),
      });
      socket.leave(`voice:${channelId}`);
    }
  }
}

function registerSocketHandlers(io) {
  // Authenticate every socket connection using the same JWT issued at login.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, JWT_SECRET);
      socket.data.user = payload; // { id, username, email }
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    onlineSocketCounts.set(user.id, (onlineSocketCounts.get(user.id) || 0) + 1);
    broadcastPresence(io);
    socket.emit("presence_update", { onlineUserIds: Array.from(onlineSocketCounts.keys()) });

    // --- Text channels -------------------------------------------------
    socket.on("join_channel", (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("leave_channel", (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("send_message", (payload, ack) => {
      try {
        const { channelId, content } = payload || {};
        if (!channelId || !content || !content.trim()) {
          if (ack) ack({ error: "content is required" });
          return;
        }

        const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
        if (!channel || channel.type !== "text") {
          if (ack) ack({ error: "Invalid text channel" });
          return;
        }
        const member = db
          .prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
          .get(channel.server_id, user.id);
        if (!member) {
          if (ack) ack({ error: "Not a member of this server" });
          return;
        }

        const messageId = id();
        const trimmed = content.trim().slice(0, 4000);
        db.prepare(
          `INSERT INTO messages (id, channel_id, user_id, content) VALUES (?, ?, ?, ?)`
        ).run(messageId, channelId, user.id, trimmed);

        const row = db
          .prepare(
            `SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar_color
             FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?`
          )
          .get(messageId);

        const message = {
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
          channelId,
          author: { id: row.user_id, username: row.username, avatarColor: row.avatar_color },
        };

        io.to(`channel:${channelId}`).emit("new_message", message);
        if (ack) ack({ message });
      } catch (err) {
        console.error("send_message error:", err);
        if (ack) ack({ error: "Server error sending message" });
      }
    });

    // --- Voice channels (simulated presence, no real audio) ------------
    socket.on("voice_join", (channelId) => {
      const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
      if (!channel || channel.type !== "voice") return;

      // Leave any other voice channel first (can only be in one at a time).
      leaveAllVoiceChannels(io, socket);

      if (!voicePresence.has(channelId)) voicePresence.set(channelId, new Map());
      voicePresence.get(channelId).set(user.id, {
        id: user.id,
        username: user.username,
      });
      socket.join(`voice:${channelId}`);
      socket.data.currentVoiceChannel = channelId;

      io.to(`voice:${channelId}`).emit("voice_update", {
        channelId,
        members: voiceListFor(channelId),
      });
      // Also let the joiner know immediately.
      socket.emit("voice_update", { channelId, members: voiceListFor(channelId) });
    });

    socket.on("voice_leave", (channelId) => {
      const members = voicePresence.get(channelId);
      if (members) {
        members.delete(user.id);
        io.to(`voice:${channelId}`).emit("voice_update", {
          channelId,
          members: voiceListFor(channelId),
        });
      }
      socket.leave(`voice:${channelId}`);
      socket.data.currentVoiceChannel = null;
    });

    socket.on("get_voice_state", (channelId, ack) => {
      if (ack) ack({ channelId, members: voiceListFor(channelId) });
    });

    socket.on("disconnect", () => {
      leaveAllVoiceChannels(io, socket);
      const next = (onlineSocketCounts.get(user.id) || 1) - 1;
      if (next <= 0) onlineSocketCounts.delete(user.id);
      else onlineSocketCounts.set(user.id, next);
      broadcastPresence(io);
    });
  });
}

module.exports = { registerSocketHandlers };

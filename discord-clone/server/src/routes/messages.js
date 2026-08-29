const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Fetch the most recent messages for a channel (oldest -> newest).
router.get("/channel/:channelId", requireAuth, (req, res) => {
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const membership = db
    .prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .get(channel.server_id, req.user.id);
  if (!membership) return res.status(403).json({ error: "Not a member of this server" });

  const rows = db
    .prepare(
      `SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar_color
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = ?
       ORDER BY m.created_at ASC
       LIMIT 200`
    )
    .all(req.params.channelId);

  const messages = rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: { id: r.user_id, username: r.username, avatarColor: r.avatar_color },
  }));

  res.json({ messages });
});

module.exports = router;

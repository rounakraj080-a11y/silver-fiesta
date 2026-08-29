const express = require("express");
const crypto = require("crypto");
const { db, id } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function inviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// List every server the current user is a member of.
router.get("/", requireAuth, (req, res) => {
  const servers = db
    .prepare(
      `SELECT s.* FROM servers s
       JOIN server_members m ON m.server_id = s.id
       WHERE m.user_id = ?
       ORDER BY s.created_at ASC`
    )
    .all(req.user.id);
  res.json({ servers });
});

// Create a new server. The creator is auto-added as a member, and the
// server gets a starter #general text channel + a voice channel so it
// is immediately usable.
router.post("/", requireAuth, (req, res) => {
  const { name, icon } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Server name is required" });
  }

  const serverId = id();
  const iconText = (icon && icon.trim()) || name.trim().slice(0, 2).toUpperCase();

  db.prepare(
    `INSERT INTO servers (id, name, icon_text, owner_id, invite_code) VALUES (?, ?, ?, ?, ?)`
  ).run(serverId, name.trim(), iconText, req.user.id, inviteCode());

  db.prepare(`INSERT INTO server_members (server_id, user_id) VALUES (?, ?)`).run(
    serverId,
    req.user.id
  );

  const generalId = id();
  const voiceId = id();
  db.prepare(
    `INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, 'general', 'text', 0)`
  ).run(generalId, serverId);
  db.prepare(
    `INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, 'General Voice', 'voice', 1)`
  ).run(voiceId, serverId);

  const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(serverId);
  res.status(201).json({ server });
});

// Join an existing server via its invite code.
router.post("/join", requireAuth, (req, res) => {
  const { inviteCode: code } = req.body || {};
  if (!code) return res.status(400).json({ error: "inviteCode is required" });

  const server = db.prepare("SELECT * FROM servers WHERE invite_code = ?").get(code.trim().toUpperCase());
  if (!server) return res.status(404).json({ error: "No server found with that invite code" });

  db.prepare(
    `INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?, ?)`
  ).run(server.id, req.user.id);

  res.json({ server });
});

// List members of a server (id, username, avatar color).
router.get("/:serverId/members", requireAuth, (req, res) => {
  const membership = db
    .prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .get(req.params.serverId, req.user.id);
  if (!membership) return res.status(403).json({ error: "Not a member of this server" });

  const members = db
    .prepare(
      `SELECT u.id, u.username, u.avatar_color FROM users u
       JOIN server_members m ON m.user_id = u.id
       WHERE m.server_id = ?
       ORDER BY u.username ASC`
    )
    .all(req.params.serverId);
  res.json({ members });
});

module.exports = router;

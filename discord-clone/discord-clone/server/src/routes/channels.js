const express = require("express");
const { db, id } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function assertMember(serverId, userId) {
  return db
    .prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .get(serverId, userId);
}

// List channels for a server, text channels first then voice, ordered by position.
router.get("/server/:serverId", requireAuth, (req, res) => {
  if (!assertMember(req.params.serverId, req.user.id)) {
    return res.status(403).json({ error: "Not a member of this server" });
  }
  const channels = db
    .prepare(
      `SELECT * FROM channels WHERE server_id = ? ORDER BY type ASC, position ASC`
    )
    .all(req.params.serverId);
  res.json({ channels });
});

// Create a new text or voice channel within a server.
router.post("/server/:serverId", requireAuth, (req, res) => {
  if (!assertMember(req.params.serverId, req.user.id)) {
    return res.status(403).json({ error: "Not a member of this server" });
  }
  const { name, type } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Channel name is required" });
  if (!["text", "voice"].includes(type)) {
    return res.status(400).json({ error: "type must be 'text' or 'voice'" });
  }

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM channels WHERE server_id = ? AND type = ?")
    .get(req.params.serverId, type).p;

  const channelId = id();
  const cleanName = type === "text" ? name.trim().toLowerCase().replace(/\s+/g, "-") : name.trim();

  db.prepare(
    `INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, ?, ?, ?)`
  ).run(channelId, req.params.serverId, cleanName, type, maxPos + 1);

  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
  res.status(201).json({ channel });
});

module.exports = router;

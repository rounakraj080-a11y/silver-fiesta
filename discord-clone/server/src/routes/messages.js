const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { upload, MAX_UPLOAD_MB } = require("../middleware/upload");

const router = express.Router();

router.get("/channel/:channelId", requireAuth, (req, res) => {
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const membership = db
    .prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .get(channel.server_id, req.user.id);
  if (!membership) return res.status(403).json({ error: "Not a member of this server" });

  const rows = db
    .prepare(
      `SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username, u.avatar_color,
              m.attachment_url, m.attachment_name, m.attachment_type, m.attachment_size
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
    attachment: r.attachment_url
      ? {
          url: r.attachment_url,
          name: r.attachment_name,
          type: r.attachment_type,
          size: r.attachment_size,
        }
      : null,
  }));

  res.json({ messages });
});

router.post("/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: `File too large — max ${MAX_UPLOAD_MB}MB` });
      }
      return res.status(400).json({ error: "Upload failed" });
    }
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  });
});

module.exports = router;

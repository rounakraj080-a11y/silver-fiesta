const express = require("express");
const bcrypt = require("bcryptjs");
const { db, id } = require("../db");
const { requireAuth, signToken } = require("../middleware/auth");

const router = express.Router();

const AVATAR_COLORS = [
  "#5865F2", "#EB459E", "#57F287", "#FEE75C",
  "#ED4245", "#3BA55D", "#FAA61A", "#9B59B6",
];

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, avatarColor: u.avatar_color };
}

router.post("/register", (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .get(email, username);
  if (existing) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = id();
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, username, email, passwordHash, color);

  // Automatically join the default "Welcome Server" so new users land
  // somewhere with content instead of an empty screen.
  const defaultServer = db.prepare("SELECT id FROM servers ORDER BY created_at ASC LIMIT 1").get();
  if (defaultServer) {
    db.prepare(
      `INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?, ?)`
    ).run(defaultServer.id, userId);
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { db, id } = require("../db");
const { requireAuth, signToken } = require("../middleware/auth");
const { sendResetCodeEmail } = require("../mailer");

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

// --- Forgot password: step 1, request a code -----------------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  const genericResponse = { message: "If that email is registered, a reset code has been sent." };

  if (!user) {
    return res.json(genericResponse);
  }

  const code = String(crypto.randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare(`UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?`).run(
    code,
    expires,
    user.id
  );

  try {
    await sendResetCodeEmail(user.email, code);
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  res.json(genericResponse);
});

// --- Forgot password: step 2, verify the code and set a new password -----
router.post("/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "email, code and newPassword are required" });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !user.reset_code || user.reset_code !== String(code)) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }
  if (!user.reset_code_expires || new Date(user.reset_code_expires) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    `UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?`
  ).run(passwordHash, user.id);

  res.json({ message: "Password updated — you can now log in." });
});

module.exports = router;

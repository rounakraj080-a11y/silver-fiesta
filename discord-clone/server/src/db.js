const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const DB_FILE = process.env.DATABASE_FILE || "./data/discord_clone.db";
const resolvedPath = path.isAbsolute(DB_FILE) ? DB_FILE : path.join(process.cwd(), DB_FILE);

// Make sure the folder that will hold the database file exists.
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function id() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------
// Schema — created automatically on first boot. No manual migration
// step required.
// ---------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon_text TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS server_members (
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (server_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'voice')),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id, position);
`);

// ---------------------------------------------------------------------
// Seed — a default global server + #general/#gaming text channels and a
// voice channel, so the app is immediately usable after first launch.
// This only runs once (guarded by checking if any server exists).
// ---------------------------------------------------------------------
function seedIfEmpty() {
  const serverCount = db.prepare("SELECT COUNT(*) AS c FROM servers").get().c;
  if (serverCount > 0) return;

  const systemUserId = id();
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, avatar_color)
     VALUES (?, ?, ?, ?, ?)`
  ).run(systemUserId, "system", "system@local", "!", "#5865F2");

  const serverId = id();
  db.prepare(
    `INSERT INTO servers (id, name, icon_text, owner_id, invite_code)
     VALUES (?, ?, ?, ?, ?)`
  ).run(serverId, "Welcome Server", "WS", systemUserId, "WELCOME01");

  const channels = [
    { name: "general", type: "text", position: 0 },
    { name: "gaming", type: "text", position: 1 },
    { name: "General Voice", type: "voice", position: 2 },
  ];
  const insertChannel = db.prepare(
    `INSERT INTO channels (id, server_id, name, type, position) VALUES (?, ?, ?, ?, ?)`
  );
  const channelIds = {};
  for (const c of channels) {
    const cid = id();
    channelIds[c.name] = cid;
    insertChannel.run(cid, serverId, c.name, c.type, c.position);
  }

  db.prepare(
    `INSERT INTO messages (id, channel_id, user_id, content) VALUES (?, ?, ?, ?)`
  ).run(
    id(),
    channelIds["general"],
    systemUserId,
    "Welcome! This is the default #general channel — say hi 👋"
  );

  console.log(`[db] seeded default "Welcome Server" (${serverId}) with #general, #gaming, and a voice channel`);
}

seedIfEmpty();

// ---------------------------------------------------------------------
// Lightweight migration — adds password-reset columns to existing
// databases that were created before this feature existed. Safe to run
// every boot: it only alters the table if the column is missing.
// ---------------------------------------------------------------------
function migrate() {
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userColumns.includes("reset_code")) {
    db.exec("ALTER TABLE users ADD COLUMN reset_code TEXT");
  }
  if (!userColumns.includes("reset_code_expires")) {
    db.exec("ALTER TABLE users ADD COLUMN reset_code_expires TEXT");
  }
}
migrate();

module.exports = { db, id };

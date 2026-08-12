// SQLite database — a single file on disk, no external DB server needed.
// Uses Node's built-in node:sqlite module (Node 22.5+), so there's nothing to
// compile on the machine running this — no build tools, no native modules.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'megacracks.db');
require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL');

raw.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    username_lower TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS card_states (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    have INTEGER NOT NULL DEFAULT 0,
    repe INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id)
  );

  CREATE INDEX IF NOT EXISTS idx_card_states_user ON card_states(user_id);
`);

// Thin wrapper so server.js's db.prepare(...).run/get/all(...) calls (written
// against the better-sqlite3-style API) keep working unchanged.
const db = {
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
    };
  },
  exec(sql) { return raw.exec(sql); },
};

module.exports = db;


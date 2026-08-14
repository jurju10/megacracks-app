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
    status TEXT NOT NULL DEFAULT 'physical',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id)
  );

  CREATE INDEX IF NOT EXISTS idx_card_states_user ON card_states(user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id, read_at);
  CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(from_user_id, to_user_id);

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_gives TEXT NOT NULL,
    to_gives TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_trades_to ON trades(to_user_id, status);
  CREATE INDEX IF NOT EXISTS idx_trades_from ON trades(from_user_id, status);
`);

// migrate older databases created before the "status" column existed
try {
  const cols = raw.prepare("PRAGMA table_info(card_states)").all();
  if (!cols.some(c => c.name === 'status')) {
    raw.exec("ALTER TABLE card_states ADD COLUMN status TEXT NOT NULL DEFAULT 'physical'");
  }
} catch (e) { /* ignore — fresh DB already has it */ }

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


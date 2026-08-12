require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { CHECKLIST, CARD_BY_ID, TEAM_ORDER } = require('./checklist');
const { signToken, authRequired } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;

// ---------- helpers ----------
function publicChecklist() {
  return { cards: CHECKLIST, teamOrder: TEAM_ORDER };
}

function getUserState(userId) {
  // sparse map: only cards the user has touched (have and/or repe true) are stored
  const rows = db.prepare('SELECT card_id, have, repe FROM card_states WHERE user_id = ?').all(userId);
  const state = {};
  rows.forEach(r => {
    if (r.have || r.repe) state[r.card_id] = { have: !!r.have, repe: !!r.repe };
  });
  return state;
}

function getUserRepes(userId) {
  const rows = db.prepare('SELECT card_id FROM card_states WHERE user_id = ? AND repe = 1').all(userId);
  return rows
    .map(r => CARD_BY_ID[r.card_id])
    .filter(Boolean)
    .map(c => ({ id: c.id, num: c.num, name: c.name, team: c.team }));
}

// ---------- auth routes ----------
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  if (username.length < 2 || username.length > 40) return res.status(400).json({ error: 'El usuario debe tener entre 2 y 40 caracteres' });
  if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });

  const usernameLower = username.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE username_lower = ?').get(usernameLower);
  if (existing) return res.status(409).json({ error: 'Ese usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, username_lower, password_hash) VALUES (?, ?, ?)')
    .run(username.trim(), usernameLower, hash);

  const user = { id: info.lastInsertRowid, username: username.trim() };
  res.json({ token: signToken(user), username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });

  const usernameLower = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE username_lower = ?').get(usernameLower);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({ token: signToken(user), username: user.username });
});

// ---------- checklist ----------
app.get('/api/checklist', (req, res) => {
  res.json(publicChecklist());
});

// ---------- own collection ----------
app.get('/api/collection', authRequired, (req, res) => {
  res.json({ state: getUserState(req.user.id) });
});

// Upsert a single card's have/repe flags. Small payload, cheap, called on every tap.
app.post('/api/collection/card', authRequired, (req, res) => {
  const { cardId, have, repe } = req.body || {};
  if (!cardId || !CARD_BY_ID[cardId]) return res.status(400).json({ error: 'Carta desconocida' });

  const haveVal = have ? 1 : 0;
  const repeVal = have && repe ? 1 : 0; // can't be a duplicate of a card you don't have

  db.prepare(`
    INSERT INTO card_states (user_id, card_id, have, repe, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, card_id) DO UPDATE SET have = excluded.have, repe = excluded.repe, updated_at = excluded.updated_at
  `).run(req.user.id, cardId, haveVal, repeVal);

  res.json({ ok: true });
});

app.post('/api/collection/reset', authRequired, (req, res) => {
  db.prepare('DELETE FROM card_states WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ---------- shared directory: everyone's repes (never passwords, never full collections) ----------
app.get('/api/users', authRequired, (req, res) => {
  const users = db.prepare('SELECT id, username FROM users').all();
  const result = users
    .filter(u => u.id !== req.user.id)
    .map(u => ({ username: u.username, repes: getUserRepes(u.id) }));
  res.json({ users: result });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Megacracks server escuchando en http://localhost:${PORT}`);
});

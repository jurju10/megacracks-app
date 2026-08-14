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
  // sparse map: only cards the user has touched (have and/or repeQty > 0) are stored
  const rows = db.prepare('SELECT card_id, have, repe, status FROM card_states WHERE user_id = ?').all(userId);
  const state = {};
  rows.forEach(r => {
    if (r.have || r.repe > 0) state[r.card_id] = { have: !!r.have, repeQty: r.repe || 0, status: r.status || 'physical' };
  });
  return state;
}

function getUserRepes(userId) {
  const rows = db.prepare('SELECT card_id, repe FROM card_states WHERE user_id = ? AND repe > 0').all(userId);
  return rows
    .map(r => {
      const c = CARD_BY_ID[r.card_id];
      return c ? { id: c.id, num: c.num, name: c.name, team: c.team, qty: r.repe } : null;
    })
    .filter(Boolean);
}

function getHaveSet(userId) {
  const rows = db.prepare('SELECT card_id FROM card_states WHERE user_id = ? AND have = 1').all(userId);
  return new Set(rows.map(r => r.card_id));
}

function getRepeMap(userId) {
  const rows = db.prepare('SELECT card_id, repe FROM card_states WHERE user_id = ? AND repe > 0').all(userId);
  const map = {};
  rows.forEach(r => { map[r.card_id] = r.repe; });
  return map;
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

// Upsert a single card's have flag + repeated-copies quantity. Small payload, called on every tap.
// Marking a card by hand always sets it to "physical" (green) — a manual tap means you actually have it.
app.post('/api/collection/card', authRequired, (req, res) => {
  const { cardId, have, repeQty } = req.body || {};
  if (!cardId || !CARD_BY_ID[cardId]) return res.status(400).json({ error: 'Carta desconocida' });

  const haveVal = have ? 1 : 0;
  // can't have duplicates of a card you don't have; quantity is always a non-negative integer
  const repeVal = haveVal ? Math.max(0, Math.min(999, Math.floor(Number(repeQty) || 0))) : 0;

  db.prepare(`
    INSERT INTO card_states (user_id, card_id, have, repe, status, updated_at)
    VALUES (?, ?, ?, ?, 'physical', datetime('now'))
    ON CONFLICT(user_id, card_id) DO UPDATE SET have = excluded.have, repe = excluded.repe, status = 'physical', updated_at = excluded.updated_at
  `).run(req.user.id, cardId, haveVal, repeVal);

  res.json({ ok: true });
});

// Confirm physical arrival of a card that came from an accepted trade (orange -> green).
app.post('/api/collection/confirm/:cardId', authRequired, (req, res) => {
  const cardId = req.params.cardId;
  if (!CARD_BY_ID[cardId]) return res.status(400).json({ error: 'Carta desconocida' });
  const row = db.prepare('SELECT have FROM card_states WHERE user_id = ? AND card_id = ?').get(req.user.id, cardId);
  if (!row || !row.have) return res.status(400).json({ error: 'No tienes esa carta marcada' });
  db.prepare(`UPDATE card_states SET status = 'physical', updated_at = datetime('now') WHERE user_id = ? AND card_id = ?`)
    .run(req.user.id, cardId);
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

// ---------- direct messages between two users ----------
function findUserByUsername(username) {
  return db.prepare('SELECT id, username FROM users WHERE username_lower = ?').get(String(username || '').trim().toLowerCase());
}

app.get('/api/messages/unread-count', authRequired, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE to_user_id = ? AND read_at IS NULL').get(req.user.id);
  res.json({ count: row ? row.n : 0 });
});

// Full conversation thread with one other user. Marks their messages to you as read.
app.get('/api/messages/:username', authRequired, (req, res) => {
  const other = findUserByUsername(req.params.username);
  if (!other) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare(`
    UPDATE messages SET read_at = datetime('now')
    WHERE to_user_id = ? AND from_user_id = ? AND read_at IS NULL
  `).run(req.user.id, other.id);

  const rows = db.prepare(`
    SELECT id, from_user_id, to_user_id, body, created_at
    FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
    ORDER BY id ASC
  `).all(req.user.id, other.id, other.id, req.user.id);

  const messages = rows.map(r => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    mine: r.from_user_id === req.user.id,
  }));
  res.json({ username: other.username, messages });
});

app.post('/api/messages/:username', authRequired, (req, res) => {
  const other = findUserByUsername(req.params.username);
  if (!other) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'No puedes escribirte a ti mismo' });

  const body = String((req.body || {}).body || '').trim();
  if (!body) return res.status(400).json({ error: 'Escribe algo antes de enviar' });
  if (body.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  const info = db.prepare(`
    INSERT INTO messages (from_user_id, to_user_id, body, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(req.user.id, other.id, body);

  res.json({ id: info.lastInsertRowid, ok: true });
});

function sendSystemMessage(fromUserId, toUserId, body) {
  db.prepare(`INSERT INTO messages (from_user_id, to_user_id, body, created_at) VALUES (?, ?, ?, datetime('now'))`)
    .run(fromUserId, toUserId, body);
}

// ---------- trades: propose a card exchange, accept/reject it ----------

// What could I get from `username` (their repes I'm missing), and what could I
// offer them (my repes they're missing) — the two columns of the trade builder.
app.get('/api/trade-match/:username', authRequired, (req, res) => {
  const other = findUserByUsername(req.params.username);
  if (!other) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'No puedes cambiar contigo mismo' });

  const myHave = getHaveSet(req.user.id);
  const theirHave = getHaveSet(other.id);
  const myRepes = getRepeMap(req.user.id);
  const theirRepes = getRepeMap(other.id);

  const theirOffer = Object.keys(theirRepes)
    .filter(cardId => !myHave.has(cardId))
    .map(cardId => { const c = CARD_BY_ID[cardId]; return c ? { ...c, qty: theirRepes[cardId] } : null; })
    .filter(Boolean);

  const myOffer = Object.keys(myRepes)
    .filter(cardId => !theirHave.has(cardId))
    .map(cardId => { const c = CARD_BY_ID[cardId]; return c ? { ...c, qty: myRepes[cardId] } : null; })
    .filter(Boolean);

  res.json({ username: other.username, theirOffer, myOffer });
});

function cardLabel(cardId) {
  const c = CARD_BY_ID[cardId];
  return c ? (c.name + (c.num ? ' #' + c.num : '')) : cardId;
}

app.post('/api/trades', authRequired, (req, res) => {
  const { toUsername, fromGives, toGives } = req.body || {};
  const other = findUserByUsername(toUsername);
  if (!other) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'No puedes cambiar contigo mismo' });

  const fg = Array.isArray(fromGives) ? [...new Set(fromGives)] : [];
  const tg = Array.isArray(toGives) ? [...new Set(toGives)] : [];
  if (fg.length === 0 && tg.length === 0) return res.status(400).json({ error: 'Elige al menos una carta' });

  // re-validate against current state server-side, don't trust the client blindly
  const myRepes = getRepeMap(req.user.id);
  const theirRepes = getRepeMap(other.id);
  const myHave = getHaveSet(req.user.id);
  const theirHave = getHaveSet(other.id);

  for (const cardId of fg) {
    if (!CARD_BY_ID[cardId] || !myRepes[cardId] || theirHave.has(cardId)) {
      return res.status(400).json({ error: 'Una de tus cartas elegidas ya no es válida' });
    }
  }
  for (const cardId of tg) {
    if (!CARD_BY_ID[cardId] || !theirRepes[cardId] || myHave.has(cardId)) {
      return res.status(400).json({ error: 'Una de las cartas del otro usuario ya no es válida' });
    }
  }

  const info = db.prepare(`
    INSERT INTO trades (from_user_id, to_user_id, from_gives, to_gives, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `).run(req.user.id, other.id, JSON.stringify(fg), JSON.stringify(tg));

  const summary = 'Te propone ' + (fg.length + tg.length) + ' carta' + (fg.length+tg.length===1?'':'s') +
    ' en cambio (' + fg.length + ' te da, ' + tg.length + ' te pide). Ve a Coincidencias para verlo.';
  sendSystemMessage(req.user.id, other.id, '📦 ' + summary);

  res.json({ id: info.lastInsertRowid, ok: true });
});

app.get('/api/trades/pending', authRequired, (req, res) => {
  function resolveTrade(t) {
    const fromGives = JSON.parse(t.from_gives).map(id => ({ id, label: cardLabel(id) }));
    const toGives = JSON.parse(t.to_gives).map(id => ({ id, label: cardLabel(id) }));
    return { id: t.id, fromGives, toGives, createdAt: t.created_at };
  }

  const incomingRows = db.prepare(`
    SELECT t.*, u.username AS other_username FROM trades t
    JOIN users u ON u.id = t.from_user_id
    WHERE t.to_user_id = ? AND t.status = 'pending'
    ORDER BY t.id DESC
  `).all(req.user.id);

  const outgoingRows = db.prepare(`
    SELECT t.*, u.username AS other_username FROM trades t
    JOIN users u ON u.id = t.to_user_id
    WHERE t.from_user_id = ? AND t.status = 'pending'
    ORDER BY t.id DESC
  `).all(req.user.id);

  res.json({
    incoming: incomingRows.map(t => Object.assign({ username: t.other_username }, resolveTrade(t))),
    outgoing: outgoingRows.map(t => Object.assign({ username: t.other_username }, resolveTrade(t))),
  });
});

function adjustCard(userId, cardId, deltaRepe, setHave) {
  const row = db.prepare('SELECT have, repe FROM card_states WHERE user_id = ? AND card_id = ?').get(userId, cardId);
  const have = row ? row.have : 0;
  const repe = row ? row.repe : 0;
  const newRepe = Math.max(0, repe + deltaRepe);
  const newHave = setHave === null ? have : (setHave ? 1 : have);
  const newStatus = (setHave && !have) ? 'pending' : (row ? undefined : 'physical');
  if (row) {
    if (newStatus) {
      db.prepare(`UPDATE card_states SET have=?, repe=?, status=?, updated_at=datetime('now') WHERE user_id=? AND card_id=?`)
        .run(newHave, newRepe, newStatus, userId, cardId);
    } else {
      db.prepare(`UPDATE card_states SET have=?, repe=?, updated_at=datetime('now') WHERE user_id=? AND card_id=?`)
        .run(newHave, newRepe, userId, cardId);
    }
  } else {
    db.prepare(`INSERT INTO card_states (user_id, card_id, have, repe, status, updated_at) VALUES (?,?,?,?,?,datetime('now'))`)
      .run(userId, cardId, newHave, newRepe, setHave ? 'pending' : 'physical');
  }
}

app.post('/api/trades/:id/respond', authRequired, (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Cambio no encontrado' });
  if (trade.to_user_id !== req.user.id) return res.status(403).json({ error: 'Este cambio no es para ti' });
  if (trade.status !== 'pending') return res.status(400).json({ error: 'Este cambio ya se resolvió' });

  const accept = !!(req.body || {}).accept;
  const fromGives = JSON.parse(trade.from_gives); // cards proposer gives -> land on recipient (me), as pending/orange
  const toGives = JSON.parse(trade.to_gives);     // cards I give -> land on proposer, as pending/orange

  if (accept) {
    fromGives.forEach(cardId => {
      adjustCard(trade.from_user_id, cardId, -1, null);      // proposer loses one repeat
      adjustCard(trade.to_user_id, cardId, 0, true);          // I gain the card (pending/orange)
    });
    toGives.forEach(cardId => {
      adjustCard(trade.to_user_id, cardId, -1, null);         // I lose one repeat
      adjustCard(trade.from_user_id, cardId, 0, true);        // proposer gains the card (pending/orange)
    });
    db.prepare(`UPDATE trades SET status='accepted', responded_at=datetime('now') WHERE id=?`).run(trade.id);
    sendSystemMessage(req.user.id, trade.from_user_id, '✅ Aceptó tu propuesta de cambio. Revisa tu pestaña Tengo — las cartas nuevas salen en naranja hasta que las confirmes.');
  } else {
    db.prepare(`UPDATE trades SET status='rejected', responded_at=datetime('now') WHERE id=?`).run(trade.id);
    sendSystemMessage(req.user.id, trade.from_user_id, '❌ Rechazó tu propuesta de cambio.');
  }

  res.json({ ok: true });
});

app.post('/api/trades/:id/cancel', authRequired, (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Cambio no encontrado' });
  if (trade.from_user_id !== req.user.id) return res.status(403).json({ error: 'Solo quien propuso el cambio puede cancelarlo' });
  if (trade.status !== 'pending') return res.status(400).json({ error: 'Este cambio ya se resolvió' });
  db.prepare(`UPDATE trades SET status='cancelled', responded_at=datetime('now') WHERE id=?`).run(trade.id);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Megacracks server escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;

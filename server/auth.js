const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FALTA JWT_SECRET en las variables de entorno. Mira el archivo .env.example.');
  process.exit(1);
}

const TOKEN_TTL = '90d'; // long-lived, this is a casual friend-group app, not a bank

function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // A signature can be valid while the user it points to no longer exists in
    // whichever database file is actually live right now (e.g. after a DB path
    // mix-up). Checking here turns that into a clean "log in again" instead of
    // a raw foreign-key crash deeper in some other route.
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(payload.uid);
    if (!exists) return res.status(401).json({ error: 'Sesión inválida o caducada' });
    req.user = { id: payload.uid, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o caducada' });
  }
}

module.exports = { signToken, authRequired };

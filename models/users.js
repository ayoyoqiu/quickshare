const crypto = require('crypto');
const { get, run } = require('./db');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

async function createUser(username, password) {
  const normalized = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const result = await run(
    'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id, username',
    [normalized, passwordHash, Date.now()]
  );

  return result.row || null;
}

async function findUserByUsername(username) {
  const normalized = username.trim().toLowerCase();
  return get('SELECT id, username, password_hash FROM users WHERE username = $1', [normalized]);
}

async function findUserById(userId) {
  return get('SELECT id, username FROM users WHERE id = $1', [userId]);
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword
};

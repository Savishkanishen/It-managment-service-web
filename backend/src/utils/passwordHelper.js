const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Checks if a string is already a valid bcrypt hash
 */
function isBcryptHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  // Standard bcrypt hash format: $2a$, $2b$, or $2y$ followed by cost and 53 chars
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

/**
 * Hashes a plain-text password using modern bcrypt salted hashing
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a stored hash or legacy plaintext
 * @param {string} plainPassword 
 * @param {string} storedHash 
 * @returns {Promise<{ matches: boolean, needsRehash: boolean }>}
 */
async function comparePassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) {
    return { matches: false, needsRehash: false };
  }

  if (isBcryptHash(storedHash)) {
    const matches = await bcrypt.compare(plainPassword, storedHash);
    return { matches, needsRehash: false };
  }

  // Legacy plaintext fallback (e.g. seed data 'password123')
  const matches = plainPassword === storedHash;
  return {
    matches,
    needsRehash: matches, // Automatically flag to rehash with modern bcrypt
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  isBcryptHash,
  SALT_ROUNDS,
};


const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { normalizeRole } = require('../utils/roleHelper');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.password_hash, u.is_active,
              r.name as role_name, d.name as division_name
       FROM itsm.users u
       LEFT JOIN itsm.roles r ON u.role_id = r.id
       LEFT JOIN itsm.divisions d ON u.division_id = d.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact Super Admin.' });
    }

    // Passwords in database are plaintext 'password123'
    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const normalizedRole = normalizeRole(user.role_name);

    // Record login audit log
    try {
      await db.query(
        `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
         VALUES ($1::uuid, 'LOGIN', 'Session', $1::text, $2, 'Authentication')`,
        [user.id, `${user.display_name} logged in`]
      );
    } catch (e) {
      console.warn('Could not record login audit log:', e.message);
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.display_name,
      email: user.email,
      role: normalizedRole,
      roleName: user.role_name,
      division: user.division_name || 'IT Department',
      active: user.is_active,
      avatar: user.display_name ? user.display_name.slice(0, 2).toUpperCase() : 'US',
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me (optional verification)
router.get('/me', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'No user ID provided' });

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.is_active,
              r.name as role_name, d.name as division_name
       FROM itsm.users u
       LEFT JOIN itsm.roles r ON u.role_id = r.id
       LEFT JOIN itsm.divisions d ON u.division_id = d.id
       WHERE u.id = $1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    res.json({
      id: user.id,
      username: user.username,
      name: user.display_name,
      email: user.email,
      role: normalizeRole(user.role_name),
      roleName: user.role_name,
      division: user.division_name,
      active: user.is_active,
      avatar: user.display_name ? user.display_name.slice(0, 2).toUpperCase() : 'US',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
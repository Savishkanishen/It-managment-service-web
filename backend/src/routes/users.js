const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { normalizeRole, denormalizeRole } = require('../utils/roleHelper');

// GET /api/users - Get all users formatted for frontend
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.username, u.email, u.display_name, u.is_active, 
             d.name as division, r.name as role_name
      FROM itsm.users u
      LEFT JOIN itsm.divisions d ON u.division_id = d.id
      LEFT JOIN itsm.roles r ON u.role_id = r.id
      ORDER BY u.display_name ASC
    `);

    const formatted = rows.map(u => ({
      id: u.id,
      name: u.display_name,
      username: u.username,
      email: u.email,
      role: normalizeRole(u.role_name),
      roleName: u.role_name,
      division: u.division || 'IT Department',
      active: u.is_active,
      avatar: u.display_name ? u.display_name.slice(0, 2).toUpperCase() : 'US',
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// PATCH /api/users/:id/role - Update user role
router.patch('/:id/role', async (req, res) => {
  const { role } = req.body;
  const targetRoleName = denormalizeRole(role);

  try {
    // Find role id
    const roleRes = await db.query(
      'SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)',
      [targetRoleName]
    );

    if (roleRes.rows.length === 0) {
      return res.status(400).json({ error: `Role '${role}' not recognized` });
    }

    const roleId = roleRes.rows[0].id;
    const { rows } = await db.query(
      'UPDATE itsm.users SET role_id = $1, updated_at = NOW() WHERE id::text = $2 OR LOWER(username) = LOWER($2) RETURNING id, display_name',
      [roleId, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, id: rows[0].id, role: normalizeRole(roleRes.rows[0].name) });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Server error updating user role' });
  }
});

// PATCH /api/users/:id/active - Toggle user active status
router.patch('/:id/active', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE itsm.users SET is_active = NOT is_active, updated_at = NOW() WHERE id::text = $1 OR LOWER(username) = LOWER($1) RETURNING id, display_name, is_active',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: rows[0].id, active: rows[0].is_active });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Server error updating user status' });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  const { username, name, email, password, role, division, createdBy } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  try {
    const targetRoleName = denormalizeRole(role || 'trainee');
    const roleRes = await db.query('SELECT id, name FROM itsm.roles WHERE LOWER(name) = LOWER($1)', [targetRoleName]);
    const roleId = roleRes.rows[0]?.id || null;

    let divisionId = null;
    let divisionName = division || 'Information Technology';
    if (division) {
      const divRes = await db.query(
        `SELECT id, name FROM itsm.divisions 
         WHERE id::text = $1 
            OR LOWER(name) = LOWER($1) 
            OR LOWER(code) = LOWER($1)
            OR LOWER(name) ILIKE '%' || LOWER($1) || '%'
         LIMIT 1`,
        [division.trim()]
      );
      if (divRes.rows.length > 0) {
        divisionId = divRes.rows[0].id;
        divisionName = divRes.rows[0].name;
      }
    }

    if (!divisionId) {
      const fallback = await db.query("SELECT id, name FROM itsm.divisions WHERE code = 'IT' OR LOWER(name) LIKE '%technology%' LIMIT 1");
      if (fallback.rows.length > 0) {
        divisionId = fallback.rows[0].id;
        divisionName = fallback.rows[0].name;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO itsm.users (username, email, display_name, password_hash, role_id, division_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [username.trim(), email.trim().toLowerCase(), name.trim(), password ? password.trim() : 'password123', roleId, divisionId]
    );

    const newUser = rows[0];

    // Audit log
    const auditUserId = createdBy || req.headers['x-user-id'];
    if (auditUserId) {
      try {
        await db.query(
          `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
           VALUES ($1::uuid, 'CREATE', 'User', $2::text, $3, 'User Management')`,
          [auditUserId, newUser.id, `Created user account ${newUser.display_name} (${newUser.username}) with role ${targetRoleName}`]
        );
      } catch (auditErr) {
        console.warn('Could not record user creation audit log:', auditErr.message);
      }
    }

    res.status(201).json({
      id: newUser.id,
      name: newUser.display_name,
      username: newUser.username,
      email: newUser.email,
      role: normalizeRole(targetRoleName),
      roleName: targetRoleName,
      division: divisionName,
      active: newUser.is_active,
      avatar: newUser.display_name ? newUser.display_name.slice(0, 2).toUpperCase() : 'US',
    });
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('username')) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      if (err.detail && err.detail.includes('email')) {
        return res.status(409).json({ error: 'Email address is already in use' });
      }
      return res.status(409).json({ error: 'A user with this username or email already exists' });
    }
    res.status(500).json({ error: err.message || 'Server error creating user' });
  }
});

module.exports = router;
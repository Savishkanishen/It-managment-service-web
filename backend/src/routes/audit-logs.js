const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId } = require('../utils/resolveHelper');

function formatAuditLog(l) {
  return {
    id: l.id,
    timestamp: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
    userId: l.user_id,
    username: l.username || l.display_name || 'System',
    action: l.action,
    entityType: l.entity_type,
    entityId: l.entity_id,
    description: l.description,
    module: l.module || 'System',
  };
}

// GET /api/audit-logs
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, u.username, u.display_name
      FROM itsm.audit_logs l
      LEFT JOIN itsm.users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    res.json(rows.map(formatAuditLog));
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

// POST /api/audit-logs
router.post('/', async (req, res) => {
  const { userId, username, action, entityType, entityId, description, module } = req.body;
  try {
    const finalUserId = await resolveUserId(db, userId || username);

    const { rows } = await db.query(
      `INSERT INTO itsm.audit_logs (user_id, action, entity_type, entity_id, description, module)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [finalUserId, action || 'UPDATE', entityType || 'System', entityId || null, description, module || 'System']
    );

    res.status(201).json(formatAuditLog(rows[0]));
  } catch (err) {
    console.error('Error inserting audit log:', err);
    res.status(500).json({ error: 'Server error inserting audit log' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/divisions
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, code FROM itsm.divisions ORDER BY name ASC');
    // If requested as simple string array
    if (req.query.format === 'names') {
      return res.json(rows.map(r => r.name));
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: 'Server error fetching divisions' });
  }
});

module.exports = router;
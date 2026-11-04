const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId } = require('../utils/resolveHelper');

function formatPublication(p) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    status: p.status || 'Pending Review',
    requestedBy: p.requested_by,
    approvedBy: p.approved_by,
    publishedBy: p.published_by,
    publishedAt: p.published_at ? new Date(p.published_at).toISOString() : null,
    requestedAt: p.requested_at ? new Date(p.requested_at).toISOString() : (p.created_at ? new Date(p.created_at).toISOString() : null),
    attachments: p.attachments || [],
    createdAt: p.created_at,
  };
}

// GET /api/publications
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itsm.publications ORDER BY created_at DESC');
    res.json(rows.map(formatPublication));
  } catch (err) {
    console.error('Error fetching publications:', err);
    res.status(500).json({ error: 'Server error fetching publications' });
  }
});

// POST /api/publications
router.post('/', async (req, res) => {
  const { title, content, attachments, requestedBy, user } = req.body;
  try {
    const reqBy = await resolveUserId(db, requestedBy || user?.id);
    const { rows } = await db.query(
      `INSERT INTO itsm.publications (title, content, status, requested_by, attachments, requested_at)
       VALUES ($1, $2, 'Pending Review', $3, $4, NOW()) RETURNING *`,
      [title, content, reqBy, JSON.stringify(attachments || [])]
    );
    res.status(201).json(formatPublication(rows[0]));
  } catch (err) {
    console.error('Error creating publication:', err);
    res.status(500).json({ error: err.message || 'Server error creating publication' });
  }
});

// PATCH /api/publications/:id/approve
router.patch('/:id/approve', async (req, res) => {
  const { approvedBy, user } = req.body;
  try {
    const approver = await resolveUserId(db, approvedBy || user?.id);
    const { rows } = await db.query(
      `UPDATE itsm.publications 
       SET status = 'Published', 
           approved_by = $1, 
           published_by = $1, 
           published_at = NOW()
       WHERE id::text = $2 RETURNING *`,
      [approver, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Publication not found' });
    res.json(formatPublication(rows[0]));
  } catch (err) {
    console.error('Error approving publication:', err);
    res.status(500).json({ error: 'Server error approving publication' });
  }
});

module.exports = router;
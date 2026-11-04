const express = require('express');
const router = express.Router();
const db = require('../config/db');

function formatStock(s) {
  let status = s.status;
  if (!status || status === 'Available' || status === 'Low Stock' || status === 'Not Available') {
    if (s.quantity === 0) status = 'Not Available';
    else if (s.quantity <= s.min_threshold) status = 'Low Stock';
    else if (s.status !== 'Not Available') status = 'Available';
  }

  return {
    id: s.id,
    category: s.category,
    name: s.name,
    quantity: s.quantity,
    minThreshold: s.min_threshold,
    unit: s.unit,
    status: status,
    lastUpdated: s.updated_at ? new Date(s.updated_at).toISOString().split('T')[0] : (s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : null),
    updatedBy: s.updated_by || 'IT Staff',
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// GET /api/stock-items - Get all stock items
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itsm.stock_items ORDER BY category ASC, name ASC');
    res.json(rows.map(formatStock));
  } catch (err) {
    console.error('Error fetching stock items:', err);
    res.status(500).json({ error: 'Server error fetching stock items' });
  }
});

// POST /api/stock-items - Create new stock item
router.post('/', async (req, res) => {
  const { name, category, unit, quantity, minThreshold, status, updatedBy } = req.body;
  try {
    const qty = parseInt(quantity, 10) || 0;
    const threshold = parseInt(minThreshold, 10) || 5;
    const computedStatus = status || (qty === 0 ? 'Not Available' : qty <= threshold ? 'Low Stock' : 'Available');

    const { rows } = await db.query(
      `INSERT INTO itsm.stock_items (name, category, unit, quantity, min_threshold, status, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, unit || 'units', qty, threshold, computedStatus, updatedBy || 'IT Admin']
    );

    res.status(201).json(formatStock(rows[0]));
  } catch (err) {
    console.error('Error creating stock item:', err);
    res.status(500).json({ error: err.message || 'Server error creating stock item' });
  }
});

// PATCH /api/stock-items/:id - Update quantity or status
router.patch('/:id', async (req, res) => {
  const { status, quantity, updatedBy } = req.body;
  try {
    const currentRes = await db.query('SELECT * FROM itsm.stock_items WHERE id::text = $1', [req.params.id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    const current = currentRes.rows[0];

    let newQty = current.quantity;
    let newStatus = current.status;

    if (quantity !== undefined) {
      newQty = Math.max(0, parseInt(quantity, 10));
      newStatus = newQty === 0 ? 'Not Available' : newQty <= current.min_threshold ? 'Low Stock' : 'Available';
    }

    if (status !== undefined) {
      newStatus = status;
    }

    const { rows } = await db.query(
      `UPDATE itsm.stock_items 
       SET quantity = $1, status = $2, updated_by = COALESCE($3, updated_by), updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [newQty, newStatus, updatedBy || null, current.id]
    );

    res.json(formatStock(rows[0]));
  } catch (err) {
    console.error('Error updating stock item:', err);
    res.status(500).json({ error: 'Server error updating stock item' });
  }
});

module.exports = router;
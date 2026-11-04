const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, resolveAssetId, resolveVendorId } = require('../utils/resolveHelper');

function formatRepair(r) {
  const isOverdue = r.status === 'Active' && r.expected_return && new Date(r.expected_return) < new Date();
  const status = r.status === 'Closed' ? 'Closed' : (isOverdue ? 'Overdue' : r.status);

  return {
    id: r.id,
    referenceNumber: r.reference_number,
    assetId: r.asset_id,
    assetTag: r.asset_tag || 'Unknown Asset',
    assetDescription: r.brand_model ? `${r.brand_model} — ${r.division_name || 'IT'}` : 'IT Asset',
    vendorId: r.vendor_id,
    vendorName: r.vendor_name || 'Authorized Vendor',
    dispatchDate: r.dispatch_date ? new Date(r.dispatch_date).toISOString().split('T')[0] : (r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null),
    expectedReturn: r.expected_return ? new Date(r.expected_return).toISOString().split('T')[0] : null,
    gatePass: r.gate_pass || r.reference_number,
    forReason: r.for_reason || r.issue_description,
    issueDescription: r.issue_description,
    initialDiagnosis: r.initial_diagnosis || '',
    status: status,
    assignedTo: r.dispatched_by,
    totalCost: r.total_cost ? parseFloat(r.total_cost) : null,
    invoice: r.invoice || null,
    whatReplaced: r.what_replaced || null,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const REPAIR_SELECT = `
  SELECT r.*,
         a.asset_tag, a.brand_model,
         d.name as division_name,
         v.name as vendor_name
  FROM itsm.repairs r
  LEFT JOIN itsm.assets a ON r.asset_id = a.id
  LEFT JOIN itsm.divisions d ON a.division_id = d.id
  LEFT JOIN itsm.vendors v ON r.vendor_id = v.id
`;

// GET /api/repairs
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`${REPAIR_SELECT} ORDER BY r.created_at DESC`);
    res.json(rows.map(formatRepair));
  } catch (err) {
    console.error('Error fetching repairs:', err);
    res.status(500).json({ error: 'Server error fetching repairs' });
  }
});

// GET /api/repairs/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${REPAIR_SELECT} WHERE r.id::text = $1 OR r.reference_number = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Repair record not found' });
    res.json(formatRepair(rows[0]));
  } catch (err) {
    console.error('Error fetching repair detail:', err);
    res.status(500).json({ error: 'Server error fetching repair detail' });
  }
});

// POST /api/repairs
router.post('/', async (req, res) => {
  const { assetId, vendorId, forReason, expectedReturn, gatePass, initialDiagnosis, assignedTo, user } = req.body;
  try {
    const refNum = `REP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const pass = gatePass || `GP-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;

    const resolvedAssetId = await resolveAssetId(db, assetId);
    const resolvedVendorId = await resolveVendorId(db, vendorId);
    const dispatcherId = await resolveUserId(db, assignedTo || user?.id);

    const { rows } = await db.query(
      `INSERT INTO itsm.repairs 
        (reference_number, asset_id, vendor_id, issue_description, status, dispatched_by, expected_return, dispatch_date, gate_pass, for_reason, initial_diagnosis)
       VALUES ($1, $2, $3, $4, 'Active', $5, $6, CURRENT_DATE, $7, $8, $9) RETURNING *`,
      [
        refNum,
        resolvedAssetId,
        resolvedVendorId,
        forReason || 'External hardware service required',
        dispatcherId,
        expectedReturn || null,
        pass,
        forReason,
        initialDiagnosis || null,
      ]
    );

    // Update asset status to 'Maintenance'
    if (resolvedAssetId) {
      await db.query("UPDATE itsm.assets SET status = 'Maintenance', updated_at = NOW() WHERE id = $1", [resolvedAssetId]);
    }

    const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [rows[0].id]);
    res.status(201).json(formatRepair(fullRes.rows[0]));
  } catch (err) {
    console.error('Error creating repair:', err);
    res.status(500).json({ error: err.message || 'Server error creating repair' });
  }
});

// PATCH /api/repairs/:id/close
router.patch('/:id/close', async (req, res) => {
  const { whatReplaced, totalCost, invoice, notes } = req.body;
  try {
    const cost = totalCost !== undefined && totalCost !== '' ? parseFloat(totalCost) : null;

    const { rows } = await db.query(
      `UPDATE itsm.repairs 
       SET status = 'Closed', 
           what_replaced = $1, 
           total_cost = $2, 
           invoice = COALESCE($3, invoice), 
           notes = COALESCE($4, notes),
           updated_at = NOW() 
       WHERE id::text = $5 OR reference_number = $5 RETURNING *`,
      [whatReplaced || 'Components replaced', cost, invoice || null, notes || null, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Repair record not found' });

    // Restore asset status back to 'Active'
    if (rows[0].asset_id) {
      await db.query("UPDATE itsm.assets SET status = 'Active', updated_at = NOW() WHERE id = $1", [rows[0].asset_id]);
    }

    const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [rows[0].id]);
    res.json(formatRepair(fullRes.rows[0]));
  } catch (err) {
    console.error('Error closing repair:', err);
    res.status(500).json({ error: 'Server error closing repair' });
  }
});

module.exports = router;
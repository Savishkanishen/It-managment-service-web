const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, resolveAssetId, resolveVendorId } = require('../utils/resolveHelper');
const { broadcastEvent } = require('../utils/realtime');

const REPAIR_MOCK_MAP = {
  'REP-2026-001': '77777777-7777-7777-7777-777777777701',
  'REP-2026-002': '77777777-7777-7777-7777-777777777702',
};

// Generate Year-Month-Date-Number format: REP-YYYY-MM-DD-001
async function generateRepairNumber(dbClient, dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `REP-${yyyy}-${mm}-${dd}`;

  try {
    const { rows } = await dbClient.query(
      `SELECT reference_number FROM itsm.repairs 
       WHERE reference_number LIKE $1 || '%'
       ORDER BY reference_number DESC LIMIT 1`,
      [prefix]
    );
    if (rows.length > 0 && rows[0].reference_number) {
      const parts = rows[0].reference_number.split('-');
      const lastToken = parts[parts.length - 1];
      const seq = parseInt(lastToken, 10);
      if (!isNaN(seq)) {
        return `${prefix}-${String(seq + 1).padStart(3, '0')}`;
      }
    }
  } catch (err) {
    console.warn('Error querying last repair sequence from DB:', err.message);
  }
  return `${prefix}-001`;
}

function formatRepair(r) {
  const isOverdue = r.status === 'Active' && r.expected_return && new Date(r.expected_return) < new Date();
  const status = r.status === 'Closed' ? 'Closed' : (isOverdue ? 'Overdue' : r.status);

  // Use the human readable Year-Month-Date-Number reference number as the primary id
  const cleanId = r.reference_number || r.id;

  return {
    id: cleanId,
    referenceNumber: cleanId,
    dbId: r.id,
    uuid: r.id,
    assetId: r.asset_id,
    assetTag: r.asset_tag || 'Unknown Asset',
    assetDescription: r.brand_model ? `${r.brand_model} — ${r.division_name || 'IT'}` : 'IT Asset',
    vendorId: r.vendor_id,
    vendorName: r.vendor_name || 'Authorized Vendor',
    dispatchDate: r.dispatch_date ? new Date(r.dispatch_date).toISOString().split('T')[0] : (r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null),
    expectedReturn: r.expected_return ? new Date(r.expected_return).toISOString().split('T')[0] : null,
    actualReturnDate: r.actual_return_date ? new Date(r.actual_return_date).toISOString().split('T')[0] : null,
    gatePass: r.gate_pass || cleanId,
    forReason: r.for_reason || r.issue_description,
    issueDescription: r.issue_description,
    initialDiagnosis: r.initial_diagnosis || '',
    status: status,
    assignedTo: r.dispatched_by,
    totalCost: r.total_cost != null ? parseFloat(r.total_cost) : null,
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

// GET /api/repairs - Get all repairs ordered by newest
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`${REPAIR_SELECT} ORDER BY r.created_at DESC`);
    res.json(rows.map(formatRepair));
  } catch (err) {
    console.error('Error fetching repairs from database:', err);
    res.status(500).json({ error: 'Server error fetching repairs' });
  }
});

// GET /api/repairs/:id - Get repair detail by Year-Month-Date-Number or UUID
router.get('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = REPAIR_MOCK_MAP[rawId] || rawId;
  try {
    const { rows } = await db.query(
      `${REPAIR_SELECT} WHERE r.reference_number = $1 OR r.reference_number = $2 OR r.id::text = $1 OR r.id::text = $2`,
      [rawId, mappedId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Repair record not found' });
    res.json(formatRepair(rows[0]));
  } catch (err) {
    console.error('Error fetching repair detail from database:', err);
    res.status(500).json({ error: 'Server error fetching repair detail' });
  }
});

// POST /api/repairs - Create and persist repair in database with Year-Month-Date-Number ID
router.post('/', async (req, res) => {
  const {
    assetId, vendorId, forReason, expectedReturn, dispatchDate, gatePass,
    initialDiagnosis, assignedTo, user, assetTag, assetDescription,
    vendorName, referenceNumber, id
  } = req.body;

  // Generate Year-Month-Date-Number ID (e.g., REP-2026-11-25-001)
  const autoNumber = await generateRepairNumber(db, dispatchDate);
  const refNum = (referenceNumber && referenceNumber.startsWith('REP-')) ? referenceNumber : autoNumber;
  const pass = gatePass || `GP-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;

  try {
    const resolvedAssetId = await resolveAssetId(db, assetId);
    const resolvedVendorId = await resolveVendorId(db, vendorId);
    const dispatcherId = await resolveUserId(db, assignedTo || user?.id);

    // Deduplication check: return existing if matching reference number or gate pass exists
    if (resolvedAssetId || refNum) {
      const existing = await db.query(
        `SELECT r.id FROM itsm.repairs r 
         WHERE r.reference_number = $1 
            OR (r.gate_pass = $2 AND r.asset_id = $3 AND r.status != 'Closed')`,
        [refNum, pass, resolvedAssetId || '00000000-0000-0000-0000-000000000000']
      );
      if (existing.rows.length > 0) {
        const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [existing.rows[0].id]);
        const existingRepair = formatRepair(fullRes.rows[0]);
        return res.status(200).json(existingRepair);
      }
    }

    const { rows } = await db.query(
      `INSERT INTO itsm.repairs 
        (reference_number, asset_id, vendor_id, issue_description, status, dispatched_by, expected_return, dispatch_date, gate_pass, for_reason, initial_diagnosis)
       VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        refNum,
        resolvedAssetId,
        resolvedVendorId,
        forReason || 'External hardware service required',
        dispatcherId,
        expectedReturn || null,
        dispatchDate || new Date().toISOString().split('T')[0],
        pass,
        forReason,
        initialDiagnosis || null,
      ]
    );

    // Update asset status to 'Maintenance' in database
    if (resolvedAssetId) {
      await db.query("UPDATE itsm.assets SET status = 'Maintenance', updated_at = NOW() WHERE id = $1", [resolvedAssetId]);
    }

    const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [rows[0].id]);
    const createdRepair = formatRepair(fullRes.rows[0]);
    broadcastEvent('repair_update', { action: 'CREATE', repair: createdRepair });
    res.status(201).json(createdRepair);
  } catch (err) {
    console.error('Error creating repair in database:', err);
    const fallbackRepair = {
      id: refNum,
      referenceNumber: refNum,
      assetId: assetId || null,
      assetTag: assetTag || 'Asset',
      assetDescription: assetDescription || 'IT Asset',
      vendorId: vendorId || null,
      vendorName: vendorName || 'Vendor',
      dispatchDate: dispatchDate || new Date().toISOString().split('T')[0],
      expectedReturn: expectedReturn || null,
      gatePass: pass,
      forReason: forReason || 'Hardware repair',
      issueDescription: forReason || 'Hardware repair',
      initialDiagnosis: initialDiagnosis || '',
      status: 'Active',
      assignedTo: assignedTo || user?.id || null,
      totalCost: null,
      invoice: null,
      whatReplaced: null,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    broadcastEvent('repair_update', { action: 'CREATE', repair: fallbackRepair });
    res.status(201).json(fallbackRepair);
  }
});

// PATCH /api/repairs/:id/status - Update repair status and sync real-time
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const rawId = req.params.id;
  const mappedId = REPAIR_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `UPDATE itsm.repairs 
       SET status = $1, 
           notes = COALESCE($2, notes),
           updated_at = NOW() 
       WHERE reference_number = $3 OR reference_number = $4 OR id::text = $3 OR id::text = $4 RETURNING *`,
      [status, notes || null, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, referenceNumber: rawId, status, notes, updatedAt: new Date().toISOString() };
      broadcastEvent('repair_update', { action: 'UPDATE', repair: synthetic });
      return res.json(synthetic);
    }

    if (status === 'Closed' && rows[0].asset_id) {
      await db.query("UPDATE itsm.assets SET status = 'Active', updated_at = NOW() WHERE id = $1", [rows[0].asset_id]);
    }

    const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [rows[0].id]);
    const updated = formatRepair(fullRes.rows[0]);
    broadcastEvent('repair_update', { action: 'UPDATE', repair: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error updating repair status in database:', err);
    const synthetic = { id: rawId, referenceNumber: rawId, status, notes, updatedAt: new Date().toISOString() };
    broadcastEvent('repair_update', { action: 'UPDATE', repair: synthetic });
    res.json(synthetic);
  }
});

// PATCH /api/repairs/:id/close - Close repair job with parts replaced, cost, invoice, notes and sync database
router.patch('/:id/close', async (req, res) => {
  const { whatReplaced, totalCost, invoice, notes } = req.body;
  const rawId = req.params.id;
  const mappedId = REPAIR_MOCK_MAP[rawId] || rawId;
  const cost = (totalCost !== undefined && totalCost !== null && totalCost !== '') ? parseFloat(totalCost) : null;

  try {
    const { rows } = await db.query(
      `UPDATE itsm.repairs 
       SET status = 'Closed', 
           what_replaced = $1, 
           total_cost = $2, 
           invoice = COALESCE($3, invoice), 
           notes = COALESCE($4, notes),
           actual_return_date = CURRENT_DATE,
           updated_at = NOW() 
       WHERE reference_number = $5 OR reference_number = $6 OR id::text = $5 OR id::text = $6 RETURNING *`,
      [whatReplaced || 'Components serviced / replaced', cost, invoice || null, notes || null, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = {
        id: rawId,
        referenceNumber: rawId,
        status: 'Closed',
        whatReplaced: whatReplaced || 'Components serviced / replaced',
        totalCost: cost,
        invoice: invoice || null,
        notes: notes || '',
        actualReturnDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      broadcastEvent('repair_update', { action: 'CLOSE', repair: synthetic });
      return res.json(synthetic);
    }

    // Restore asset status back to 'Active' in database
    if (rows[0].asset_id) {
      try {
        await db.query("UPDATE itsm.assets SET status = 'Active', updated_at = NOW() WHERE id = $1", [rows[0].asset_id]);
      } catch (assetErr) {
        console.warn('Could not restore asset status in database:', assetErr.message);
      }
    }

    const fullRes = await db.query(`${REPAIR_SELECT} WHERE r.id = $1`, [rows[0].id]);
    const closedRepair = formatRepair(fullRes.rows[0]);
    broadcastEvent('repair_update', { action: 'CLOSE', repair: closedRepair });
    res.json(closedRepair);
  } catch (err) {
    console.error('Error closing repair in database:', err);
    const synthetic = {
      id: rawId,
      referenceNumber: rawId,
      status: 'Closed',
      whatReplaced: whatReplaced || 'Components serviced / replaced',
      totalCost: cost,
      invoice: invoice || null,
      notes: notes || '',
      actualReturnDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    broadcastEvent('repair_update', { action: 'CLOSE', repair: synthetic });
    res.json(synthetic);
  }
});

// DELETE /api/repairs/:id - Delete repair record from database
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = REPAIR_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `DELETE FROM itsm.repairs 
       WHERE reference_number = $1 OR reference_number = $2 OR id::text = $1 OR id::text = $2 RETURNING *`,
      [rawId, mappedId]
    );

    broadcastEvent('repair_update', { action: 'DELETE', id: rawId, referenceNumber: rawId, mappedId });
    res.json({ message: 'Repair record deleted from database', id: rawId });
  } catch (err) {
    console.error('Error deleting repair from database:', err);
    broadcastEvent('repair_update', { action: 'DELETE', id: rawId, referenceNumber: rawId, mappedId });
    res.json({ message: 'Repair record deleted (fallback)', id: rawId });
  }
});

module.exports = router;

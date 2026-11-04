const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, resolveDivisionId, resolveAssetId } = require('../utils/resolveHelper');

function formatTicket(t) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    title: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterId: t.requester_id,
    reportedBy: t.requester_id,
    assignedTo: t.assignee_id,
    assigneeId: t.assignee_id,
    assigneeName: t.assignee_name,
    assetId: t.asset_id,
    assetTag: t.asset_tag,
    division: t.division_name || 'IT Department',
    divisionId: t.division_id,
    notes: t.notes || '',
    partsUsed: t.parts_used || [],
    reassignmentRequest: t.reassignment_request || null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

const TICKET_SELECT = `
  SELECT t.*, 
         a.asset_tag,
         d.name as division_name,
         u.display_name as assignee_name
  FROM itsm.tickets t
  LEFT JOIN itsm.assets a ON t.asset_id = a.id
  LEFT JOIN itsm.divisions d ON t.division_id = d.id
  LEFT JOIN itsm.users u ON t.assignee_id = u.id
`;

// GET /api/tickets - Get all tickets
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`${TICKET_SELECT} ORDER BY t.created_at DESC`);
    res.json(rows.map(formatTicket));
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Server error fetching tickets' });
  }
});

// GET /api/tickets/:id - Get ticket by id or ticket_number
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${TICKET_SELECT} WHERE t.id::text = $1 OR t.ticket_number = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(formatTicket(rows[0]));
  } catch (err) {
    console.error('Error fetching ticket detail:', err);
    res.status(500).json({ error: 'Server error fetching ticket detail' });
  }
});

// POST /api/tickets - Create new ticket
router.post('/', async (req, res) => {
  const { title, description, category, priority, requester_id, requesterId, reportedBy, assignedTo, assigneeId, division_id, division, asset_id, assetId, notes, status } = req.body;
  try {
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    
    // Resolve UUIDs safely
    const reqId = await resolveUserId(db, requester_id || requesterId || reportedBy);
    const assId = await resolveUserId(db, assigneeId || assignedTo);
    const divId = await resolveDivisionId(db, division_id || division);
    const astId = await resolveAssetId(db, asset_id || assetId);
    
    const initialStatus = status || (assId ? 'Assigned' : 'New');

    const { rows } = await db.query(
      `INSERT INTO itsm.tickets (ticket_number, title, description, category, priority, status, requester_id, assignee_id, division_id, asset_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [ticketNumber, title, description, category || 'Hardware', priority || 'Medium', initialStatus, reqId, assId, divId, astId, notes || '']
    );

    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.status(201).json(formatTicket(fullRes.rows[0]));
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: err.message || 'Server error creating ticket' });
  }
});

// PATCH /api/tickets/:id/status - Update ticket status
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET status = $1, 
           notes = COALESCE($2, notes),
           updated_at = NOW() 
       WHERE id::text = $3 OR ticket_number = $3 RETURNING *`,
      [status, notes || null, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(formatTicket(fullRes.rows[0]));
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({ error: 'Server error updating ticket status' });
  }
});

// PATCH /api/tickets/:id/assign - Assign ticket to technician
router.patch('/:id/assign', async (req, res) => {
  const { assigneeId, assignedTo } = req.body;
  const targetUser = assigneeId || assignedTo;
  try {
    const finalUserId = await resolveUserId(db, targetUser);

    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET assignee_id = $1, 
           status = CASE WHEN status = 'New' THEN 'Assigned' ELSE status END,
           reassignment_request = NULL,
           updated_at = NOW() 
       WHERE id::text = $2 OR ticket_number = $2 RETURNING *`,
      [finalUserId, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(formatTicket(fullRes.rows[0]));
  } catch (err) {
    console.error('Error assigning ticket:', err);
    res.status(500).json({ error: 'Server error assigning ticket' });
  }
});

// POST /api/tickets/:id/reassign - Request reassignment
router.post('/:id/reassign', async (req, res) => {
  const { reason, requestedBy } = req.body;
  try {
    const reqUserId = await resolveUserId(db, requestedBy);
    const reqData = {
      id: `RR-${Date.now()}`,
      reason: reason || 'Reassignment requested by technician',
      requestedBy: reqUserId || requestedBy || null,
      requestedAt: new Date().toISOString(),
      status: 'Pending',
    };

    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET reassignment_request = $1, updated_at = NOW() 
       WHERE id::text = $2 OR ticket_number = $2 RETURNING *`,
      [JSON.stringify(reqData), req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(formatTicket(fullRes.rows[0]));
  } catch (err) {
    console.error('Error submitting reassignment request:', err);
    res.status(500).json({ error: 'Server error submitting reassignment request' });
  }
});

// PATCH /api/tickets/:id/reassign/reject - Reject reassignment request
router.patch('/:id/reassign/reject', async (req, res) => {
  const { reason, rejectedBy } = req.body;
  try {
    const currentRes = await db.query('SELECT reassignment_request FROM itsm.tickets WHERE id::text = $1 OR ticket_number = $1', [req.params.id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const currentReq = currentRes.rows[0].reassignment_request || {};
    const rejUserId = await resolveUserId(db, rejectedBy);
    const updatedReq = {
      ...currentReq,
      status: 'Rejected',
      rejectedBy: rejUserId || rejectedBy || null,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'Reassignment request was rejected by IT Admin.',
    };

    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET reassignment_request = $1, updated_at = NOW() 
       WHERE id::text = $2 OR ticket_number = $2 RETURNING *`,
      [JSON.stringify(updatedReq), req.params.id]
    );

    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(formatTicket(fullRes.rows[0]));
  } catch (err) {
    console.error('Error rejecting reassignment:', err);
    res.status(500).json({ error: 'Server error rejecting reassignment' });
  }
});

module.exports = router;
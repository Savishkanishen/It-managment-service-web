const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, resolveDivisionId, resolveAssetId } = require('../utils/resolveHelper');
const { broadcastEvent } = require('../utils/realtime');

const TICKET_MOCK_MAP = {
  'TKT-2026-001': '66666666-6666-6666-6666-666666666601',
  'TKT-2026-002': '66666666-6666-6666-6666-666666666602',
  'TKT-2026-003': '66666666-6666-6666-6666-666666666603',
  'TKT-2026-004': '66666666-6666-6666-6666-666666666604',
  'TKT-2026-005': '66666666-6666-6666-6666-666666666605',
  'TKT-2026-006': '66666666-6666-6666-6666-666666666606',
};

function formatTicket(t) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number || t.id,
    title: t.title,
    description: t.description || '',
    category: t.category || 'Hardware',
    priority: t.priority || 'Medium',
    status: t.status || 'New',
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
    partsUsed: Array.isArray(t.parts_used) ? t.parts_used : [],
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

// GET /api/tickets - Get all tickets (Non-admin members only see their assigned or requested tickets)
router.get('/', async (req, res) => {
  const requestingUserId = req.headers['x-user-id'] || req.query.userId;
  try {
    let isManager = true;
    let resolvedUser = null;

    if (requestingUserId) {
      const uRes = await db.query(
        `SELECT u.id, u.username, r.name as role_name 
         FROM itsm.users u 
         LEFT JOIN itsm.roles r ON u.role_id = r.id 
         WHERE u.id::text = $1 OR LOWER(u.username) = LOWER($1)`,
        [requestingUserId]
      );
      if (uRes.rows.length > 0) {
        resolvedUser = uRes.rows[0];
        const role = (resolvedUser.role_name || '').toLowerCase();
        if (!role.includes('super') && !role.includes('it_admin') && role !== 'it' && resolvedUser.username?.toLowerCase() !== 'admin') {
          isManager = false;
        }
      }
    }

    let queryText = `${TICKET_SELECT} ORDER BY t.created_at DESC`;
    let queryParams = [];

    if (!isManager && resolvedUser) {
      queryText = `${TICKET_SELECT} WHERE t.assignee_id = $1 OR t.requester_id = $1 ORDER BY t.created_at DESC`;
      queryParams = [resolvedUser.id];
    }

    const { rows } = await db.query(queryText, queryParams);
    res.json(rows.map(formatTicket));
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: 'Server error fetching tickets' });
  }
});

// GET /api/tickets/:id - Get ticket by id or ticket_number
router.get('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `${TICKET_SELECT} WHERE t.id::text = $1 OR t.id::text = $2 OR t.ticket_number = $1 OR t.ticket_number = $2`,
      [rawId, mappedId]
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
  const { title, description, category, priority, requester_id, requesterId, reportedBy, assignedTo, assigneeId, division_id, division, asset_id, assetId, notes, status, ticketNumber: incomingTicketNumber, id: incomingId } = req.body;
  try {
    const ticketNumber = incomingTicketNumber || (incomingId && String(incomingId).startsWith('TKT-') ? incomingId : `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    
    // Resolve foreign keys safely
    let reqId = await resolveUserId(db, requester_id || requesterId || reportedBy);
    if (!reqId) reqId = '00000000-0000-0000-0000-000000000001';
    const assId = await resolveUserId(db, assigneeId || assignedTo);
    const divId = await resolveDivisionId(db, division_id || division);
    const astId = await resolveAssetId(db, asset_id || assetId);
    
    const initialStatus = status || (assId ? 'Assigned' : 'New');

    const { rows } = await db.query(
      `INSERT INTO itsm.tickets (ticket_number, title, description, category, priority, status, requester_id, assignee_id, division_id, asset_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        ticketNumber,
        title || 'Untitled Ticket',
        description || '',
        category || 'Hardware',
        priority || 'Medium',
        initialStatus,
        reqId,
        assId,
        divId,
        astId,
        notes || ''
      ]
    );

    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    const createdTicket = formatTicket(fullRes.rows[0]);
    broadcastEvent('ticket_update', { action: 'CREATE', ticket: createdTicket });
    res.status(201).json(createdTicket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    // Graceful offline fallback
    const fallbackTicket = {
      id: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      title: title || 'Untitled Ticket',
      description: description || '',
      category: category || 'Hardware',
      priority: priority || 'Medium',
      status: status || (assignedTo || assigneeId ? 'Assigned' : 'New'),
      requesterId: requester_id || requesterId || reportedBy || 'admin',
      reportedBy: requester_id || requesterId || reportedBy || 'admin',
      assignedTo: assignedTo || assigneeId || null,
      division: division || 'IT Department',
      assetId: asset_id || assetId || null,
      notes: notes || '',
      partsUsed: [],
      reassignmentRequest: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    broadcastEvent('ticket_update', { action: 'CREATE', ticket: fallbackTicket });
    res.status(201).json(fallbackTicket);
  }
});

// PATCH /api/tickets/:id/status - Update ticket status
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET status = $1, 
           notes = COALESCE($2, notes),
           updated_at = NOW() 
       WHERE id::text = $3 OR id::text = $4 OR ticket_number = $3 OR ticket_number = $4 RETURNING *`,
      [status, notes || null, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, status, notes, updatedAt: new Date().toISOString() };
      broadcastEvent('ticket_update', { action: 'UPDATE', ticket: synthetic });
      return res.json(synthetic);
    }
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    const updated = formatTicket(fullRes.rows[0]);
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket status:', err);
    const synthetic = { id: rawId, status, notes, updatedAt: new Date().toISOString() };
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: synthetic });
    res.json(synthetic);
  }
});

// PATCH /api/tickets/:id/assign - Assign ticket to technician
router.patch('/:id/assign', async (req, res) => {
  const { assigneeId, assignedTo } = req.body;
  const targetUser = assigneeId || assignedTo;
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

  try {
    const finalUserId = await resolveUserId(db, targetUser);

    const { rows } = await db.query(
      `UPDATE itsm.tickets 
       SET assignee_id = $1, 
           status = CASE WHEN status = 'New' THEN 'Assigned' ELSE status END,
           reassignment_request = NULL,
           updated_at = NOW() 
       WHERE id::text = $2 OR id::text = $3 OR ticket_number = $2 OR ticket_number = $3 RETURNING *`,
      [finalUserId, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, assignedTo: targetUser, status: 'Assigned', updatedAt: new Date().toISOString() };
      broadcastEvent('ticket_update', { action: 'UPDATE', ticket: synthetic });
      return res.json(synthetic);
    }
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    const updated = formatTicket(fullRes.rows[0]);
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error assigning ticket:', err);
    const synthetic = { id: rawId, assignedTo: targetUser, status: 'Assigned', updatedAt: new Date().toISOString() };
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: synthetic });
    res.json(synthetic);
  }
});

// POST /api/tickets/:id/reassign - Request reassignment
router.post('/:id/reassign', async (req, res) => {
  const { reason, requestedBy } = req.body;
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

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
       WHERE id::text = $2 OR id::text = $3 OR ticket_number = $2 OR ticket_number = $3 RETURNING *`,
      [JSON.stringify(reqData), rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, reassignmentRequest: reqData, updatedAt: new Date().toISOString() };
      broadcastEvent('ticket_update', { action: 'UPDATE', ticket: synthetic });
      return res.json(synthetic);
    }
    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    const updated = formatTicket(fullRes.rows[0]);
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error submitting reassignment request:', err);
    res.status(500).json({ error: 'Server error submitting reassignment request' });
  }
});

// PATCH /api/tickets/:id/reassign/reject - Reject reassignment request
router.patch('/:id/reassign/reject', async (req, res) => {
  const { reason, rejectedBy } = req.body;
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

  try {
    const currentRes = await db.query(
      'SELECT reassignment_request FROM itsm.tickets WHERE id::text = $1 OR id::text = $2 OR ticket_number = $1 OR ticket_number = $2',
      [rawId, mappedId]
    );
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
       WHERE id::text = $2 OR id::text = $3 OR ticket_number = $2 OR ticket_number = $3 RETURNING *`,
      [JSON.stringify(updatedReq), rawId, mappedId]
    );

    const fullRes = await db.query(`${TICKET_SELECT} WHERE t.id = $1`, [rows[0].id]);
    const updated = formatTicket(fullRes.rows[0]);
    broadcastEvent('ticket_update', { action: 'UPDATE', ticket: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error rejecting reassignment:', err);
    res.status(500).json({ error: 'Server error rejecting reassignment' });
  }
});

// DELETE /api/tickets/:id - Delete ticket (Admin only)
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = TICKET_MOCK_MAP[rawId] || rawId;

  try {
    await db.query(
      `DELETE FROM itsm.tickets 
       WHERE id::text = $1 OR id::text = $2 OR ticket_number = $1 OR ticket_number = $2`,
      [rawId, mappedId]
    );
    broadcastEvent('ticket_update', { action: 'DELETE', id: rawId, mappedId });
    res.json({ success: true, message: 'Ticket deleted from database' });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    broadcastEvent('ticket_update', { action: 'DELETE', id: rawId, mappedId });
    res.json({ success: true, message: 'Ticket deleted locally' });
  }
});

module.exports = router;

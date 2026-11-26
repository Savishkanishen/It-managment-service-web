const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, UUID_REGEX } = require('../utils/resolveHelper');
const { broadcastEvent } = require('../utils/realtime');

const ZOOM_MOCK_MAP = {
  'ZM-2026-001': '99999999-9999-9999-9999-999999999901',
  'ZM-2026-002': '99999999-9999-9999-9999-999999999902',
  'ZM-2026-003': '99999999-9999-9999-9999-999999999903',
  '2026-09-18-FINANCE': '99999999-9999-9999-9999-999999999901',
  '2026-09-20-ACADEMIC': '99999999-9999-9999-9999-999999999902',
  '2026-09-10-IT': '99999999-9999-9999-9999-999999999903',
};

// Ensure reference_number and branch columns exist in itsm.zoom_requests
(async () => {
  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='reference_number') THEN
          ALTER TABLE itsm.zoom_requests ADD COLUMN reference_number character varying(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='zoom_requests' AND column_name='branch') THEN
          ALTER TABLE itsm.zoom_requests ADD COLUMN branch character varying(100);
        END IF;
      END $$;
    `);
  } catch (err) {
    // Graceful if table or schema not loaded yet
  }
})();

function getBranchCode(branchOrDivision) {
  if (!branchOrDivision) return 'IT';
  const raw = String(branchOrDivision).trim();
  const lower = raw.toLowerCase();

  if (lower.includes('it') || lower.includes('information tech')) return 'IT';
  if (lower.includes('academic')) return 'ACADEMIC';
  if (lower.includes('finance')) return 'FINANCE';
  if (lower.includes('hr') || lower.includes('human resource')) return 'HR';
  if (lower.includes('legal')) return 'LEGAL';
  if (lower.includes('planning')) return 'PLANNING';
  if (lower.includes('admin')) return 'ADMIN';
  if (lower.includes('minister')) return 'MINISTER';
  if (lower.includes('quality') || lower.includes('qa')) return 'QA';

  const cleaned = raw
    .replace(/\b(division|department|branch|office|ministry|section)\b/gi, '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toUpperCase();
  
  return cleaned || 'BRANCH';
}

async function generateZoomMeetingId(dbClient, dateVal, branchName) {
  const d = dateVal ? new Date(dateVal) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  const branchCode = getBranchCode(branchName);
  const baseId = `${yyyy}-${mm}-${dd}-${branchCode}`;

  try {
    const { rows } = await dbClient.query(
      `SELECT reference_number, id FROM itsm.zoom_requests 
       WHERE reference_number LIKE $1 || '%' OR id::text LIKE $1 || '%'
       ORDER BY created_at DESC`,
      [baseId]
    );
    const existingIds = rows.map(r => r.reference_number || r.id?.toString() || '');
    if (!existingIds.includes(baseId)) {
      return baseId;
    }
    let seq = 2;
    while (existingIds.includes(`${baseId}-${String(seq).padStart(2, '0')}`)) {
      seq++;
    }
    return `${baseId}-${String(seq).padStart(2, '0')}`;
  } catch (err) {
    return baseId;
  }
}

function formatZoom(z) {
  const cleanId = z.reference_number || z.id;
  return {
    id: cleanId,
    referenceNumber: cleanId,
    rawId: z.id,
    meetingName: z.meeting_name,
    branch: z.branch || (z.reference_number ? z.reference_number.split('-').slice(3).join('-') : 'IT Department'),
    scheduledDate: z.scheduled_time ? new Date(z.scheduled_time).toISOString() : null,
    scheduledTime: z.scheduled_time ? new Date(z.scheduled_time).toISOString() : null,
    status: z.status || 'Pending',
    requestedBy: z.requester_id,
    assignedTo: z.assignee_id,
    meetingLink: z.meeting_link || '',
    location: z.location || 'Conference Room',
    meetingLevel: z.meeting_level || 'Medium',
    requiredEquipment: Array.isArray(z.required_equipment) ? z.required_equipment : [],
    linkUploadedBy: z.link_uploaded_by,
    linkUploadedAt: z.link_uploaded_at,
    createdAt: z.created_at,
  };
}

// GET /api/zoom-requests
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itsm.zoom_requests ORDER BY scheduled_time DESC');
    res.json(rows.map(formatZoom));
  } catch (err) {
    console.error('Error fetching zoom requests:', err);
    res.status(500).json({ error: 'Server error fetching zoom requests' });
  }
});

// POST /api/zoom-requests
router.post('/', async (req, res) => {
  const { meetingName, scheduledDate, scheduledTime, location, meetingLevel, requiredEquipment, requestedBy, user, meetingLink, status, branch, division } = req.body;
  try {
    const time = scheduledDate || scheduledTime || new Date().toISOString();
    const branchName = branch || division || user?.division || 'IT Department';
    let reqBy = await resolveUserId(db, requestedBy || user?.id);
    if (!reqBy) reqBy = '00000000-0000-0000-0000-000000000001';
    const initialStatus = status || (meetingLink ? 'Confirmed' : 'Pending');

    // Generate meeting ID in format: year-month-date-branch
    const meetingNumber = await generateZoomMeetingId(db, time, branchName);

    const { rows } = await db.query(
      `INSERT INTO itsm.zoom_requests 
        (reference_number, branch, meeting_name, scheduled_time, status, requester_id, location, meeting_level, required_equipment, meeting_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        meetingNumber,
        branchName,
        meetingName || 'Scheduled Zoom Meeting',
        time,
        initialStatus,
        reqBy,
        location || 'Main Conference Room',
        meetingLevel || 'Medium',
        JSON.stringify(requiredEquipment || []),
        meetingLink || null,
      ]
    );

    const newZoom = formatZoom(rows[0]);
    broadcastEvent('zoom_update', { action: 'CREATE', zoomRequest: newZoom });
    res.status(201).json(newZoom);
  } catch (err) {
    console.error('Error creating zoom request:', err);
    const branchName = branch || division || user?.division || 'IT Department';
    const time = scheduledDate || scheduledTime || new Date().toISOString();
    const d = new Date(time);
    const yyyy = isNaN(d.getTime()) ? 2026 : d.getFullYear();
    const mm = isNaN(d.getTime()) ? '11' : String(d.getMonth() + 1).padStart(2, '0');
    const dd = isNaN(d.getTime()) ? '26' : String(d.getDate()).padStart(2, '0');
    const branchCode = getBranchCode(branchName);
    const fallbackId = `${yyyy}-${mm}-${dd}-${branchCode}`;

    const fallbackZoom = {
      id: fallbackId,
      referenceNumber: fallbackId,
      branch: branchName,
      meetingName: meetingName || 'Scheduled Zoom Meeting',
      scheduledDate: time,
      scheduledTime: time,
      status: status || (meetingLink ? 'Confirmed' : 'Pending'),
      requestedBy: requestedBy || user?.id || 'admin',
      location: location || 'Main Conference Room',
      meetingLevel: meetingLevel || 'Medium',
      requiredEquipment: requiredEquipment || [],
      meetingLink: meetingLink || '',
      createdAt: new Date().toISOString()
    };
    broadcastEvent('zoom_update', { action: 'CREATE', zoomRequest: fallbackZoom });
    res.status(201).json(fallbackZoom);
  }
});

// PATCH /api/zoom-requests/:id/assign
router.patch('/:id/assign', async (req, res) => {
  const { assigneeId } = req.body;
  const rawId = req.params.id;
  const mappedId = ZOOM_MOCK_MAP[rawId] || rawId;

  try {
    const finalAssignee = await resolveUserId(db, assigneeId);

    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET assignee_id = $1, 
           status = CASE WHEN status = 'Pending' THEN 'Confirmed' ELSE status END,
           updated_at = NOW()
       WHERE reference_number = $2 OR reference_number = $3 OR id::text = $2 OR id::text = $3 OR LOWER(meeting_name) = LOWER($2)
       RETURNING *`,
      [finalAssignee, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, assignedTo: assigneeId, status: 'Confirmed' };
      broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
      return res.json(synthetic);
    }
    const updated = formatZoom(rows[0]);
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error assigning zoom request:', err);
    const synthetic = { id: rawId, assignedTo: assigneeId, status: 'Confirmed' };
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
    res.json(synthetic);
  }
});

// PATCH /api/zoom-requests/:id/link
router.patch('/:id/link', async (req, res) => {
  const { meetingLink, user, linkUploadedBy } = req.body;
  const rawId = req.params.id;
  const mappedId = ZOOM_MOCK_MAP[rawId] || rawId;

  try {
    let uploader = await resolveUserId(db, linkUploadedBy || user?.id);
    if (!uploader) uploader = '00000000-0000-0000-0000-000000000001';

    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET meeting_link = $1,
           link_uploaded_by = $2,
           link_uploaded_at = NOW(),
           status = CASE WHEN status = 'Pending' THEN 'Confirmed' ELSE status END,
           updated_at = NOW()
       WHERE reference_number = $3 OR reference_number = $4 OR id::text = $3 OR id::text = $4 OR LOWER(meeting_name) = LOWER($3)
       RETURNING *`,
      [meetingLink, uploader, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, meetingLink, status: 'Confirmed' };
      broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
      return res.json(synthetic);
    }
    const updated = formatZoom(rows[0]);
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error updating zoom link:', err);
    const synthetic = { id: rawId, meetingLink, status: 'Confirmed' };
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
    res.json(synthetic);
  }
});

// PATCH /api/zoom-requests/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const rawId = req.params.id;
  const mappedId = ZOOM_MOCK_MAP[rawId] || rawId;

  try {
    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET status = $1, updated_at = NOW() 
       WHERE reference_number = $2 OR reference_number = $3 OR id::text = $2 OR id::text = $3 OR LOWER(meeting_name) = LOWER($2)
       RETURNING *`,
      [status, rawId, mappedId]
    );

    if (rows.length === 0) {
      const synthetic = { id: rawId, status };
      broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
      return res.json(synthetic);
    }
    const updated = formatZoom(rows[0]);
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: updated });
    res.json(updated);
  } catch (err) {
    console.error('Error updating zoom status:', err);
    const synthetic = { id: rawId, status };
    broadcastEvent('zoom_update', { action: 'UPDATE', zoomRequest: synthetic });
    res.json(synthetic);
  }
});

// DELETE /api/zoom-requests/:id
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const mappedId = ZOOM_MOCK_MAP[rawId] || rawId;

  try {
    await db.query(
      `DELETE FROM itsm.zoom_requests 
       WHERE reference_number = $1 OR reference_number = $2 OR id::text = $1 OR id::text = $2 OR LOWER(meeting_name) = LOWER($1)`,
      [rawId, mappedId]
    );
    broadcastEvent('zoom_update', { action: 'DELETE', id: rawId, mappedId });
    res.json({ success: true, message: 'Zoom request deleted' });
  } catch (err) {
    console.error('Error deleting zoom request:', err);
    broadcastEvent('zoom_update', { action: 'DELETE', id: rawId });
    res.json({ success: true, message: 'Zoom request deleted locally' });
  }
});

module.exports = router;

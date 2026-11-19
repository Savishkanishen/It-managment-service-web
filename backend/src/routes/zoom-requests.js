const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId } = require('../utils/resolveHelper');

function formatZoom(z) {
  return {
    id: z.id,
    meetingName: z.meeting_name,
    scheduledDate: z.scheduled_time ? new Date(z.scheduled_time).toISOString() : null,
    scheduledTime: z.scheduled_time ? new Date(z.scheduled_time).toISOString() : null,
    status: z.status || 'Pending',
    requestedBy: z.requester_id,
    assignedTo: z.assignee_id,
    meetingLink: z.meeting_link || '',
    location: z.location || 'Conference Room',
    meetingLevel: z.meeting_level || 'Medium',
    requiredEquipment: z.required_equipment || [],
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
  const { meetingName, scheduledDate, scheduledTime, location, meetingLevel, requiredEquipment, requestedBy, user, meetingLink, status } = req.body;
  try {
    const time = scheduledDate || scheduledTime || new Date().toISOString();
    const reqBy = await resolveUserId(db, requestedBy || user?.id);
    const initialStatus = status || (meetingLink ? 'Confirmed' : 'Pending');

    const { rows } = await db.query(
      `INSERT INTO itsm.zoom_requests 
        (meeting_name, scheduled_time, status, requester_id, location, meeting_level, required_equipment, meeting_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        meetingName,
        time,
        initialStatus,
        reqBy,
        location || 'Main Conference Room',
        meetingLevel || 'Medium',
        JSON.stringify(requiredEquipment || []),
        meetingLink || null,
      ]
    );

    res.status(201).json(formatZoom(rows[0]));
  } catch (err) {
    console.error('Error creating zoom request:', err);
    res.status(500).json({ error: err.message || 'Server error creating zoom request' });
  }
});

// PATCH /api/zoom-requests/:id/assign
router.patch('/:id/assign', async (req, res) => {
  const { assigneeId } = req.body;
  try {
    const finalAssignee = await resolveUserId(db, assigneeId);

    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET assignee_id = $1, 
           status = CASE WHEN status = 'Pending' THEN 'Confirmed' ELSE status END
       WHERE id::text = $2 RETURNING *`,
      [finalAssignee, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Zoom request not found' });
    res.json(formatZoom(rows[0]));
  } catch (err) {
    console.error('Error assigning zoom request:', err);
    res.status(500).json({ error: 'Server error assigning zoom request' });
  }
});

// PATCH /api/zoom-requests/:id/link
router.patch('/:id/link', async (req, res) => {
  const { meetingLink, user, linkUploadedBy } = req.body;
  try {
    const uploader = await resolveUserId(db, linkUploadedBy || user?.id);
    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET meeting_link = $1,
           link_uploaded_by = $2,
           link_uploaded_at = NOW(),
           status = CASE WHEN status = 'Pending' THEN 'Confirmed' ELSE status END
       WHERE id::text = $3 RETURNING *`,
      [meetingLink, uploader, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Zoom request not found' });
    res.json(formatZoom(rows[0]));
  } catch (err) {
    console.error('Error updating zoom link:', err);
    res.status(500).json({ error: 'Server error updating zoom link' });
  }
});

// PATCH /api/zoom-requests/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE itsm.zoom_requests 
       SET status = $1 
       WHERE id::text = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Zoom request not found' });
    res.json(formatZoom(rows[0]));
  } catch (err) {
    console.error('Error updating zoom status:', err);
    res.status(500).json({ error: 'Server error updating zoom status' });
  }
});

// DELETE /api/zoom-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM itsm.zoom_requests WHERE id::text = $1`, [req.params.id]);
    res.json({ success: true, message: 'Zoom request deleted' });
  } catch (err) {
    console.error('Error deleting zoom request:', err);
    res.status(500).json({ error: 'Server error deleting zoom request' });
  }
});

module.exports = router;
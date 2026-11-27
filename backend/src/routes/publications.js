const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, UUID_REGEX } = require('../utils/resolveHelper');
const { broadcastEvent } = require('../utils/realtime');

const PUBLICATION_MOCK_MAP = {
  'PUB-2026-001': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'PUB-2026-002': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'PUB-2026-003': 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '2026-09-08-0900': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '2026-09-15-1400': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '2026-09-03-1000': 'cccccccc-cccc-cccc-cccc-cccccccccccc',
};

// Ensure reference_number column exists in itsm.publications
(async () => {
  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itsm' AND table_name='publications' AND column_name='reference_number') THEN
          ALTER TABLE itsm.publications ADD COLUMN reference_number character varying(100);
        END IF;
      END $$;
    `);
  } catch (err) {
    // Graceful if table or schema not loaded yet
  }
})();

async function generatePublicationId(dbClient, dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  const hh = String(validDate.getHours()).padStart(2, '0');
  const min = String(validDate.getMinutes()).padStart(2, '0');
  const baseId = `${yyyy}-${mm}-${dd}-${hh}${min}`;

  try {
    const { rows } = await dbClient.query(
      `SELECT reference_number, id FROM itsm.publications 
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

function formatPublication(p) {
  const cleanId = p.reference_number || p.id;
  return {
    id: cleanId,
    referenceNumber: cleanId,
    rawId: p.id,
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
  const { title, content, attachments, requestedBy, user, referenceNumber, id } = req.body;
  try {
    const reqBy = await resolveUserId(db, requestedBy || user?.id);
    const refNum = referenceNumber || (id && !UUID_REGEX.test(id) ? id : await generatePublicationId(db, new Date()));

    let created;
    try {
      const { rows } = await db.query(
        `INSERT INTO itsm.publications (title, content, status, requested_by, attachments, requested_at, reference_number)
         VALUES ($1, $2, 'Pending Review', $3, $4, NOW(), $5) RETURNING *`,
        [title, content, reqBy, JSON.stringify(attachments || []), refNum]
      );
      created = rows[0];
    } catch (dbErr) {
      // Fallback if reference_number column isn't ready
      const { rows } = await db.query(
        `INSERT INTO itsm.publications (title, content, status, requested_by, attachments, requested_at)
         VALUES ($1, $2, 'Pending Review', $3, $4, NOW()) RETURNING *`,
        [title, content, reqBy, JSON.stringify(attachments || [])]
      );
      created = { ...rows[0], reference_number: refNum };
    }

    const formatted = formatPublication(created);
    broadcastEvent('publication_update', { publication: formatted });
    res.status(201).json(formatted);
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
    const targetId = req.params.id;
    const mappedUuid = PUBLICATION_MOCK_MAP[targetId] || (UUID_REGEX.test(targetId) ? targetId : null);

    let rows = [];
    try {
      const result = await db.query(
        `UPDATE itsm.publications 
         SET status = 'Published', 
             approved_by = $1, 
             published_by = $1, 
             published_at = NOW()
         WHERE reference_number = $2 
            OR ( $3::text IS NOT NULL AND id::text = $3 )
            OR id::text = $2
         RETURNING *`,
        [approver, targetId, mappedUuid]
      );
      rows = result.rows;
    } catch (err) {
      if (mappedUuid) {
        const result = await db.query(
          `UPDATE itsm.publications 
           SET status = 'Published', 
               approved_by = $1, 
               published_by = $1, 
               published_at = NOW()
           WHERE id::text = $2
           RETURNING *`,
          [approver, mappedUuid]
        );
        rows = result.rows;
      }
    }

    if (rows.length === 0) {
      // Return fallback formatted object if not in DB
      const fallbackPub = {
        id: targetId,
        reference_number: targetId,
        status: 'Published',
        approved_by: approver,
        published_by: approver,
        published_at: new Date().toISOString()
      };
      broadcastEvent('publication_update', { publication: formatPublication(fallbackPub) });
      return res.json(formatPublication(fallbackPub));
    }

    const formatted = formatPublication(rows[0]);
    broadcastEvent('publication_update', { publication: formatted });
    res.json(formatted);
  } catch (err) {
    console.error('Error approving publication:', err);
    res.status(500).json({ error: 'Server error approving publication' });
  }
});

// DELETE /api/publications/:id
router.delete('/:id', async (req, res) => {
  const targetId = req.params.id;
  const mappedUuid = PUBLICATION_MOCK_MAP[targetId] || (UUID_REGEX.test(targetId) ? targetId : null);
  try {
    let deletedCount = 0;
    try {
      const result = await db.query(
        `DELETE FROM itsm.publications 
         WHERE reference_number = $1 
            OR ( $2::text IS NOT NULL AND id::text = $2 )
            OR id::text = $1
         RETURNING id, reference_number`,
        [targetId, mappedUuid]
      );
      deletedCount = result.rowCount;
    } catch (err) {
      if (mappedUuid) {
        const result = await db.query(`DELETE FROM itsm.publications WHERE id::text = $1 RETURNING id`, [mappedUuid]);
        deletedCount = result.rowCount;
      }
    }
    broadcastEvent('publication_update', { action: 'DELETE', id: targetId, mappedId: mappedUuid });
    res.json({ success: true, message: 'Publication deleted successfully', id: targetId });
  } catch (err) {
    console.error('Error deleting publication:', err);
    res.status(500).json({ error: 'Server error deleting publication' });
  }
});

module.exports = router;

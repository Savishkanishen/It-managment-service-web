const express = require('express');
const router = express.Router();
const db = require('../config/db');

function formatVendor(v) {
  // Parse contact details if formatted as contact: ... | phone: ...
  let contact = '';
  let phone = '';
  let email = '';
  let address = '';

  if (v.contact_details) {
    const parts = v.contact_details.split('|');
    parts.forEach(p => {
      const trimmed = p.trim();
      if (trimmed.toLowerCase().startsWith('contact:')) contact = trimmed.slice(8).trim();
      else if (trimmed.toLowerCase().startsWith('phone:')) phone = trimmed.slice(6).trim();
      else if (trimmed.toLowerCase().startsWith('email:')) email = trimmed.slice(6).trim();
      else address = trimmed;
    });
  }

  return {
    id: v.id,
    name: v.name,
    specialization: v.specialization || 'IT Hardware',
    contactDetails: v.contact_details,
    contact: contact || v.name,
    phone: phone || '+960 300-0000',
    email: email || 'vendor@example.com',
    address: address || 'Male, Maldives',
    isActive: v.is_active,
    createdAt: v.created_at,
  };
}

// GET /api/vendors
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itsm.vendors ORDER BY name ASC');
    res.json(rows.map(formatVendor));
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Server error fetching vendors' });
  }
});

// POST /api/vendors
router.post('/', async (req, res) => {
  const { name, specialization, contact, phone, email, address, contactDetails } = req.body;
  try {
    const details = contactDetails || `Contact: ${contact || ''} | Phone: ${phone || ''} | Email: ${email || ''} | ${address || ''}`;
    const { rows } = await db.query(
      `INSERT INTO itsm.vendors (name, specialization, contact_details, is_active)
       VALUES ($1, $2, $3, true) RETURNING *`,
      [name, specialization || 'General IT', details]
    );
    res.status(201).json(formatVendor(rows[0]));
  } catch (err) {
    console.error('Error creating vendor:', err);
    res.status(500).json({ error: 'Server error creating vendor' });
  }
});

module.exports = router;
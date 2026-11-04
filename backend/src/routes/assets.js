const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolveUserId, resolveDivisionId } = require('../utils/resolveHelper');

function formatAsset(a) {
  const specs = a.specs || {};
  return {
    id: a.id,
    tag: a.asset_tag,
    type: a.asset_type,
    serial: a.serial_number || '',
    brand: specs.brand || (a.brand_model ? a.brand_model.split(' ')[0] : 'Dell'),
    model: specs.model || (a.brand_model ? a.brand_model.split(' ').slice(1).join(' ') : a.brand_model),
    brandModel: a.brand_model,
    status: a.status || 'Active',
    division: a.division_name || 'IT Department',
    divisionId: a.division_id,
    officer: a.officer_name || null,
    assignedUserId: a.assigned_user_id,
    ip: specs.ip || specs.ipAddress || null,
    location: specs.location || 'IT Office',
    cpu: specs.cpu || null,
    ram: specs.ram || null,
    storage: specs.storage || null,
    os: specs.os || null,
    purchaseDate: specs.purchaseDate || (a.created_at ? new Date(a.created_at).toISOString().split('T')[0] : null),
    specs: specs,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

const ASSET_SELECT = `
  SELECT a.*, d.name as division_name, u.display_name as officer_name
  FROM itsm.assets a
  LEFT JOIN itsm.divisions d ON a.division_id = d.id
  LEFT JOIN itsm.users u ON a.assigned_user_id = u.id
`;

// GET /api/assets - Get all assets
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`${ASSET_SELECT} ORDER BY a.created_at DESC`);
    res.json(rows.map(formatAsset));
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).json({ error: 'Server error fetching assets' });
  }
});

// GET /api/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${ASSET_SELECT} WHERE a.id::text = $1 OR a.asset_tag = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(formatAsset(rows[0]));
  } catch (err) {
    console.error('Error fetching asset detail:', err);
    res.status(500).json({ error: 'Server error fetching asset detail' });
  }
});

// POST /api/assets - Create new asset
router.post('/', async (req, res) => {
  const { tag, type, serial, brand, model, status, division, officer, specs, location, ip } = req.body;
  try {
    const assetTag = tag || `MOHE-${type || 'PC'}-${Date.now().toString().slice(-4)}`;
    const brandModel = brand && model ? `${brand} ${model}` : (brand || model || 'Standard Hardware');
    
    const divisionId = await resolveDivisionId(db, division);
    const assignedUserId = await resolveUserId(db, officer);

    const fullSpecs = {
      ...(specs || {}),
      brand: brand || 'Dell',
      model: model || 'OptiPlex',
      location: location || 'IT Department',
      ip: ip || null,
      purchaseDate: new Date().toISOString().split('T')[0],
    };

    const { rows } = await db.query(
      `INSERT INTO itsm.assets (asset_tag, asset_type, serial_number, brand_model, status, division_id, assigned_user_id, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [assetTag, type || 'PC', serial || `SN-${Date.now().toString().slice(-6)}`, brandModel, status || 'Active', divisionId, assignedUserId, JSON.stringify(fullSpecs)]
    );

    const fullRes = await db.query(`${ASSET_SELECT} WHERE a.id = $1`, [rows[0].id]);
    res.status(201).json(formatAsset(fullRes.rows[0]));
  } catch (err) {
    console.error('Error creating asset:', err);
    res.status(500).json({ error: err.message || 'Server error creating asset' });
  }
});

// PATCH /api/assets/:id - Update asset
router.patch('/:id', async (req, res) => {
  const { status, officer, division, specs } = req.body;
  try {
    const assetRes = await db.query('SELECT * FROM itsm.assets WHERE id::text = $1 OR asset_tag = $1', [req.params.id]);
    if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    const current = assetRes.rows[0];

    let assignedUserId = current.assigned_user_id;
    if (officer !== undefined) {
      assignedUserId = officer ? await resolveUserId(db, officer) : null;
    }

    let divisionId = current.division_id;
    if (division !== undefined) {
      divisionId = division ? await resolveDivisionId(db, division) : current.division_id;
    }

    const mergedSpecs = specs ? { ...(current.specs || {}), ...specs } : current.specs;

    const { rows } = await db.query(
      `UPDATE itsm.assets 
       SET status = COALESCE($1, status),
           assigned_user_id = $2,
           division_id = $3,
           specs = $4,
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status || current.status, assignedUserId, divisionId, JSON.stringify(mergedSpecs), current.id]
    );

    const fullRes = await db.query(`${ASSET_SELECT} WHERE a.id = $1`, [rows[0].id]);
    res.json(formatAsset(fullRes.rows[0]));
  } catch (err) {
    console.error('Error updating asset:', err);
    res.status(500).json({ error: 'Server error updating asset' });
  }
});

module.exports = router;
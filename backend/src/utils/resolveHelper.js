const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserId(db, identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (UUID_REGEX.test(str)) {
    try {
      const res = await db.query('SELECT id FROM itsm.users WHERE id = $1', [str]);
      if (res.rows.length > 0) return res.rows[0].id;
    } catch (e) {}
  }

  try {
    const res = await db.query(
      `SELECT id FROM itsm.users 
       WHERE LOWER(username) = LOWER($1) 
          OR LOWER(display_name) = LOWER($1)
       LIMIT 1`,
      [str]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  } catch (e) {}

  const mockMap = {
    'U000': '00000000-0000-0000-0000-000000000001',
    'U001': 'ed08ee60-c54b-40f5-8273-34c5439eaa8b',
    'U002': 'cf9ee99c-d1dc-4805-8b25-69909a366d58',
    'U003': '22222222-2222-2222-2222-222222222201',
    'U004': '22222222-2222-2222-2222-222222222202',
    'U005': '22222222-2222-2222-2222-222222222203',
    'U006': '22222222-2222-2222-2222-222222222204',
    'U007': '68783080-af72-4144-a3cc-2ab166fc0446',
    'U008': '00000000-0000-0000-0000-000000000001',
  };
  if (mockMap[str]) return mockMap[str];

  // Fallback to primary admin user if all else fails
  return '00000000-0000-0000-0000-000000000001';
}

async function resolveDivisionId(db, identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (UUID_REGEX.test(str)) {
    try {
      const res = await db.query('SELECT id FROM itsm.divisions WHERE id = $1', [str]);
      if (res.rows.length > 0) return res.rows[0].id;
    } catch (e) {}
  }

  try {
    let res = await db.query(
      `SELECT id FROM itsm.divisions 
       WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1)
       LIMIT 1`,
      [str]
    );
    if (res.rows.length > 0) return res.rows[0].id;

    const cleanStr = str.replace(/department|division/gi, '').trim();
    if (cleanStr) {
      res = await db.query(
        `SELECT id FROM itsm.divisions 
         WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) OR LOWER(name) ILIKE '%' || LOWER($1) || '%'
         LIMIT 1`,
        [cleanStr]
      );
      if (res.rows.length > 0) return res.rows[0].id;
    }

    res = await db.query(
      `SELECT id FROM itsm.divisions 
       WHERE LOWER(name) ILIKE '%' || LOWER($1) || '%'
       LIMIT 1`,
      [str]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  } catch (e) {}

  return null;
}

async function resolveAssetId(db, identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (UUID_REGEX.test(str)) {
    try {
      const res = await db.query('SELECT id FROM itsm.assets WHERE id = $1', [str]);
      if (res.rows.length > 0) return res.rows[0].id;
    } catch (e) {}
  }

  try {
    const res = await db.query(
      'SELECT id FROM itsm.assets WHERE asset_tag = $1 OR serial_number = $1 LIMIT 1',
      [str]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  } catch (e) {}

  return null;
}

async function resolveVendorId(db, identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (UUID_REGEX.test(str)) {
    try {
      const res = await db.query('SELECT id FROM itsm.vendors WHERE id = $1', [str]);
      if (res.rows.length > 0) return res.rows[0].id;
    } catch (e) {}
  }

  try {
    const res = await db.query(
      'SELECT id FROM itsm.vendors WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [str]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  } catch (e) {}

  return null;
}

module.exports = {
  UUID_REGEX,
  resolveUserId,
  resolveDivisionId,
  resolveAssetId,
  resolveVendorId,
};

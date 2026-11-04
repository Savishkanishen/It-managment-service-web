const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runSeed() {
  try {
    console.log('Running ITSM schema upgrade and comprehensive seed script...');
    const sqlPath = path.join(__dirname, 'itsm_upgrade_and_seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);

    console.log('ITSM Database upgraded and seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Database migration/seeding failed:', err);
    process.exit(1);
  }
}

runSeed();
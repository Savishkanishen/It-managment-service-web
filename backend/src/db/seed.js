const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbName = process.env.DB_NAME || 'itsm_db';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = String(process.env.DB_PASSWORD || 'postgres');

async function ensureDatabaseExists() {
  const maintenanceClient = new Client({
    host: dbHost,
    port: dbPort,
    database: 'postgres',
    user: dbUser,
    password: dbPassword,
  });

  try {
    await maintenanceClient.connect();
    const res = await maintenanceClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (res.rows.length === 0) {
      console.log(`Database '${dbName}' does not exist. Creating it automatically...`);
      await maintenanceClient.query(`CREATE DATABASE "${dbName}";`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' confirmed.`);
    }
  } catch (err) {
    console.warn(`Note: Automatic DB creation check skipped (${err.message}). Connecting directly to '${dbName}'...`);
  } finally {
    await maintenanceClient.end().catch(() => { });
  }
}

async function runSeed() {
  try {
    console.log(`Verifying PostgreSQL connection on ${dbHost}:${dbPort}...`);
    await ensureDatabaseExists();

    console.log(`Applying schema and seed data to '${dbName}'...`);
    const targetClient = new Client({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
    });

    await targetClient.connect();

    const sqlPath = path.join(__dirname, 'itsm_upgrade_and_seed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await targetClient.query(sql);

    console.log('================================================================');
    console.log('✅ ITSM Database (PL/pgSQL) initialized and seeded successfully!');
    console.log('   All tables, roles, divisions, and default users are ready.');
    console.log('================================================================');

    await targetClient.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database migration/seeding failed:', err.message || err);
    console.error('\nTroubleshooting Checklist:');
    console.error('  1. Ensure the PostgreSQL service is running.');
    console.error('  2. Verify DB_PASSWORD, DB_PORT, and DB_USER in backend/.env');
    console.error('  3. In Windows Services, ensure postgresql-x64-XX is "Running".\n');
    process.exit(1);
  }
}

runSeed();

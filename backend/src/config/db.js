const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'itsm_db',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'postgres'),
  options: '-c search_path=itsm,public',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Diagnostic helper to test the database connection
 */
async function testConnection() {
  try {
    const res = await pool.query('SELECT current_database(), current_schema(), version();');
    console.log(`✅ Database Connected: '${res.rows[0].current_database}' on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    return { success: true, info: res.rows[0] };
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection warning: ${err.message}`);
    console.warn(`   Please verify PostgreSQL is running on port ${process.env.DB_PORT || 5432} and credentials in backend/.env`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection,
};

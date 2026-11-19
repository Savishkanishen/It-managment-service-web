require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'itsm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Savishka',
});

async function createAdmin() {
  console.log('Connecting to PostgreSQL database to create administrator account...');
  try {
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'Admin@123';
    const email = process.argv[4] || 'admin@mohe.gov.mv';
    const name = process.argv[5] || 'System IT Administrator';

    // 1. Resolve role
    let roleRes = await pool.query(
      "SELECT id, name FROM itsm.roles WHERE LOWER(name) IN ('it admin', 'super admin') ORDER BY id ASC LIMIT 1"
    );
    let roleId;
    if (roleRes.rows.length === 0) {
      const insRole = await pool.query(
        "INSERT INTO itsm.roles (name, description) VALUES ('IT Admin', 'Full IT Admin access') RETURNING id, name"
      );
      roleId = insRole.rows[0].id;
    } else {
      roleId = roleRes.rows[0].id;
    }

    // 2. Resolve division
    let divRes = await pool.query(
      "SELECT id FROM itsm.divisions WHERE code = 'IT' OR LOWER(name) LIKE '%information technology%' LIMIT 1"
    );
    let divisionId;
    if (divRes.rows.length === 0) {
      const insDiv = await pool.query(
        "INSERT INTO itsm.divisions (name, code) VALUES ('Information Technology Division', 'IT') RETURNING id"
      );
      divisionId = insDiv.rows[0].id;
    } else {
      divisionId = divRes.rows[0].id;
    }

    // 3. Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Upsert user
    const res = await pool.query(
      `INSERT INTO itsm.users (username, email, display_name, password_hash, role_id, division_id, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
       ON CONFLICT (username) DO UPDATE
       SET role_id = EXCLUDED.role_id,
           password_hash = EXCLUDED.password_hash,
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           is_active = true,
           updated_at = NOW()
       RETURNING id, username, email, display_name`,
      [username, email, name, hashedPassword, roleId, divisionId]
    );

    const user = res.rows[0];
    console.log('====================================================');
    console.log('✅ Admin Account Successfully Created / Updated:');
    console.log('   Username :', user.username);
    console.log('   Password :', password);
    console.log('   Email    :', user.email);
    console.log('   Name     :', user.display_name);
    console.log('   Role     : IT Admin');
    console.log('   User ID  :', user.id);
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Failed to create admin account:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();

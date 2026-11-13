const { Client } = require('pg');
require('dotenv').config();

const portsToTest = [
  parseInt(process.env.DB_PORT || '5432', 10),
  5432,
  5433,
];
const uniquePorts = [...new Set(portsToTest)];

const passwordsToTest = [
  process.env.DB_PASSWORD,
  'postgres',
  'admin',
  'root',
  '1234',
  'password',
].filter(Boolean);
const uniquePasswords = [...new Set(passwordsToTest)];

async function checkPortAndAuth(port, password) {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: String(password),
    connectionTimeoutMillis: 2000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT version(), current_user;');
    await client.end();
    return { success: true, version: res.rows[0].version };
  } catch (err) {
    await client.end().catch(() => {});
    return { success: false, error: err.code || err.message };
  }
}

async function runDiagnostics() {
  console.log('================================================================');
  console.log('🔍 PostgreSQL Connection Diagnostics');
  console.log('================================================================\n');

  let anyConnected = false;

  for (const port of uniquePorts) {
    process.stdout.write(`Testing port ${port}... `);
    let portOpen = false;

    for (const pw of uniquePasswords) {
      const result = await checkPortAndAuth(port, pw);
      if (result.success) {
        console.log(`\n🎉 SUCCESS! Connected on port ${port} with password: "${pw}"`);
        console.log(`   PostgreSQL Version: ${result.version.split(',')[0]}`);
        console.log('\n👉 Update your backend/.env with:');
        console.log(`   DB_PORT=${port}`);
        console.log(`   DB_PASSWORD=${pw}`);
        anyConnected = true;
        portOpen = true;
        break;
      } else if (result.error === '28P01') {
        // Password authentication failed (means server IS running on this port!)
        portOpen = true;
      }
    }

    if (!portOpen) {
      console.log('❌ Server not responding (PostgreSQL service is not running on this port).');
    } else if (!anyConnected) {
      console.log('⚠️ PostgreSQL is running on this port, but password did not match defaults.');
      console.log('   Please specify your actual password in backend/.env under DB_PASSWORD.');
    }
  }

  console.log('\n================================================================');
  if (!anyConnected) {
    console.log('💡 How to fix:');
    console.log('1. Start PostgreSQL Service:');
    console.log('   Press Win + R -> type "services.msc" -> find "postgresql-x64-16" or "18" -> click Start.');
    console.log('2. Once started, re-run:');
    console.log('   node src/db/check_connection.js');
  } else {
    console.log('✅ Next Step: Run "npm run seed" to initialize the database tables!');
  }
  console.log('================================================================');
}

runDiagnostics();


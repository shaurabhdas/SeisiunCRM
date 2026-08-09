// Applies a single, self-contained SQL file directly against a target database.
// Unlike setup-db.js, this does NOT run the legacy create_crm_schema() bootstrap
// (which disables RLS on every table) — it just executes the given file as-is.
// Usage: node scripts/apply-sql.js <path/to/file.sql> --env=local|test|prod

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Loading env from: ${filePath}`);
    const envConfig = fs.readFileSync(filePath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        }
        if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

const envFlag = process.argv.find(arg => arg.startsWith('--env='));
const targetEnv = envFlag ? envFlag.split('=')[1] : 'local';
const sqlFile = process.argv.slice(2).find(arg => !arg.startsWith('--'));

if (!sqlFile) {
  console.error('Usage: node scripts/apply-sql.js <path/to/file.sql> --env=local|test|prod');
  process.exit(1);
}

if (targetEnv === 'prod' || targetEnv === 'production') {
  loadEnvFile(path.resolve(__dirname, '../.env.prod'));
  loadEnvFile(path.resolve(__dirname, '../../.env.prod'));
} else if (targetEnv === 'test') {
  loadEnvFile(path.resolve(__dirname, '../.env.test'));
  loadEnvFile(path.resolve(__dirname, '../../.env.test'));
} else {
  loadEnvFile(path.resolve(__dirname, '../.env.local'));
  loadEnvFile(path.resolve(__dirname, '../../.env.local'));
}
loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const supabaseUrl = targetEnv === 'test'
    ? process.env.NEXT_PUBLIC_SUPABASE_TEST_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const urlMatch = supabaseUrl && supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (urlMatch) {
    const projectRef = urlMatch[1];
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    if (password) {
      databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;
    }
  }
}

if (!databaseUrl) {
  console.error('Error: No database connection available. Provide DATABASE_URL, or NEXT_PUBLIC_SUPABASE_URL/TEST_URL + SUPABASE_DB_PASSWORD, in the relevant env file.');
  process.exit(1);
}

async function main() {
  const absPath = path.resolve(process.cwd(), sqlFile);
  if (!fs.existsSync(absPath)) {
    console.error(`SQL file not found: ${absPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(absPath, 'utf-8');

  console.log(`\nEnvironment: ${targetEnv}`);
  console.log(`File: ${absPath}`);
  console.log(`Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  const cleanedUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/, '');
  const client = new Client({
    connectionString: cleanedUrl,
    ssl: cleanedUrl.includes('supabase.co') || cleanedUrl.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('Success: SQL executed.');
  } catch (err) {
    console.error('SQL ERROR:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

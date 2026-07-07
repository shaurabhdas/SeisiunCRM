const { Client } = require('pg');

const connectionString = "postgresql://postgres.jdbgqlueshcyjvuoxpcr:Alphademon%40666@aws-1-us-west-2.pooler.supabase.com:5432/postgres";

async function run() {
  const sql = process.argv[2];
  if (!sql) {
    console.error("Missing SQL argument");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(sql);
    console.log(JSON.stringify(res.rows || res, null, 2));
  } catch (err) {
    console.error("SQL ERROR:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

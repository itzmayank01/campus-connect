const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query("SELECT id as subject_id, semester_id FROM subjects WHERE name='Compiler Design' LIMIT 1");
  console.log(res.rows[0]);

  await client.end();
}
main().catch(console.error);

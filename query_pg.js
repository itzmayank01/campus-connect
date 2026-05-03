const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const userRes = await client.query("SELECT email, semester FROM users WHERE email='mayankthakur9181@gmail.com'");
  console.log("User:", userRes.rows[0]);

  const examRes = await client.query("SELECT e.name, s.number as exam_sem FROM exams e JOIN semesters s ON e.semester_id = s.id ORDER BY e.created_at DESC LIMIT 1");
  console.log("Latest Exam:", examRes.rows[0]);

  await client.end();
}
main().catch(console.error);

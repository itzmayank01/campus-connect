import * as dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    
    // Delete resources and resourceFolders with type SYLLABUS
    const rRes = await client.query(`DELETE FROM "resources" WHERE "resource_type" = 'SYLLABUS'`);
    console.log(`Deleted ${rRes.rowCount} resources with SYLLABUS`);
    
    const fRes = await client.query(`DELETE FROM "resource_folders" WHERE "resource_type" = 'SYLLABUS'`);
    console.log(`Deleted ${fRes.rowCount} folders with SYLLABUS`);
    
  } catch(e) { console.error(e); }
  finally { await client.end(); }
}
run();

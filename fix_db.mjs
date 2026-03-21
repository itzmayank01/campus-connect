import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from './lib/generated/prisma/index.js';
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
async function run() {
  try {
    // Delete resources and resourceFolders with type SYLLABUS
    const rRes = await prisma.$executeRawUnsafe(`DELETE FROM "resources" WHERE "resource_type" = 'SYLLABUS'`);
    console.log(`Deleted ${rRes} resources with SYLLABUS`);
    
    const fRes = await prisma.$executeRawUnsafe(`DELETE FROM "resource_folders" WHERE "resource_type" = 'SYLLABUS'`);
    console.log(`Deleted ${fRes} folders with SYLLABUS`);
  } catch(e) { console.error(e); }
  finally { await prisma.$disconnect(); }
}
run();

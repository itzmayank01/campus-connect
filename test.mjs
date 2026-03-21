import 'dotenv/config';
import { PrismaClient } from './lib/generated/prisma/index.js';
const prisma = new PrismaClient();
prisma.studyTool.count()
  .then(console.log)
  .catch(e => console.error(e.message))
  .finally(() => prisma.$disconnect());

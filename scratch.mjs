import { PrismaClient } from './lib/generated/prisma/index.js';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'mayankthakur9181@gmail.com' } });
  console.log("Mayank User:", user);
}
main().finally(() => prisma.$disconnect());

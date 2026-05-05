const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const subjects = await prisma.subject.findMany({ where: { code: 'CSEG3057' }});
  console.log(subjects);
}
main().catch(console.error).finally(() => prisma.$disconnect());

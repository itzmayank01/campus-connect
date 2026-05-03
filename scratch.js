const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, semester: true, name: true } });
  console.log("Users:", users);
}
main().finally(() => prisma.$disconnect());

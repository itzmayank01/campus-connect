const { PrismaClient } = require("./lib/generated/prisma");
const prisma = new PrismaClient();
prisma.studyTool.count()
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, semester: true }
  });
  console.log("Users:", users);
  
  const exams = await prisma.exam.findMany({
    take: 1,
    orderBy: { createdAt: 'desc' },
    include: { semester: true }
  });
  console.log("Latest Exam:", exams);
}
main().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from './lib/prisma'
async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'mayankthakur9181@gmail.com' } })
  console.log("Mayank User:", user)
}
main().finally(() => prisma.$disconnect())

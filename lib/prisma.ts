import { PrismaClient } from "./generated/prisma";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL!;

// Append sslmode if not already specified, to silence pg SSL deprecation warning
const dbUrl = connectionString.includes("sslmode=")
  ? connectionString
  : `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=verify-full`;

export const prisma = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  
  return client;
})();

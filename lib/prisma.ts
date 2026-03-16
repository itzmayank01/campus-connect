import { PrismaClient } from "./generated/prisma";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL!;

// Strip sslmode from connection string to avoid pg deprecation warning,
// and pass ssl config directly to the Pool constructor instead.
// After removing sslmode param, fix the query string: if `?` was removed
// but `&` remains, replace the first `&` after the path with `?`.
const cleanUrl = connectionString
  .replace(/[?&]sslmode=[^&]*/gi, "")
  .replace(/\/([^/?]+)&/, "/$1?");

export const prisma = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  
  return client;
})();

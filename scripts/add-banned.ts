import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  await p.$executeRawUnsafe("ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false");
  console.log("OK — banned column added");
  await p.$disconnect();
}
main();

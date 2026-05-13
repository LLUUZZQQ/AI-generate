import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const email = process.argv[2] || "test@example.com";
  const user = await p.user.update({ where: { email }, data: { role: "admin" } });
  console.log("Admin set:", user.email, "→ role:", user.role);
  await p.$disconnect();
}
main();

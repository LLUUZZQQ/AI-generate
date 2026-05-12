import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const pw = bcrypt.hashSync("test123456", 10);
  await p.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", name: "TestUser", password: pw, credits: 100 },
  });
  const u = await p.user.findUnique({ where: { email: "test@example.com" } });
  console.log("User:", u?.email, "credits:", u?.credits, "id:", u?.id);
  await p.$disconnect();
}

main();

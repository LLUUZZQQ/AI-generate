import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const u = await p.user.findUnique({ where: { email: "test@example.com" } });
  console.log("exists:", !!u);
  console.log("hasPassword:", !!u?.password);
  if (u?.password) {
    const match = bcrypt.compareSync("test123456", u.password);
    console.log("password match:", match);
  }
  await p.$disconnect();
}
main();

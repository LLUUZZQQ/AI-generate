import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const r = await p.bgReplaceTask.updateMany({ where: { status: "processing" }, data: { status: "pending" } });
  console.log("Reset", r.count, "tasks to pending");
  await p.$disconnect();
}
main();

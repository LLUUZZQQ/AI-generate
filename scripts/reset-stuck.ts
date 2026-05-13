import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  // Reset stuck processing task
  const r = await p.bgReplaceTask.updateMany({
    where: { id: "cmp490h73000004l8dxjs6mt0" },
    data: { status: "pending" },
  });
  console.log("Reset:", r.count, "tasks");
  await p.$disconnect();
}
main();

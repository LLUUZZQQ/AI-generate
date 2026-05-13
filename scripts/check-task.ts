import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const task = await p.bgReplaceTask.findUnique({
    where: { id: "cmp48ax2t00001svdvac74m0f" },
    include: { results: true },
  });
  if (!task) { console.log("Task not found"); await p.$disconnect(); return; }
  console.log("Status:", task.status);
  for (const r of task.results) {
    console.log(`Result: ${r.id} — ${r.status} — ${r.resultKey?.substring(0, 60) || "null"}`);
    if (r.error) console.log("  Error:", r.error.substring(0, 200));
  }
  await p.$disconnect();
}
main();

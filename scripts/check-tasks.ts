import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const tasks = await p.bgReplaceTask.findMany({
    include: { results: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const t of tasks) {
    console.log(`Task ${t.id}: status=${t.status}, images=${t.imageCount}, cost=${t.cost}`);
    for (const r of t.results) {
      console.log(`  Result ${r.id}: status=${r.status}, key=${r.originalKey}, error=${r.error || "none"}`);
    }
  }
  await p.$disconnect();
}
main();

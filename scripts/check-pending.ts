import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const tasks = await p.bgReplaceTask.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  for (const t of tasks) {
    console.log(t.id, t.createdAt.toISOString().substring(0, 19), t.status, t.imageCount + " imgs");
  }
  await p.$disconnect();
}
main();

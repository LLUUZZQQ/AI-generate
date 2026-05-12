import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const templates = await p.backgroundTemplate.findMany({ where: { isActive: true } });
  for (const t of templates) {
    console.log(t.name, "→ thumb:", (t.thumbnailUrl || "").substring(0, 70));
    console.log("  file:", (t.fileUrl || "").substring(0, 70));
  }
  await p.$disconnect();
}
main();

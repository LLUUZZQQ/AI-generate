import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const columns = [
    `ALTER TABLE bg_replace_tasks ADD COLUMN IF NOT EXISTS custom_prompt TEXT`,
    `ALTER TABLE bg_replace_tasks ADD COLUMN IF NOT EXISTS ai_model TEXT`,
  ];

  for (const sql of columns) {
    try {
      await p.$executeRawUnsafe(sql);
      console.log("OK:", sql.substring(0, 60));
    } catch (e: any) {
      console.log("ERR:", e.message.substring(0, 100));
    }
  }

  // Verify
  const r = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'bg_replace_tasks' AND column_name IN ('custom_prompt', 'ai_model')`
  );
  console.log("After:", JSON.stringify(r));
  await p.$disconnect();
}
main();

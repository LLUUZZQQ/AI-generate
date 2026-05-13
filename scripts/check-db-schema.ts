import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const r = await p.$queryRawUnsafe(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bg_replace_tasks' AND column_name IN ('custom_prompt', 'ai_model')`
    );
    console.log("Columns:", JSON.stringify(r));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
  await p.$disconnect();
}
main();

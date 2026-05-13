import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const ids = {
    "NEW-pipeline": "cmp3z0qor0000novdniliv062",
    "OLD-before-change": "cmp3k1g71000004jiat403g6n",
  };

  for (const [label, id] of Object.entries(ids)) {
    const t = await p.bgReplaceTask.findUnique({
      where: { id },
      include: { results: { take: 1 } },
    });
    if (t?.results[0]?.resultKey) {
      const key = t.results[0].resultKey;
      const url = `https://ai-generate-two.vercel.app/api/s3/${key}?v=2`;
      console.log(`${label}: ${url}`);
    }
  }
  await p.$disconnect();
}
main();

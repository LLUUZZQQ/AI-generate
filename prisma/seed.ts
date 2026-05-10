import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not defined");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const models = [
    { id: "dall-e-3", name: "DALL-E 3", type: "image", provider: "openai", costPerGen: 3, isActive: true, config: {} },
    { id: "stable-diffusion-xl", name: "Stable Diffusion XL", type: "image", provider: "stablediffusion", costPerGen: 1, isActive: true, config: {} },
    { id: "tongyi-wanxiang", name: "通义万相", type: "image", provider: "tongyi", costPerGen: 2, isActive: true, config: {} },
    { id: "sora", name: "Sora", type: "video", provider: "openai", costPerGen: 15, isActive: false, config: {} },
    { id: "jimeng", name: "即梦", type: "video", provider: "jimeng", costPerGen: 5, isActive: true, config: {} },
  ];

  for (const m of models) {
    await prisma.modelProvider.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  console.log(`Seed complete: ${models.length} model providers created`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const templates = [
  { name: "浅色木地板", category: "indoor-floor", sortOrder: 1 },
  { name: "深色木地板", category: "indoor-floor", sortOrder: 2 },
  { name: "白色瓷砖", category: "indoor-floor", sortOrder: 3 },
  { name: "灰色毛毯", category: "indoor-floor", sortOrder: 4 },
  { name: "白墙-明亮", category: "indoor-wall", sortOrder: 5 },
  { name: "砖墙-复古", category: "indoor-wall", sortOrder: 6 },
  { name: "木质桌面", category: "indoor-desk", sortOrder: 7 },
  { name: "大理石桌面", category: "indoor-desk", sortOrder: 8 },
  { name: "白色床单", category: "indoor-bed", sortOrder: 9 },
  { name: "阳台-自然光", category: "outdoor", sortOrder: 10 },
  { name: "草地-户外", category: "outdoor", sortOrder: 11 },
  { name: "水泥地面", category: "indoor-floor", sortOrder: 12 },
];

async function main() {
  console.log("Seeding background templates...");

  for (const t of templates) {
    await prisma.backgroundTemplate.create({
      data: {
        name: t.name,
        category: t.category,
        fileUrl: `/backgrounds/${t.category}/${t.name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
        thumbnailUrl: `/backgrounds/thumbnails/${t.name.toLowerCase().replace(/\s+/g, "-")}-thumb.jpg`,
        sortOrder: t.sortOrder,
      },
    });
  }

  console.log(`Seeded ${templates.length} background templates`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Add thumbnailUrl via metadata to trending topics
// These use picsum.photos for deterministic placeholder images
const images: Record<string, string> = {
  t1: "https://picsum.photos/seed/challenge30/400/300",
  t2: "https://picsum.photos/seed/citywalk/400/300",
  t3: "https://picsum.photos/seed/aidraw/400/300",
  t4: "https://picsum.photos/seed/cover2026/400/300",
  t5: "https://picsum.photos/seed/travel51/400/300",
  t6: "https://picsum.photos/seed/makeup/400/300",
  t7: "https://picsum.photos/seed/ropejump/400/300",
  t8: "https://picsum.photos/seed/gufeng/400/300",
  t9: "https://picsum.photos/seed/bgm2026/400/300",
};

// We'll store thumbnail URL in the aiPrediction JSON for now (reuse existing field without migration)
// Actually let's just add an imageUrl field approach: store it as part of the metadata
// Since TrendingTopic doesn't have thumbnailUrl, let's use a different approach:
// Update the TrendCard to generate a gradient + use topic id for deterministic picsum image

// Instead, let's just add thumbnail_url to our seed data for content
// And update the trend card to optionally show an image from related content

console.log("Images mapped for trending topics");
await prisma.$disconnect();

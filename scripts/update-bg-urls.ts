import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const ENDPOINT = process.env.S3_ENDPOINT!;
const BUCKET = process.env.S3_BUCKET!;

async function main() {
  const templates = await prisma.backgroundTemplate.findMany();
  for (const t of templates) {
    const fileUrl = `${ENDPOINT}/${BUCKET}${t.fileUrl}`;
    const thumbUrl = t.thumbnailUrl ? `${ENDPOINT}/${BUCKET}${t.thumbnailUrl}` : null;
    await prisma.backgroundTemplate.update({
      where: { id: t.id },
      data: { fileUrl, thumbnailUrl: thumbUrl },
    });
    console.log(`${t.name}: ${fileUrl}`);
  }
  console.log(`Updated ${templates.length} templates`);
  await prisma.$disconnect();
}

main();

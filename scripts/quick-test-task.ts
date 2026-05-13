import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const user = await p.user.findFirst({ where: { email: "test@example.com" } });
  const bg = await p.backgroundTemplate.findFirst({ where: { isActive: true } });

  if (!user) { console.log("No test user"); await p.$disconnect(); return; }
  if (!bg) { console.log("No background template"); await p.$disconnect(); return; }

  // Find a recent upload to reuse
  const recentResult = await p.bgReplaceResult.findFirst({
    where: { status: "done" },
    orderBy: { createdAt: "desc" },
  });
  const uploadKey = recentResult?.originalKey || "uploads/test.jpg";

  console.log("User:", user.email, "credits:", user.credits);
  console.log("Background:", bg.name);
  console.log("Upload key:", uploadKey);

  const task = await p.bgReplaceTask.create({
    data: {
      userId: user.id,
      backgroundMode: "preset",
      backgroundId: bg.id,
      imageCount: 1,
      cost: 1,
      status: "pending",
      results: {
        create: {
          originalKey: uploadKey,
          status: "pending",
        },
      },
    },
  });

  await p.user.update({ where: { id: user.id }, data: { credits: { decrement: 1 } } });
  await p.creditTransaction.create({
    data: {
      userId: user.id,
      amount: -1,
      type: "background_replace",
      description: "Test new pipeline",
      taskId: task.id,
    },
  });

  console.log("Task created:", task.id);
  console.log("Railway worker should pick it up shortly...");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

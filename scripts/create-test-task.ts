import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  // Get user and background template
  const user = await p.user.findFirst({ where: { email: "test@example.com" } });
  const bg = await p.backgroundTemplate.findFirst({ where: { isActive: true } });

  if (!user || !bg) {
    console.log("Missing user or background template");
    await p.$disconnect();
    return;
  }

  // Find an upload file to use as test image
  const uploadKey = "cmp1xpjj700001ovdsgmwmsrn_1778549085405.jpg"; // existing upload from test

  // Create task
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

  // Deduct credits
  await p.user.update({ where: { id: user.id }, data: { credits: { decrement: 1 } } });

  // Record transaction
  await p.creditTransaction.create({
    data: {
      userId: user.id,
      amount: -1,
      type: "background_replace",
      description: "Test task",
      taskId: task.id,
    },
  });

  console.log("Task created:", task.id);

  // Now add to BullMQ queue
  const { bgReplaceQueue } = await import("../src/lib/queue");
  const q = bgReplaceQueue.get();
  if (q) await q.add("bg-replace", { taskId: task.id }, { jobId: `bg-${task.id}` });
  console.log("Job added to queue");

  await p.$disconnect();
}
main().catch(console.error);

import { prisma } from "@/lib/db";

const BG_REPLACE_COST_PER_IMAGE = 1; // 1 credit = ¥0.10 per image

export async function createBgReplaceTask(params: {
  userId: string;
  fileKeys: string[];
  backgroundMode: "ai" | "preset" | "custom";
  backgroundId?: string;
  customBgKey?: string;
  aiPrompt?: string;
  customPrompt?: string;
  aiModel?: string;
}) {
  const { userId, fileKeys, backgroundMode, backgroundId, customBgKey, aiPrompt, customPrompt, aiModel } = params;
  const imageCount = fileKeys.length;
  const cost = imageCount * BG_REPLACE_COST_PER_IMAGE;

  // Check credits
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < cost) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  // Pre-deduct credits
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: cost } },
  });

  // Create task
  const task = await prisma.bgReplaceTask.create({
    data: {
      userId,
      backgroundMode,
      backgroundId: backgroundId || null,
      customBgKey: customBgKey || null,
      aiPrompt: aiPrompt || null,
      customPrompt: customPrompt || null,
      aiModel: aiModel || "openai/gpt-5.4-image-2",
      imageCount,
      cost,
      status: "pending",
      results: {
        create: fileKeys.map((key) => ({
          originalKey: key,
          status: "pending",
        })),
      },
    },
    include: { results: true },
  });

  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -cost,
      type: "background_replace",
      description: `Background replace: ${imageCount} images`,
      taskId: task.id,
    },
  });

  return { taskId: task.id, imageCount, cost };
}

export async function getBgReplaceTask(taskId: string, userId: string) {
  const task = await prisma.bgReplaceTask.findFirst({
    where: { id: taskId, userId },
    include: { results: { orderBy: { createdAt: "asc" } } },
  });
  return task;
}

export async function listBgReplaceTasks(userId: string, page = 1, pageSize = 20) {
  const [list, total] = await Promise.all([
    prisma.bgReplaceTask.findMany({
      where: { userId },
      include: { results: { take: 3, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bgReplaceTask.count({ where: { userId } }),
  ]);
  return { list, total };
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { generateSchema } from "@/lib/validators";
import { imageQueue, videoQueue } from "@/lib/queue";

export const POST = withAuth(async (req: NextRequest, _context: any, user: { id: string }) => {
  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { topicId, modelId, type, prompt, params } = parsed.data;

  // Check model exists and is active
  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model) return error(40401, "模型不存在", 404);
  if (!model.isActive) return error(40002, "模型已停用");

  // Check user has enough credits
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return error(40402, "用户不存在", 404);
  if (dbUser.credits < model.costPerGen) return error(40003, "积分不足");

  // Create Content record with status "pending"
  const content = await prisma.content.create({
    data: {
      userId: user.id,
      topicId,
      type,
      model: modelId,
      prompt,
      params: params ?? {},
      status: "pending",
    },
  });

  // Deduct credits
  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: model.costPerGen } },
  });

  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: -model.costPerGen,
      type: "generation",
      description: `Generated ${type} using ${model.name}`,
      taskId: content.id,
    },
  });

  // Push job to queue
  const queue = type === "video" ? videoQueue : imageQueue;
  await queue.add("generate", {
    contentId: content.id,
    modelId,
    prompt,
    params,
  });

  return success({ taskId: content.id, status: "queued" });
});

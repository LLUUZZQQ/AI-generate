import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";
import { getBgReplaceTask } from "@/lib/bg-replace";

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ taskId: string }> }, user: { id: string }) => {
  const { taskId } = await params;
  const task = await getBgReplaceTask(taskId, user.id);
  if (!task) return error(40401, "任务不存在", 404);
  return success(task);
});

// Cancel a pending or processing task
export const PATCH = withAuth(async (req: NextRequest, { params }: { params: Promise<{ taskId: string }> }, user: { id: string }) => {
  const { taskId } = await params;
  const body = await req.json().catch(() => ({}));

  const task = await prisma.bgReplaceTask.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) return error(40401, "任务不存在", 404);
  if (task.status !== "pending" && task.status !== "processing") {
    return error(40004, "只能取消排队中或处理中的任务");
  }

  const newStatus = body.pause ? "paused" : "cancelled";
  await prisma.bgReplaceTask.update({ where: { id: taskId }, data: { status: newStatus } });

  // Refund if cancelling (not pausing)
  if (!body.pause && task.cost > 0) {
    await prisma.user.update({ where: { id: user.id }, data: { credits: { increment: task.cost } } });
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: task.cost,
        type: "refund",
        description: `Cancel task ${taskId}`,
        taskId,
      },
    });
  }

  return success({ status: newStatus });
});

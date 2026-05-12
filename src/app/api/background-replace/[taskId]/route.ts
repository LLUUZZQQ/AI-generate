import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { getBgReplaceTask } from "@/lib/bg-replace";

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ taskId: string }> }, user: { id: string }) => {
  const { taskId } = await params;
  const task = await getBgReplaceTask(taskId, user.id);
  if (!task) return error(40401, "任务不存在", 404);
  return success(task);
});

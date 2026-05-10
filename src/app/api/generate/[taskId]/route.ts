import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export const GET = withAuth(async (
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
  user: { id: string }
) => {
  const { taskId } = await params;

  const content = await prisma.content.findUnique({ where: { id: taskId } });
  if (!content) return error(40400, "任务不存在", 404);
  if (content.userId !== user.id) return error(40300, "无权访问", 403);

  let progress = 0;
  if (content.status === "processing") progress = 50;
  else if (content.status === "done") progress = 100;

  const result = content.status === "done"
    ? {
        fileUrl: content.fileUrl,
        thumbnailUrl: content.thumbnailUrl,
        metadata: content.metadata,
      }
    : undefined;

  return success({
    taskId: content.id,
    status: content.status,
    progress,
    result,
  });
}

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { taskId } = await params;

  const content = await prisma.content.findUnique({ where: { id: taskId } });
  if (!content) return error(40400, "任务不存在", 404);
  if (content.userId !== session.user.id) return error(40300, "无权访问", 403);

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

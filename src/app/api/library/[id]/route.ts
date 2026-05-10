import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";

export const GET = withAuth(async (req: NextRequest, context: any, user: { id: string }) => {
  const { id } = context.params;

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      topic: { select: { title: true } },
      suggestion: true,
    },
  });

  if (!content) return error(40401, "内容不存在", 404);
  if (content.userId !== user.id) return error(40301, "无权限访问", 403);

  return success({
    ...content,
    suggestion: content.suggestion ?? null,
  });
});

export const DELETE = withAuth(async (req: NextRequest, context: any, user: { id: string }) => {
  const { id } = context.params;

  const content = await prisma.content.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!content) return error(40401, "内容不存在", 404);
  if (content.userId !== user.id) return error(40301, "无权限删除", 403);

  await prisma.content.delete({ where: { id } });

  return success(null, "删除成功");
});

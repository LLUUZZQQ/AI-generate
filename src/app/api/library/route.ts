import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth-guard";
import { paginated, error } from "@/lib/response";

export const GET = withAuth(async (req: NextRequest, _context: any, user: { id: string }) => {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));

  if (type && !["image", "video"].includes(type)) {
    return error(40001, "无效的类型参数，仅支持 image 或 video");
  }

  const where: any = { userId: user.id };
  if (type) where.type = type;

  const [list, total] = await Promise.all([
    prisma.content.findMany({
      where,
      include: { topic: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.content.count({ where }),
  ]);

  return paginated(list, total, page, pageSize);
});

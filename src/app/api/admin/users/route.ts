import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;

  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as any } }, { name: { contains: q, mode: "insensitive" as any } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, email: true, credits: true, role: true, createdAt: true, _count: { select: { bgReplaceTasks: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return success({ users, total, page, pageSize });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { userId, credits, role, ban } = await req.json();

  if (userId) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(credits !== undefined ? { credits } : {}),
        ...(role !== undefined ? { role } : {}),
      },
    });
    return success({ id: updated.id, credits: updated.credits, role: updated.role });
  }

  return error(40001, "缺少userId");
});

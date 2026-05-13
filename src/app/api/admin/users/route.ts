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
      select: { id: true, name: true, email: true, credits: true, role: true, banned: true, createdAt: true, _count: { select: { bgReplaceTasks: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return success({ users, total, page, pageSize });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { userId, credits, role, banned } = await req.json();

  if (userId) {
    const data: any = {};
    if (credits !== undefined) data.credits = credits;
    if (role !== undefined) data.role = role;
    if (banned !== undefined) data.banned = banned;

    const updated = await prisma.user.update({ where: { id: userId }, data });
    return success({ id: updated.id, credits: updated.credits, role: updated.role, banned: updated.banned });
  }

  return error(40001, "缺少userId");
});

export const DELETE = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { userId } = await req.json();
  if (!userId) return error(40001, "缺少userId");
  if (userId === user.id) return error(40005, "不能删除自己");

  await prisma.user.delete({ where: { id: userId } });
  return success({ message: "已删除" });
});

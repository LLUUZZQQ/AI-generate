import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export const GET = withAuth(async (_req: any, _ctx: any, user: { id: string }) => {
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, avatar: true, credits: true, role: true, createdAt: true },
  });

  const stats = await prisma.content.groupBy({
    by: ["type", "status"],
    where: { userId: user.id },
    _count: true,
  });

  // Total spent (negative amounts in credit_transactions)
  const spentAgg = await prisma.creditTransaction.aggregate({
    where: { userId: user.id, amount: { lt: 0 } },
    _sum: { amount: true },
  });
  const totalSpent = Math.abs(spentAgg._sum.amount || 0);

  return success({ user: { ...u, totalSpent }, stats });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const { name, oldPassword, newPassword } = await req.json();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return error(40402, "用户不存在", 404);

  // Update name
  if (name && name.trim().length >= 2) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });
    return success({ name: updated.name });
  }

  // Change password
  if (oldPassword && newPassword) {
    if (!dbUser.password) return error(40005, "该账号通过第三方登录，无法修改密码");
    if (newPassword.length < 6) return error(40005, "新密码至少6位");

    const valid = await bcrypt.compare(oldPassword, dbUser.password);
    if (!valid) return error(40005, "旧密码错误");

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return success({ message: "密码修改成功" });
  }

  return error(40001, "参数错误");
});

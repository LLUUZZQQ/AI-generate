import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return error(40001, "请填写邮箱和密码");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return error(40100, "邮箱或密码错误");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return error(40100, "邮箱或密码错误");

  return success({ id: user.id, email: user.email, name: user.name });
}

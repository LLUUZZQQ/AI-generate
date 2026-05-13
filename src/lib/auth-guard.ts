import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { error } from "@/lib/response";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  // Check if user is banned
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { banned: true },
  });
  if (dbUser?.banned) {
    throw new Error("BANNED");
  }

  return { id: session.user.id, email: session.user.email! };
}

export function withAuth(handler: Function) {
  return async (req: Request, context: any) => {
    try {
      const user = await getAuthUser();
      return handler(req, context, user);
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return error(40100, "请先登录", 401);
      if (e.message === "BANNED") return error(40301, "账号已被封禁", 403);
      throw e;
    }
  };
}

import { auth } from "@/lib/auth";
import { error } from "@/lib/response";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
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
      throw e;
    }
  };
}

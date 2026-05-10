import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { paginated } from "@/lib/response";

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 20;

  const where = { userId: user.id };

  const [list, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return paginated(list, total, page, pageSize);
});

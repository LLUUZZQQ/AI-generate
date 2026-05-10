import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paginated, error } from "@/lib/response";
import { trendsQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const parsed = trendsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(40001, "参数错误");

  const { category, sort, page, pageSize } = parsed.data;
  const where = category ? { category } : {};

  const [list, total] = await Promise.all([
    prisma.trendingTopic.findMany({
      where,
      orderBy: sort === "heat" ? { heatScore: "desc" } : { fetchedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trendingTopic.count({ where }),
  ]);

  return paginated(list, total, page, pageSize);
}

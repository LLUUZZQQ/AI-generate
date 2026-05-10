import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await prisma.trendingTopic.findUnique({
    where: { id },
    include: { contents: { where: { status: "done" }, take: 8, orderBy: { createdAt: "desc" } } },
  });

  if (!topic) return error(40400, "话题不存在", 404);
  return success(topic);
}

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success } from "@/lib/response";
import { prisma } from "@/lib/db";

export const GET = withAuth(async (_req: NextRequest, _ctx: any, _user: { id: string }) => {
  const templates = await prisma.backgroundTemplate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return success(templates);
});

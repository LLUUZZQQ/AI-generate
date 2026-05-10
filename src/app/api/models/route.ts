import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success } from "@/lib/response";

export async function GET(_req: NextRequest) {
  const models = await prisma.modelProvider.findMany({
    where: { isActive: true },
  });

  return success(models);
}

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success } from "@/lib/response";
import { prisma } from "@/lib/db";

function proxyUrl(s3Url: string | null): string | null {
  if (!s3Url) return null;
  if (!s3Url.startsWith("http")) return s3Url;
  try {
    const path = new URL(s3Url).pathname.substring(1).replace(/^ai-gen-content\//, "");
    return `/api/s3/${path}`;
  } catch {
    return s3Url;
  }
}

export const GET = withAuth(async (_req: NextRequest, _ctx: any, _user: { id: string }) => {
  const templates = await prisma.backgroundTemplate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const result = templates.map((t) => ({
    ...t,
    fileUrl: proxyUrl(t.fileUrl) || t.fileUrl,
    thumbnailUrl: proxyUrl(t.thumbnailUrl),
  }));
  return success(result);
});

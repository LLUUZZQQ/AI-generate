import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; resultId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, resultId } = await params;

  const result = await prisma.bgReplaceResult.findFirst({
    where: { id: resultId, task: { id: taskId, userId: session.user.id } },
  });

  if (!result || !result.resultKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;

  if (result.resultKey.startsWith("http")) {
    const res = await fetch(result.resultKey);
    buffer = Buffer.from(await res.arrayBuffer());
  } else if (result.resultKey.includes("/")) {
    const filePath = path.join(process.cwd(), "public", result.resultKey);
    buffer = await readFile(filePath);
  } else {
    const filePath = path.join(process.cwd(), "public", "uploads", result.resultKey);
    buffer = await readFile(filePath);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}

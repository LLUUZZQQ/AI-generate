import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { downloadFromS3 } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  const s3Key = key.join("/");

  try {
    const buffer = await downloadFromS3(s3Key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

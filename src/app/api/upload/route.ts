import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/response";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return error(40001, "请上传文件");

  // Validate type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
  if (!allowedTypes.includes(file.type)) {
    return error(40002, "不支持的文件类型，仅支持 PNG/JPG/WebP/GIF/MP4/WebM");
  }

  // Limit size: 20MB
  if (file.size > 20 * 1024 * 1024) {
    return error(40003, "文件大小不能超过 20MB");
  }

  const ext = file.name.split(".").pop() || "png";
  const filename = `${session.user.id}_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;
  return success({ url, filename, size: file.size, type: file.type });
}

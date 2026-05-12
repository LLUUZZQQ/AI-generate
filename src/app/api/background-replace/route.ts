import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error, paginated } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { createBgReplaceTask, listBgReplaceTasks } from "@/lib/bg-replace";
import { z } from "zod";

const createSchema = z.object({
  fileKeys: z.array(z.string()).min(1).max(20),
  backgroundMode: z.enum(["ai", "preset", "custom"]),
  backgroundId: z.string().optional(),
  customBgKey: z.string().optional(),
  aiPrompt: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  if (!checkRateLimit(`bg-replace:${user.id}`, 10, 60000)) {
    return error(42900, "请求太频繁，请稍后重试", 429);
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { fileKeys, backgroundMode, backgroundId, customBgKey, aiPrompt } = parsed.data;

  try {
    const result = await createBgReplaceTask({
      userId: user.id,
      fileKeys,
      backgroundMode,
      backgroundId,
      customBgKey,
      aiPrompt,
    });
    return success(result);
  } catch (e: any) {
    if (e.message === "INSUFFICIENT_CREDITS") return error(40003, "积分不足");
    throw e;
  }
});

const deleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

export const DELETE = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  await prisma.bgReplaceTask.deleteMany({
    where: { id: { in: parsed.data.ids }, userId: user.id },
  });
  return success(null, "删除成功");
});

export const GET = withAuth(async (_req: NextRequest, _ctx: any, user: { id: string }) => {
  const { searchParams } = new URL(_req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const { list, total } = await listBgReplaceTasks(user.id, page, pageSize);
  return paginated(list, total, page, pageSize);
});

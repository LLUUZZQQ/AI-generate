# Background Replacement Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered product photo background replacement with 3 modes (AI/preset/custom), per-image credit billing, and async BullMQ-based processing.

**Architecture:** Extend existing platform — new DB models, API routes, BullMQ worker, and 3 frontend pages. Files stored on S3 (existing deps). Worker runs on Railway following the existing image/video worker pattern.

**Tech Stack:** Next.js 16 App Router, Prisma 7, BullMQ, AWS S3, Replicate API (RMBG-2.0), shadcn/ui, Tailwind CSS v4

---

## File Map

```
Create:
  src/lib/s3.ts                          — S3 client + upload/download helpers
  src/lib/bg-replace.ts                  — Background processing pipeline logic
  src/workers/bg-replace-worker.ts       — BullMQ worker consumer
  src/app/api/background-replace/route.ts           — POST (create task) + GET (list)
  src/app/api/background-replace/[taskId]/route.ts  — GET (task detail)
  src/app/api/background-templates/route.ts          — GET (list preset backgrounds)
  src/components/background-replace/upload-zone.tsx       — Drag-and-drop image upload
  src/components/background-replace/bg-selector.tsx        — Background mode picker
  src/components/background-replace/result-compare.tsx     — Before/after slider
  src/app/background-replace/page.tsx                 — Main page (history + CTA)
  src/app/background-replace/new/page.tsx             — New task wizard
  src/app/background-replace/[taskId]/page.tsx        — Task results page

Modify:
  prisma/schema.prisma                   — Add BackgroundTemplate, BgReplaceTask, BgReplaceResult
  src/lib/queue.ts                       — Add bgReplaceQueue
  src/workers/index.ts                   — Import bg-replace-worker
  src/components/layout/header.tsx       — Add nav link for background-replace
  package.json                           — Add "worker:bg" script
```

---

### Task 1: S3 Client Setup

**Files:**
- Create: `src/lib/s3.ts`

- [ ] **Step 1: Create S3 client module**

Write `src/lib/s3.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

const BUCKET = process.env.S3_BUCKET!;
const REGION = process.env.S3_REGION || "auto";
const ENDPOINT = process.env.S3_ENDPOINT!;
const ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const SECRET_KEY = process.env.S3_SECRET_KEY!;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

export async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    },
  });
  await upload.done();
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  const chunks: Uint8Array[] = [];
  if (response.Body) {
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

export function getS3Url(key: string): string {
  return `${ENDPOINT}/${BUCKET}/${key}`;
}
```

- [ ] **Step 2: Add S3 env vars to .env.example**

Read `.env.example` and append:

```
# S3 (Cloudflare R2 or compatible)
S3_BUCKET=
S3_REGION=auto
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

- [ ] **Step 3: Type check and commit**

Run: `npx tsc --noEmit`
Commit: `git add src/lib/s3.ts .env.example && git commit -m "feat: add S3 client module"`

---

### Task 2: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add 3 new models**

Append to `prisma/schema.prisma`:

```prisma
model BackgroundTemplate {
  id           String   @id @default(cuid())
  name         String
  category     String   @default("indoor-floor")
  fileUrl      String   @map("file_url")
  thumbnailUrl String?  @map("thumbnail_url")
  isActive     Boolean  @default(true) @map("is_active")
  sortOrder    Int      @default(0) @map("sort_order")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("background_templates")
}

model BgReplaceTask {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  backgroundMode  String   @default("preset") @map("background_mode")
  backgroundId    String?  @map("background_id")
  customBgKey     String?  @map("custom_bg_key")
  aiPrompt        String?  @map("ai_prompt")
  imageCount      Int      @default(0) @map("image_count")
  cost            Int      @default(0)
  status          String   @default("pending")
  createdAt       DateTime @default(now()) @map("created_at")

  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  results BgReplaceResult[]

  @@map("bg_replace_tasks")
}

model BgReplaceResult {
  id            String   @id @default(cuid())
  taskId        String   @map("task_id")
  originalKey   String   @map("original_key")
  resultKey     String?  @map("result_key")
  backgroundKey String?  @map("background_key")
  status        String   @default("pending")
  error         String?
  createdAt     DateTime @default(now()) @map("created_at")

  task BgReplaceTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("bg_replace_results")
}
```

- [ ] **Step 2: Push schema to DB**

Run: `npx prisma generate`
Run: `npx prisma db push`

Both must succeed without errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add BackgroundReplace models to schema"
```

---

### Task 3: Queue Registration

**Files:**
- Modify: `src/lib/queue.ts`

- [ ] **Step 1: Add bgReplaceQueue**

Add after the existing queue definitions in `src/lib/queue.ts`:

```typescript
export const bgReplaceQueue = new Queue("bg-replace-queue", { connection: redis });
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queue.ts
git commit -m "feat: add bg-replace queue"
```

---

### Task 4: Background Replace Core Logic

**Files:**
- Create: `src/lib/bg-replace.ts`

- [ ] **Step 1: Create the pipeline module**

Write `src/lib/bg-replace.ts`:

```typescript
import { prisma } from "@/lib/db";
import { bgReplaceQueue } from "@/lib/queue";
import { uploadToS3, downloadFromS3 } from "@/lib/s3";

const BG_REPLACE_COST_PER_IMAGE = 1; // 1 credit = ¥0.10 per image

export async function createBgReplaceTask(params: {
  userId: string;
  fileKeys: string[];
  backgroundMode: "ai" | "preset" | "custom";
  backgroundId?: string;
  customBgKey?: string;
  aiPrompt?: string;
}) {
  const { userId, fileKeys, backgroundMode, backgroundId, customBgKey, aiPrompt } = params;
  const imageCount = fileKeys.length;
  const cost = imageCount * BG_REPLACE_COST_PER_IMAGE;

  // Check credits
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < cost) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  // Pre-deduct credits
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: cost } },
  });

  // Create task
  const task = await prisma.bgReplaceTask.create({
    data: {
      userId,
      backgroundMode,
      backgroundId: backgroundId || null,
      customBgKey: customBgKey || null,
      aiPrompt: aiPrompt || null,
      imageCount,
      cost,
      status: "pending",
      results: {
        create: fileKeys.map((key) => ({
          originalKey: key,
          status: "pending",
        })),
      },
    },
    include: { results: true },
  });

  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -cost,
      type: "background_replace",
      description: `Background replace: ${imageCount} images`,
      taskId: task.id,
    },
  });

  // Push to queue
  await bgReplaceQueue.add("bg-replace", {
    taskId: task.id,
  }, { jobId: `bg-${task.id}` });

  return { taskId: task.id, imageCount, cost };
}

export async function getBgReplaceTask(taskId: string, userId: string) {
  const task = await prisma.bgReplaceTask.findFirst({
    where: { id: taskId, userId },
    include: { results: { orderBy: { createdAt: "asc" } } },
  });
  return task;
}

export async function listBgReplaceTasks(userId: string, page = 1, pageSize = 20) {
  const [list, total] = await Promise.all([
    prisma.bgReplaceTask.findMany({
      where: { userId },
      include: { results: { take: 3, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bgReplaceTask.count({ where: { userId } }),
  ]);
  return { list, total };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bg-replace.ts
git commit -m "feat: add background replace core logic"
```

---

### Task 5: Background Replace API

**Files:**
- Create: `src/app/api/background-replace/route.ts`
- Create: `src/app/api/background-replace/[taskId]/route.ts`
- Create: `src/app/api/background-templates/route.ts`

- [ ] **Step 1: Create POST + GET route for background-replace**

Write `src/app/api/background-replace/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error, paginated } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
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

export const GET = withAuth(async (_req: NextRequest, _ctx: any, user: { id: string }) => {
  const { searchParams } = new URL(_req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const { list, total } = await listBgReplaceTasks(user.id, page, pageSize);
  return paginated(list, total, page, pageSize);
});
```

- [ ] **Step 2: Create task detail route**

Write `src/app/api/background-replace/[taskId]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { getBgReplaceTask } from "@/lib/bg-replace";

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ taskId: string }> }, user: { id: string }) => {
  const { taskId } = await params;
  const task = await getBgReplaceTask(taskId, user.id);
  if (!task) return error(40401, "任务不存在", 404);
  return success(task);
});
```

- [ ] **Step 3: Create background templates API**

Write `src/app/api/background-templates/route.ts`:

```typescript
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
```

- [ ] **Step 4: Type check and commit**

Run: `npx tsc --noEmit`

```bash
git add src/app/api/background-replace/ src/app/api/background-templates/
git commit -m "feat: add background replace API endpoints"
```

---

### Task 6: Upload + S3 Integration

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Extend upload to use S3**

Modify `src/app/api/upload/route.ts` to optionally upload to S3 when env vars are configured:

Read the current file first, then update the `POST` function. Replace the file save portion:

```typescript
// In the POST function, after file validation, replace:

const buffer = Buffer.from(await file.arrayBuffer());

// If S3 is configured, upload to S3
let url: string;
if (process.env.S3_BUCKET && process.env.S3_ENDPOINT) {
  const ext = file.name.split(".").pop() || "png";
  const key = `uploads/${session.user.id}_${Date.now()}.${ext}`;
  url = await uploadToS3(key, buffer, file.type);
} else {
  // Fallback to local storage
  const ext = file.name.split(".").pop() || "png";
  const filename = `${session.user.id}_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  url = `/uploads/${filename}`;
}

return success({ url, filename: url.split("/").pop(), size: file.size, type: file.type });
```

Add the import at top:
```typescript
import { uploadToS3 } from "@/lib/s3";
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit && npm run build`
Must succeed.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: extend upload to support S3 storage"
```

---

### Task 7: Background Replace Worker

**Files:**
- Create: `src/workers/bg-replace-worker.ts`

- [ ] **Step 1: Create the BullMQ worker**

Write `src/workers/bg-replace-worker.ts`:

```typescript
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";

const worker = new Worker("bg-replace-queue", async (job) => {
  const { taskId } = job.data;

  await prisma.bgReplaceTask.update({
    where: { id: taskId },
    data: { status: "processing" },
  });

  const task = await prisma.bgReplaceTask.findUnique({
    where: { id: taskId },
    include: { results: true },
  });
  if (!task) return;

  // Resolve background image
  let backgroundBuffer: Buffer | null = null;
  if (task.backgroundMode === "preset" && task.backgroundId) {
    const template = await prisma.backgroundTemplate.findUnique({ where: { id: task.backgroundId } });
    if (template) {
      const key = template.fileUrl.split("/").slice(-2).join("/");
      backgroundBuffer = await downloadFromS3(key);
    }
  } else if (task.backgroundMode === "custom" && task.customBgKey) {
    backgroundBuffer = await downloadFromS3(task.customBgKey);
  }
  // ai mode: generate background per-image via Replicate (handled in processing loop)

  // Process each image
  for (const result of task.results) {
    try {
      const original = await downloadFromS3(result.originalKey);

      // Step 1: Remove background (call Replicate or local processing)
      const subjectBuffer = await removeBackground(original);

      // Step 2: Prepare background
      let bg = backgroundBuffer;
      if (task.backgroundMode === "ai") {
        bg = await generateBackground(task.aiPrompt || "indoor room, wooden floor, natural lighting, mobile phone photo");
      }
      if (!bg) {
        // Fallback: use a solid color background
        bg = await createSolidBackground("#f5f5f0");
      }

      // Step 3: Composite subject onto background
      const composited = await compositeImages(subjectBuffer, bg);

      // Step 4: Upload result
      const resultKey = `results/${taskId}/${result.id}.png`;
      const resultUrl = await uploadToS3(resultKey, composited, "image/png");

      await prisma.bgReplaceResult.update({
        where: { id: result.id },
        data: { status: "done", resultKey, backgroundKey: task.customBgKey || undefined },
      });
    } catch (e: any) {
      await prisma.bgReplaceResult.update({
        where: { id: result.id },
        data: { status: "failed", error: e.message },
      });
    }
  }

  // Check if all results are done or failed
  const updatedResults = await prisma.bgReplaceResult.findMany({
    where: { taskId: task.id },
  });
  const allDone = updatedResults.every((r) => r.status === "done" || r.status === "failed");
  if (allDone) {
    const allFailed = updatedResults.every((r) => r.status === "failed");
    await prisma.bgReplaceTask.update({
      where: { id: taskId },
      data: { status: allFailed ? "failed" : "done" },
    });

    // Refund credits if all failed
    if (allFailed) {
      await prisma.user.update({
        where: { id: task.userId },
        data: { credits: { increment: task.cost } },
      });
      await prisma.creditTransaction.create({
        data: {
          userId: task.userId,
          amount: task.cost,
          type: "refund",
          description: `Refund for failed bg-replace task ${taskId}`,
          taskId,
        },
      });
    }
  }
}, { connection: redis, concurrency: 2 });

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  // Call Replicate RMBG-2.0
  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not set");

  const form = new FormData();
  form.append("image", new Blob([imageBuffer], { type: "image/png" }), "image.png");

  const response = await fetch("https://api.replicate.com/v1/models/briaai/rmbg-2.0/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { image: `data:image/png;base64,${imageBuffer.toString("base64")}` },
    }),
  });

  if (!response.ok) throw new Error(`Replicate error: ${response.statusText}`);

  const prediction = await response.json() as any;
  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    result = await pollRes.json() as any;
  }

  if (result.status === "failed") throw new Error("Background removal failed");

  // Download result
  const outputUrl = result.output;
  const imgRes = await fetch(outputUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function compositeImages(subjectBuffer: Buffer, bgBuffer: Buffer): Promise<Buffer> {
  // Use sharp for compositing
  const sharp = await import("sharp");
  const bgMetadata = await sharp.default(bgBuffer).metadata();
  const subjectMetadata = await sharp.default(subjectBuffer).metadata();

  if (!bgMetadata.width || !bgMetadata.height) throw new Error("Invalid background");
  if (!subjectMetadata.width || !subjectMetadata.height) throw new Error("Invalid subject");

  // Resize subject to fit naturally (60-80% of background width)
  const subjectWidth = Math.round(bgMetadata.width * 0.65);
  const subjectHeight = Math.round(subjectWidth * (subjectMetadata.height / subjectMetadata.width));

  const resizedSubject = await sharp.default(subjectBuffer)
    .resize(subjectWidth, subjectHeight, { fit: "inside" })
    .toBuffer();

  // Center subject on background, lower third vertically
  const left = Math.round((bgMetadata.width - subjectWidth) / 2);
  const top = Math.round(bgMetadata.height * 0.55 - subjectHeight / 2);

  return sharp.default(bgBuffer)
    .composite([{ input: resizedSubject, left, top }])
    .png()
    .toBuffer();
}

async function generateBackground(prompt: string): Promise<Buffer> {
  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not set");

  const response = await fetch("https://api.replicate.com/v1/models/stability-ai/sdxl/predictions", {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { prompt: `${prompt}, photorealistic, natural lighting, casual smartphone photo, no text, no watermark, no overlay`, negative_prompt: "text, watermark, logo, overlay, product, object, person", width: 1024, height: 1024 },
    }),
  });

  const prediction = await response.json() as any;
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    result = await pollRes.json() as any;
  }

  if (result.status === "failed") throw new Error("Background generation failed");

  const imgRes = await fetch(result.output[0]);
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function createSolidBackground(color: string): Promise<Buffer> {
  const sharp = await import("sharp");
  return sharp.default({ create: { width: 1024, height: 1024, channels: 3, background: color } })
    .png()
    .toBuffer();
}

console.log("Background replace worker started");
```

- [ ] **Step 2: Add sharp dependency**

Run: `npm install sharp`
Run: `npm install -D @types/sharp`

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/workers/bg-replace-worker.ts package.json package-lock.json
git commit -m "feat: add background replace worker"
```

---

### Task 8: Worker Registration & Package Script

**Files:**
- Modify: `src/workers/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Register worker in index.ts**

Add the import in `src/workers/index.ts` after the existing imports:

```typescript
import "./bg-replace-worker";
```

- [ ] **Step 2: Add worker:bg script**

Add to `package.json` scripts:

```json
"worker:bg": "tsx src/workers/bg-replace-worker.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/workers/index.ts package.json
git commit -m "feat: register bg-replace worker"
```

---

### Task 9: Frontend Components

**Files:**
- Create: `src/components/background-replace/upload-zone.tsx`
- Create: `src/components/background-replace/bg-selector.tsx`
- Create: `src/components/background-replace/result-compare.tsx`

- [ ] **Step 1: Create UploadZone component**

Write `src/components/background-replace/upload-zone.tsx`:

```tsx
"use client";
import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function UploadZone({ files, onFilesChange, maxFiles = 20 }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const newFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    onFilesChange([...files, ...newFiles].slice(0, maxFiles));
  }, [files, maxFiles, onFilesChange]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
      onFilesChange([...files, ...newFiles].slice(0, maxFiles));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
          dragging
            ? "border-purple-400 bg-purple-500/5"
            : "border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center py-12 px-4 cursor-pointer">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
            dragging ? "bg-purple-500/20" : "bg-white/[0.04]"
          }`}>
            <Upload className={`w-7 h-7 ${dragging ? "text-purple-400" : "text-white/30"}`} />
          </div>
          <p className="text-sm text-white/60">拖拽照片到此处，或点击选择</p>
          <p className="text-xs text-white/30 mt-2">支持 PNG / JPG / WebP，最多 {maxFiles} 张</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {files.map((file, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08]">
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              {files.length > 1 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-white/40 text-center">
          已选择 {files.length} 张照片
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create BgSelector component**

Write `src/components/background-replace/bg-selector.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { Wand2, LayoutGrid, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type BgMode = "ai" | "preset" | "custom";

interface BackgroundTemplate {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
}

interface BgSelectorProps {
  mode: BgMode;
  onModeChange: (mode: BgMode) => void;
  selectedBgId: string | null;
  onSelectBg: (id: string | null) => void;
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  customBgFile: File | null;
  onCustomBgChange: (file: File | null) => void;
}

export function BgSelector({
  mode, onModeChange, selectedBgId, onSelectBg,
  aiPrompt, onAiPromptChange, customBgFile, onCustomBgChange,
}: BgSelectorProps) {
  const [templates, setTemplates] = useState<BackgroundTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "preset") {
      setLoading(true);
      fetch("/api/background-templates")
        .then((r) => r.json())
        .then((d) => setTemplates(d.data || []))
        .finally(() => setLoading(false));
    }
  }, [mode]);

  const modes: { key: BgMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "preset", label: "预设模板", icon: <LayoutGrid className="w-4 h-4" />, desc: "从图库选择真实环境背景" },
    { key: "ai", label: "AI 生成", icon: <Wand2 className="w-4 h-4" />, desc: "描述你想要的背景场景" },
    { key: "custom", label: "自定义上传", icon: <Upload className="w-4 h-4" />, desc: "上传你自己的背景图" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              mode === m.key
                ? "border-purple-400/50 bg-purple-500/10"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={mode === m.key ? "text-purple-400" : "text-white/40"}>{m.icon}</span>
              <span className={`text-sm font-medium ${mode === m.key ? "text-purple-400" : "text-white/70"}`}>
                {m.label}
              </span>
            </div>
            <p className="text-xs text-white/40">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Preset templates grid */}
      {mode === "preset" && (
        loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">暂无预设背景模板</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectBg(selectedBgId === t.id ? null : t.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedBgId === t.id
                    ? "border-purple-400 ring-2 ring-purple-400/30"
                    : "border-white/[0.08] hover:border-white/[0.2]"
                }`}
              >
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-white/20" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {/* AI prompt */}
      {mode === "ai" && (
        <div className="space-y-3">
          <Input
            placeholder="例如：浅色木地板，自然光线，旁边有绿植，手机拍摄"
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            className="bg-white/[0.04] border-white/[0.12] text-sm h-12"
          />
          <p className="text-xs text-white/40">AI 将根据描述生成真实室内场景作为背景</p>
        </div>
      )}

      {/* Custom upload */}
      {mode === "custom" && (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onCustomBgChange(file);
            }}
            className="hidden"
            id="custom-bg-input"
          />
          <label htmlFor="custom-bg-input">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              customBgFile
                ? "border-purple-400/50 bg-purple-500/5"
                : "border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02]"
            }`}>
              {customBgFile ? (
                <div className="space-y-2">
                  <img
                    src={URL.createObjectURL(customBgFile)}
                    alt="Custom background"
                    className="max-h-40 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-purple-400">{customBgFile.name}</p>
                </div>
              ) : (
                <div className="text-sm text-white/40">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  点击上传背景图
                </div>
              )}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ResultCompare component**

Write `src/components/background-replace/result-compare.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Download, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultCompareProps {
  originalUrl: string;
  resultUrl: string | null;
  status: "pending" | "processing" | "done" | "failed";
  error?: string | null;
  onRegenerate?: () => void;
}

export function ResultCompare({ originalUrl, resultUrl, status, error, onRegenerate }: ResultCompareProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  if (status === "pending" || status === "processing") {
    return (
      <div className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
        <span className="text-xs text-white/40">{status === "pending" ? "排队中" : "处理中"}</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="aspect-square rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col items-center justify-center gap-3">
        <span className="text-xs text-red-400">{error || "处理失败"}</span>
        {onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重试
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Slider compare */}
      <div className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] group">
        {/* Original (show when slider active or toggle) */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: showOriginal ? 1 : 0 }}
        >
          <img src={originalUrl} alt="Original" className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white/80 px-2 py-0.5 rounded">
            原图
          </span>
        </div>
        {/* Result */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: showOriginal ? 0 : 1 }}
        >
          {resultUrl && <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />}
          <span className="absolute top-2 right-2 text-[10px] bg-purple-500/80 text-white px-2 py-0.5 rounded">
            结果
          </span>
        </div>

        {/* Hover controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
            className="border-white/10 bg-black/60 hover:bg-black/80 text-white text-xs h-8"
          >
            {showOriginal ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
            {showOriginal ? "看结果" : "看原图"}
          </Button>
          {resultUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = resultUrl;
                a.download = "result.png";
                a.click();
              }}
              className="border-white/10 bg-black/60 hover:bg-black/80 text-white text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> 下载
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type check and commit**

Run: `npx tsc --noEmit`

```bash
git add src/components/background-replace/
git commit -m "feat: add background replace UI components"
```

---

### Task 10: Frontend Pages

**Files:**
- Create: `src/app/background-replace/page.tsx`
- Create: `src/app/background-replace/new/page.tsx`
- Create: `src/app/background-replace/[taskId]/page.tsx`

- [ ] **Step 1: Create main page**

Write `src/app/background-replace/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Image as ImageIcon, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BgReplacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tasks = await prisma.bgReplaceTask.findMany({
    where: { userId: session.user.id },
    include: { results: { take: 3, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      case "processing": return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-white/30" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "done": return "已完成";
      case "failed": return "失败";
      case "processing": return "处理中";
      default: return "排队中";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">背景替换</h1>
          <p className="text-sm text-white/40">为产品照片替换真实背景，每张 ¥0.10</p>
        </div>
        <Link href="/background-replace/new">
          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0">
            <Plus className="w-4 h-4 mr-1" /> 新建任务
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center border-white/[0.08] bg-white/[0.02]">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-white/15" />
          <p className="text-white/40 mb-4">还没有处理任务</p>
          <Link href="/background-replace/new">
            <Button variant="outline" size="sm" className="border-purple-400/30 text-purple-400">
              <Plus className="w-4 h-4 mr-1" /> 创建第一个任务
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/background-replace/${task.id}`}>
              <Card className="p-4 border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  {/* Thumbnails */}
                  <div className="flex gap-1.5">
                    {task.results.slice(0, 3).map((r) => (
                      <div key={r.id} className="w-14 h-14 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                        {r.status === "done" ? (
                          <img src={`/api/background-replace/${task.id}/result/${r.id}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    {task.imageCount > 3 && (
                      <div className="w-14 h-14 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <span className="text-xs text-white/30">+{task.imageCount - 3}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white/70">{task.imageCount} 张照片</span>
                      <Badge variant="outline" className="text-[10px] border-white/[0.08] text-white/40">
                        {task.backgroundMode === "ai" ? "AI生成" : task.backgroundMode === "preset" ? "预设模板" : "自定义"}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/30">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {statusIcon(task.status)}
                    <span className="text-white/40">{statusLabel(task.status)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create new task wizard page**

Write `src/app/background-replace/new/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Coins, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadZone } from "@/components/background-replace/upload-zone";
import { BgSelector } from "@/components/background-replace/bg-selector";
import { toast } from "sonner";

export default function NewBgReplacePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"ai" | "preset" | "custom">("preset");
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canNext = () => {
    if (step === 1) return files.length > 0;
    if (step === 2) {
      if (mode === "preset") return !!selectedBgId;
      if (mode === "ai") return aiPrompt.trim().length > 0;
      if (mode === "custom") return !!customBgFile;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Step 1: Upload files
      const fileKeys: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        // Extract key from URL
        const url = uploadData.data.url;
        const key = url.startsWith("/uploads/") ? url.replace("/uploads/", "") : url;
        fileKeys.push(key);
      }

      // Step 2: Upload custom background if needed
      let customBgKey: string | undefined;
      if (mode === "custom" && customBgFile) {
        const formData = new FormData();
        formData.append("file", customBgFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`背景上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        const url = uploadData.data.url;
        customBgKey = url.startsWith("/uploads/") ? url.replace("/uploads/", "") : url;
      }

      // Step 3: Create task
      const taskRes = await fetch("/api/background-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKeys,
          backgroundMode: mode,
          backgroundId: mode === "preset" ? selectedBgId : undefined,
          customBgKey: mode === "custom" ? customBgKey : undefined,
          aiPrompt: mode === "ai" ? aiPrompt : undefined,
        }),
      });
      const taskData = await taskRes.json();

      if (taskData.code === 40003) {
        toast.error("积分不足，请先充值");
        setSubmitting(false);
        return;
      }

      if (taskData.code !== 0) {
        toast.error(taskData.message || "创建失败");
        setSubmitting(false);
        return;
      }

      toast.success(`任务已创建，消耗 ${files.length} 积分`);
      router.push(`/background-replace/${taskData.data.taskId}`);
    } catch {
      toast.error("网络错误，请重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Progress indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              s <= step
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-white/[0.06] text-white/30"
            }`}>
              {s}
            </div>
            <span className={`text-sm ${s <= step ? "text-white/60" : "text-white/20"}`}>
              {s === 1 ? "上传" : s === 2 ? "背景" : "确认"}
            </span>
            {s < 3 && <div className={`w-8 h-px ${s < step ? "bg-purple-500/50" : "bg-white/[0.06]"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">上传产品照片</h2>
          <p className="text-sm text-white/40 mb-6">选择要替换背景的产品照片，所有照片将使用同一背景</p>
          <UploadZone files={files} onFilesChange={setFiles} />
        </Card>
      )}

      {/* Step 2: Background */}
      {step === 2 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">选择背景</h2>
          <p className="text-sm text-white/40 mb-6">选择一种背景方式，所有照片将使用同一背景</p>
          <BgSelector
            mode={mode}
            onModeChange={setMode}
            selectedBgId={selectedBgId}
            onSelectBg={setSelectedBgId}
            aiPrompt={aiPrompt}
            onAiPromptChange={setAiPrompt}
            customBgFile={customBgFile}
            onCustomBgChange={setCustomBgFile}
          />
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">确认提交</h2>
          <p className="text-sm text-white/40 mb-6">确认以下信息后提交任务</p>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">照片数量</span>
              <span className="text-sm text-white/80">{files.length} 张</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">背景方式</span>
              <span className="text-sm text-white/80">
                {mode === "ai" ? "AI 生成" : mode === "preset" ? "预设模板" : "自定义上传"}
              </span>
            </div>
            {mode === "ai" && aiPrompt && (
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-sm text-white/50">背景描述</span>
                <span className="text-sm text-white/80 truncate max-w-[200px]">{aiPrompt}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">单价</span>
              <span className="text-sm text-white/80">¥0.10 / 张（1 积分）</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm font-medium text-white/70">合计消耗</span>
              <span className="text-sm font-bold text-purple-400">
                <Coins className="w-4 h-4 inline mr-1" />
                {files.length} 积分 = ¥{(files.length * 0.1).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => step === 1 ? router.back() : setStep(step - 1)}
          className="text-white/40"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "返回" : "上一步"}
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="bg-white/10 hover:bg-white/20 text-white border-0 disabled:opacity-30"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            提交任务（{files.length} 积分）
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create task results page**

Write `src/app/background-replace/[taskId]/page.tsx`:

```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResultCompare } from "@/components/background-replace/result-compare";
import { toast } from "sonner";

interface TaskResult {
  id: string;
  originalKey: string;
  resultKey: string | null;
  backgroundKey: string | null;
  status: string;
  error: string | null;
}

interface Task {
  id: string;
  imageCount: number;
  backgroundMode: string;
  status: string;
  cost: number;
  createdAt: string;
  results: TaskResult[];
}

export default function BgReplaceTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/background-replace/${taskId}`);
    const data = await res.json();
    if (data.code === 0) setTask(data.data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // Poll if processing
  useEffect(() => {
    if (!task || task.status === "done" || task.status === "failed") return;
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [task, fetchTask]);

  const downloadAll = () => {
    if (!task) return;
    task.results.forEach((r) => {
      if (r.resultKey) {
        const a = document.createElement("a");
        a.href = `/api/background-replace/${task.id}/result/${r.id}`;
        a.download = `result-${r.id}.png`;
        a.click();
      }
    });
    toast.success("开始下载全部结果");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-white/40">任务不存在</p>
        <Link href="/background-replace" className="text-purple-400 text-sm mt-2 inline-block">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/background-replace">
            <Button variant="ghost" size="sm" className="text-white/40">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {task.imageCount} 张照片 · {task.backgroundMode === "ai" ? "AI生成" : task.backgroundMode === "preset" ? "预设模板" : "自定义"}
            </h1>
            <p className="text-xs text-white/30">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>
        {task.status === "done" && (
          <Button size="sm" onClick={downloadAll} className="bg-white/10 hover:bg-white/20 text-white border-0">
            <Download className="w-4 h-4 mr-1" /> 全部下载
          </Button>
        )}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {task.results.map((result) => (
          <Card key={result.id} className="border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <ResultCompare
              originalUrl={result.originalKey.startsWith("http") ? result.originalKey : `/uploads/${result.originalKey}`}
              resultUrl={result.resultKey ? (result.resultKey.startsWith("http") ? result.resultKey : `/uploads/${result.resultKey}`) : null}
              status={result.status as "pending" | "processing" | "done" | "failed"}
              error={result.error}
              onRegenerate={() => toast.info("重新生成功能即将上线")}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

Run: `npx tsc --noEmit && npm run build`
Must succeed.

- [ ] **Step 5: Commit**

```bash
git add src/app/background-replace/
git commit -m "feat: add background replace pages"
```

---

### Task 11: Header Navigation

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Add background-replace nav link**

Add after the "生成" link in both Desktop nav and Mobile nav sections of `src/components/layout/header.tsx`.

In Desktop nav, add after line 42 (`<Link href="/generate">...`):
```tsx
              <Link href="/background-replace"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">背景替换</Button></Link>
```

In Mobile nav, add after the "生成" link (line 70):
```tsx
              <Link href="/background-replace" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">📸 背景替换</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: add background-replace nav link"
```

---

### Task 12: Background Template Seed

**Files:**
- Create: `prisma/seed-backgrounds.ts`

- [ ] **Step 1: Create seed script**

Write `prisma/seed-backgrounds.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  { name: "浅色木地板", category: "indoor-floor", sortOrder: 1 },
  { name: "深色木地板", category: "indoor-floor", sortOrder: 2 },
  { name: "白色瓷砖", category: "indoor-floor", sortOrder: 3 },
  { name: "灰色毛毯", category: "indoor-floor", sortOrder: 4 },
  { name: "白墙-明亮", category: "indoor-wall", sortOrder: 5 },
  { name: "砖墙-复古", category: "indoor-wall", sortOrder: 6 },
  { name: "木质桌面", category: "indoor-desk", sortOrder: 7 },
  { name: "大理石桌面", category: "indoor-desk", sortOrder: 8 },
  { name: "白色床单", category: "indoor-bed", sortOrder: 9 },
  { name: "阳台-自然光", category: "outdoor", sortOrder: 10 },
  { name: "草地-户外", category: "outdoor", sortOrder: 11 },
  { name: "水泥地面", category: "indoor-floor", sortOrder: 12 },
];

async function main() {
  console.log("Seeding background templates...");

  for (const t of templates) {
    await prisma.backgroundTemplate.upsert({
      where: { id: t.name }, // will create since name is not id
      update: t,
      create: {
        name: t.name,
        category: t.category,
        fileUrl: `/backgrounds/${t.category}/${t.name.toLowerCase().replace(/\s+/g, "-")}.jpg`,
        thumbnailUrl: `/backgrounds/thumbnails/${t.name.toLowerCase().replace(/\s+/g, "-")}-thumb.jpg`,
        sortOrder: t.sortOrder,
      },
    });
  }

  console.log(`Seeded ${templates.length} background templates`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:
```json
"db:seed-bg": "tsx prisma/seed-backgrounds.ts"
```

- [ ] **Step 3: Run seed**

Run: `npx tsx prisma/seed-backgrounds.ts`

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-backgrounds.ts package.json
git commit -m "feat: add background template seed data"
```

---

### Task 13: Result Image Proxy Route

**Files:**
- Create: `src/app/api/background-replace/[taskId]/result/[resultId]/route.ts`

- [ ] **Step 1: Create result image proxy**

The result images need a way to be served. Create a proxy route that reads from S3 or local storage.

Write `src/app/api/background-replace/[taskId]/result/[resultId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFromS3 } from "@/lib/s3";
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
    // S3 URL — fetch
    const res = await fetch(result.resultKey);
    buffer = Buffer.from(await res.arrayBuffer());
  } else if (result.resultKey.includes("/")) {
    // Local path with S3 key pattern
    try {
      buffer = await downloadFromS3(result.resultKey);
    } catch {
      // Fallback to local
      const filePath = path.join(process.cwd(), "public", result.resultKey);
      buffer = await readFile(filePath);
    }
  } else {
    // Simple local path
    const filePath = path.join(process.cwd(), "public", "uploads", result.resultKey);
    buffer = await readFile(filePath);
  }

  return new NextResponse(buffer, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
```

- [ ] **Step 2: Type check and commit**

Run: `npx tsc --noEmit`

```bash
git add src/app/api/background-replace/[taskId]/result/
git commit -m "feat: add result image proxy route"
```

---

### Task 14: Final Integration Check & Polish

- [ ] **Step 1: Full build**

Run: `npx tsc --noEmit && npm run build`
Must succeed without errors.

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Check:
- [ ] `/background-replace` page loads (redirects to login if not authenticated)
- [ ] `/background-replace/new` page loads with 3-step wizard
- [ ] File upload works (drag-and-drop zone)
- [ ] Background selector switches between 3 modes
- [ ] Preset templates load from API
- [ ] Navigation shows "背景替换" link in header

- [ ] **Step 3: Test end-to-end with a real task**

1. Login with credentials
2. Navigate to /background-replace/new
3. Upload 2-3 test images
4. Select "预设模板" and pick a background
5. Submit task
6. Check that task appears in /background-replace list
7. Open task detail — results show as pending/processing
8. If worker is running, verify results complete

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish background replace feature"
```

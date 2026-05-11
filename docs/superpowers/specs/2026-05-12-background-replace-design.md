# Product Photo Background Replacement — Design Spec

> Target: Vinted/DEPOP 等平台店群卖家，需要大量"看起来不同"的产品照片绕过防重检测

## 1. Product Overview

**What**: 给产品照片（鞋子/服饰）替换背景，保留主体。同一组照片共用同一背景（角度微调），生成真实自然的变体照片。

**Who**: Vinted 等二手/新品平台的店群卖家，每天需要大量产品照片。

**Business Model**: 按张计费，¥0.10/张（=1 积分/张），从用户积分余额扣除。

**Core Differentiator**: 不是简单的抠图换背景，而是模拟"真实卖家在家随手拍"的效果——自然光线、家居环境、无明显合成痕迹。

## 2. System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  用户上传     │ →   │  Next.js API │ →   │  Redis Queue    │
│  N张原图     │     │  创建任务     │     │  (bg-replace)   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Railway Worker  │
                                          │  三步处理：       │
                                          │  ① 抠主体(RMBG)  │
                                          │  ② 合成背景       │
                                          │  ③ AI光影增强     │
                                          └────────┬────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │  S3 存储结果                │
                                    │  BgReplaceResult 写入DB    │
                                    │  扣减积分                   │
                                    └─────────────────────────────┘
```

Reuses existing: BullMQ + Redis + Railway Worker + S3 + Credit system.

## 3. Data Models

New tables in `prisma/schema.prisma`:

### BackgroundTemplate — preset background library
- id, name, category, fileUrl, thumbnailUrl, isActive, sortOrder

Categories: `indoor-floor`, `indoor-wall`, `indoor-desk`, `outdoor`, `creative`

### BgReplaceTask — one task = one group of photos
- id, userId, backgroundMode (`ai` | `preset` | `custom`)
- backgroundId (preset mode), customBgUrl (custom mode), aiPrompt (ai mode)
- imageCount, cost (total credits), status (`pending` | `processing` | `done` | `failed`)
- createdAt

### BgReplaceResult — per-image result
- id, taskId, originalUrl, resultUrl, backgroundUrl, status, error

## 4. Pages & Routes

| Route | Purpose |
|---|---|
| `/background-replace` | Main: new task CTA + history list |
| `/background-replace/new` | 3-step wizard: upload → pick bg → confirm |
| `/background-replace/[taskId]` | Results: before/after comparison, download |

### Step 2 — Background Modes
- **AI Smart Generate**: text prompt → AI generates indoor scene background
- **Preset Templates**: browse categorized library of real environment photos
- **Custom Upload**: user uploads their own background image

### Step 3 — Confirm
- Shows: image count, per-image cost, total credit deduction
- Checks balance; prompts recharge if insufficient

### Sidebar nav: add "背景替换" entry under "生成" section.

## 5. API Design

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/background-replace` | Create task (fileKeys + bgMode + bgSelection) |
| GET | `/api/background-replace` | Task list (paginated) |
| GET | `/api/background-replace/[taskId]` | Task detail with results |
| GET | `/api/background-templates` | List preset backgrounds |
| POST | `/api/upload` (extend existing) | Upload originals/custom bg to S3 |

### POST `/api/background-replace` Request
```typescript
{
  fileKeys: string[],
  backgroundMode: "ai" | "preset" | "custom",
  backgroundId?: string,
  customBgKey?: string,
  aiPrompt?: string,
}
```

### Credit Logic
- Validate user credits >= imageCount before creating task
- Pre-reserve credits (create pending CreditTransaction)
- Worker confirms deduction on success; refunds on failure

## 6. Worker Pipeline

```
for each original image:
  1. Download from S3 → temp file
  2. Background removal (RMBG-2.0 via Replicate) → transparent PNG
  3. Background prep:
     - preset: pick from library, random crop/zoom variation
     - custom: use uploaded bg, random crop/zoom variation
     - ai: SDXL text-to-image → generate room scene
  4. Composite: place subject on background
  5. AI polish: light color/lighting unification (IC-Light or color transfer)
  6. Upload result to S3
  7. Write BgReplaceResult record
Mark task done → deduct credits → notify user
```

All photos in a task share the SAME background. Variation comes from slight crop/zoom offsets per image.

## 7. Tech Stack

| Component | Technology |
|---|---|
| Background removal | RMBG-2.0 via Replicate API |
| AI background gen | SDXL / Flux via Replicate API |
| Lighting polish | IC-Light v2 or color transfer |
| Queue | BullMQ (existing Redis) |
| Worker runtime | Railway (existing) |
| Storage | AWS S3 (existing) |
| Frontend | Next.js 16 + shadcn/ui + Tailwind v4 |

## 8. Credit & Pricing

- 1 credit = ¥0.10
- 1 generated image = 1 credit
- Preset/Custom mode: flat 1 credit/image
- AI mode: 1 credit/image (AI bg generation cost absorbed into pricing)
- Premium backgrounds (curated seasonal sets) can be charged extra later

## 9. Non-functional

- **Security**: Auth-guard all API routes. Rate limit: 30 req/min per user.
- **Performance**: Worker processes images sequentially within a task. Target <30s per image.
- **Reliability**: Failed images refund credits. Task retry up to 2 times.
- **Mobile**: Upload and result viewing must work on mobile (sellers often use phones).

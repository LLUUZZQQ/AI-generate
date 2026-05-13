---
name: ai-saas-fullstack
description: >
  Build complete AI-powered SaaS applications from scratch. Covers: AI image processing
  pipelines (multi-model fusion, background replacement), full-stack Next.js architecture
  (Vercel + Railway + Supabase), premium dark-themed UI (glass morphism, bento grid, Framer
  Motion), admin panel with user management, credit system, onboarding tours, and smart
  presets. Use when user says "build me an AI website", "AI SaaS platform", "AI image
  processing tool", "background replacement service", "AI fusion pipeline", or wants to
  create any web app involving AI image/text/video processing with a production-grade
  architecture. Also trigger when the user asks for admin dashboards, user management
  panels, credit/billing systems, or dark-themed landing pages with glass design.
---

# AI SaaS Fullstack

Build production-grade AI-powered SaaS applications. Based on the FrameCraft project —
an AI product photo background replacement platform that went from zero to production.

## Architecture

```
Browser → Vercel (Next.js frontend + API)
              ↓ queries
          Supabase (PostgreSQL)
              ↓ polled by
          Railway (background worker)
              ↓ calls
          OpenRouter (GPT-5.4 / Gemini / Recraft)
              ↓ reads/writes
          Cloudflare R2 (S3-compatible storage)
```

## Project Setup

Start with Next.js + TypeScript + Tailwind + shadcn:

```bash
npx create-next-app@latest my-ai-saas --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
npx shadcn@latest init -d
npx shadcn@latest add button card input label select tabs dialog dropdown-menu avatar badge skeleton separator toast sonner
npm install @prisma/client @prisma/adapter-pg pg prisma
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage sharp
npm install three @react-three/fiber @react-three/drei framer-motion
npm install @tanstack/react-query lucide-react zod
npm install tsx -D
```

Create `prisma.config.ts`:
```ts
import { defineConfig, env } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
```

## Design System

### Colors
```css
:root {
  --background: #191421;
  --foreground: #f0f0f5;
  --primary: #b57bee;
  --border: rgba(255,255,255,0.055);
  --radius: 0.875rem;
}
```

Never pure black backgrounds. Text never pure white. Borders always subtle (0.06-0.08 opacity).

### Glass Cards
```css
.glass {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.5rem;
  backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.glass:hover {
  background: rgba(255,255,255,0.035);
  border-color: rgba(255,255,255,0.16);
  transform: translateY(-2px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
}
```

### Navigation
Floating pill header with backdrop blur:
```tsx
<header className="sticky top-3 z-50">
  <nav className="rounded-2xl border border-white/[0.06] bg-background/70 backdrop-blur-xl px-6 py-3">
```

### Landing Page Sections
Hero → Partner logos (marquee) → Trust stats → Features (bento) → How it works → Use cases → Before/After slider → Metrics bar → Closing CTA

### 3D Element
Use `@react-three/fiber` + `@react-three/drei` for a hero 3D logo. Keep in a wrapper client component with `dynamic(() => import(...), { ssr: false })`. Use Environment preset="city" and MeshPhysicalMaterial with clearcoat for frosted glass look.

## AI Pipeline

### Multi-Model Image Fusion

The core pipeline: user uploads product photo + selects background → AI blends naturally.

**Worker pattern — DB polling (simpler than Redis/BullMQ):**

```typescript
const POLL_INTERVAL = 3000;
async function poll() {
  const task = await prisma.bgReplaceTask.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  if (!task) return;
  await processTask(task);
}
setInterval(poll, POLL_INTERVAL);
```

**Model fallback chain:**
```
AI blend (Gemini/GPT-5.4) → traditional pipeline (remove.bg + composite)
```

**Prompt engineering for realism:**
The prompt must explicitly address: product preservation (colors, proportions, packaging), grounding (surface contact, shadows), lighting (direction, color temp), perspective (camera angle), depth of field, sensor noise, and quality level (phone photo, not studio). See the reference prompt in this skill for the exact wording.

**Size restoration after AI:**
AI models output fixed dimensions. After receiving the result, resize back to original product dimensions:

```typescript
if (origMeta.width && origMeta.height) {
  const aiMeta = await sharp(resultBuf).metadata();
  if (aiMeta.width !== origMeta.width || aiMeta.height !== origMeta.height) {
    resultBuf = await sharp(resultBuf)
      .resize(origMeta.width, origMeta.height, { fit: "contain" })
      .png().toBuffer();
  }
}
```

**Recraft model special handling:**
Recraft requires `modalities: ["image"]`, only one input image, and an `image_config` with `strength`. Pre-composite product onto background with sharp before sending.

### Image Storage — S3/R2

Always lazy-init the S3 client — don't construct at module level:

```typescript
let _client: S3Client | null = null;
export function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({...});
  }
  return _client;
}
```

Proxy all images through API routes — never expose S3 URLs:
```
GET /api/s3/[...key] → downloads from S3, serves with correct Content-Type
```

### Task Schema
```prisma
model BgReplaceTask {
  id             String   @id @default(cuid())
  userId         String
  backgroundMode String   @default("preset")
  backgroundId   String?
  customBgKey    String?
  aiPrompt       String?
  customPrompt   String?
  aiModel        String?
  imageCount     Int      @default(0)
  cost           Int      @default(0)
  status         String   @default("pending")
  createdAt      DateTime @default(now())
  results        BgReplaceResult[]
  @@index([userId, createdAt(sort: Desc)])
}

model BgReplaceResult {
  id          String  @id @default(cuid())
  taskId      String
  originalKey String
  resultKey   String?
  status      String  @default("pending")
  error       String?
  @@index([taskId])
}
```

### Credit System

Simple integer credits. Deduct before task creation. Record every transaction. Refund on cancel/failure.

## Frontend Features

### Task Creation Page (`/background-replace/new`)
Three-step wizard: Upload photos → Choose background → Confirm & submit.

- **Upload zone**: drag-and-drop, file preview, max 20 images
- **Background selector**: 3 tabs — My Presets / AI Generate / Custom Upload
- **My Presets**: saved backgrounds from localStorage, add/delete directly
- **Custom Upload**: drag-and-drop with visual feedback
- **Smart recommendation**: after upload, call vision API to analyze product and suggest matching backgrounds
- **Advanced settings** (collapsible): model selector (button toggle, not native select), custom prompt textarea
- **Batch processing**: multi-select backgrounds → one task per background × all product photos

### Task Detail Page (`/background-replace/[taskId]`)
- Auto-refreshing status with progress animation
- Cancel/pause buttons with confirmation dialog
- Result cards with before/after toggle, download, and regenerate
- Regenerate creates new task with same settings + confirmation prompt

### Dashboard (`/dashboard`)
- Stats grid (credits, month tasks, total processed, month spent)
- Quick presets from user's saved backgrounds
- Result gallery with hover controls
- Batch delete with floating action bar
- CSV export

### Settings (`/settings`)
- Two tabs: Account Info + Billing
- Account: editable name, email, role badge, registration date, credits, spending tier (铜/银/金/钻石)
- Change password: old + new with visibility toggle
- Billing: plan cards + transaction history

### Admin Panel (`/admin`)
- Auth guard: only role=admin can access
- Overview tab: stats cards, 7-day task chart with date range filter
- Users tab: search, CRUD, ban/unban, delete
- Edit modal: credits + role with styled select
- Show in nav only for admins

### Onboarding Tour
Trigger on first visit to task page. 3-step modal slides with progress dots. Skip saves to localStorage. Help button (labeled "教程") for replay.

### Regenerate
Re-submit same product + background as new task. Pass all original settings (backgroundMode, backgroundId, customBgKey, aiModel, customPrompt). Confirm dialog before creating.

## Auth & Security

### Registration
- Block disposable email domains (mailinator, 10minutemail, etc.)
- IP-based cooldown: 1 registration per IP per 24 hours
- Rate limit: 5 attempts per minute per IP

### Auth Guard
Check `banned` field on every API request:
```typescript
const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true } });
if (dbUser?.banned) throw new Error("BANNED");
```

### Login
Banned users blocked at login. Rate limited. Validate via own API first, then NextAuth signIn.

## Deployment

### Vercel
```bash
npm i -g vercel
vercel login
vercel --prod --yes
```
- Add `"postinstall": "prisma generate"` to package.json
- Use Supabase connection pooler (port 6543) for DATABASE_URL
- Migrations need direct URL (port 5432) — use `npx prisma db push` with DIRECT_URL

### Railway
- Start command: `npm run worker:bg`
- Worker must have HTTP server (keeps Railway from sleeping)
- `tsx` must be in `dependencies`, not `devDependencies`
- Set branch to `main` in Railway settings

### Supabase
- Singapore region for low latency
- Disable RLS (manage in app code)
- Pooler URL for app, direct URL for migrations

## Common Pitfalls

- S3 client at module level → env vars undefined at build time → lazy init
- `force-dynamic` on pages that query DB directly → prevents IPv6 build errors
- Chinese filenames on S3 → use English keys
- native `<select>` styling → use `appearance-none` + custom arrow, or button toggles
- `<option>` `bg-*` classes don't work cross-browser → don't style options
- Session JWT doesn't auto-refresh after DB credit changes → fetch real-time from API
- OpenRouter requires `sk-or-v1-` key format, not `sk-proj-`
- Worker port conflict when running multiple workers → catch EADDRINUSE

## Model Selection

Available on OpenRouter for image editing (text+image in → image out):

| Model | Price | Speed | Quality |
|---|---|---|---|
| `google/gemini-3.1-flash-image-preview` | ~free | fastest | good |
| `openai/gpt-5.4-image-2` | cheap | fast | best |

Recraft models (`recraft/recraft-v4`, `recraft/recraft-v4-pro`) need special handling
(see AI Pipeline section) and may not be fully supported through OpenRouter.

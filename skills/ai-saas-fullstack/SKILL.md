---
name: ai-saas-fullstack
description: >
  Build complete AI-powered SaaS applications from scratch. Covers: AI image processing
  pipelines (multi-model fusion, background replacement, style transfer), full-stack Next.js
  architecture (Vercel + Railway + Supabase + Cloudflare R2), AI platform evaluation and
  switching (OpenRouter, EvoLink, NanoBanana), prompt engineering patterns (evolution from
  rules to photographic language, style transfer, intensity pitfalls), premium dark-themed
  UI (glass morphism, before/after slider, share cards, gallery, batch upload), feature
  development workflow (MVP → polish → cleanup), sync vs async AI patterns, deployment
  reality (Vercel auto-deploy unreliability, multi-platform env vars), database ad-hoc
  migrations, admin panel, credit system, payment integration (WeChat QR manual flow for
  Chinese market), and silent failure debugging. Use when user says "build me an AI
  website", "AI SaaS", "AI image processing", "add AI feature to my site", "background
  replacement", "style transfer", "AI platform evaluation", "prompt engineering for
  images", "how to improve AI output quality", or wants to create any production AI
  application. Also trigger for AI API troubleshooting, feature optimization cycles,
  and deployment debugging.
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

## AI Platform Selection

When choosing an AI API platform, test systematically before committing:

### Evaluation Checklist
For each candidate platform, verify:
1. Does it output images? (Many "OpenAI-compatible" proxies are text-only)
2. What models are actually available? (Proxy may advertise but not support)
3. Test with the simplest possible prompt first — "Generate a red circle"
4. Test with your actual use case prompt
5. Check error messages carefully — "prompt rejected" ≠ "API broken"

### Platform Outcomes

| Platform | Image Output? | Cost Model | Verdict |
|----------|--------------|------------|---------|
| **OpenRouter** | Yes (multimodal) | Per-token | Best for image generation |
| **EvoLink.AI** | No (text-only) | Monthly | Cannot do image tasks |
| **NanoBanana API** | Yes (async task) | Per-request | Works but Gemini safety filters block commercial products |

### Key Lessons
- **Async task APIs** (POST → taskId → poll → download): require completely different code than OpenAI-compatible chat APIs. The polling loop needs per-iteration error handling, timeout limits, and URL encoding for taskId.
- **Image URLs vs base64**: Some platforms accept only real HTTP URLs (not data URIs). In that case, upload images to S3 first and pass the public URL through your own domain proxy (`/api/s3/[key]`), never expose S3 endpoint directly.
- **Safety filters**: Google Gemini has strict content filtering. Commercial product images may be rejected even if the prompt is innocuous. This is not a code bug — it's a platform limitation.
- **Test fast, fail fast, move on**: We spent 6+ iterations debugging NanoBanana before confirming the root cause was Gemini's safety filter, not our code. Limit platform evaluation to 3 attempts before deciding.

### Platform Switching Pattern
When switching platforms, change exactly 3 things:
1. `baseUrl` — the API endpoint
2. `apiKey` — the auth credential
3. Model name prefix (e.g., strip `google/` for some proxies)

Keep the rest of the code identical. This makes rollback trivial.

## Prompt Engineering

### The Evolution That Worked

**❌ Don't: Over-specify quality requirements**
Rule lists with "add noise", "smartphone quality", "NOT overly sharp" will degrade output.

**❌ Don't: Use "composite" or "place" in the prompt**
These words tell the AI to do pixel-level compositing, which it cannot do precisely. Use "photograph" language instead.

**✅ Do: Use photographic language**
Frame as "generating a photograph where the product is in this scene" rather than "compositing product onto background."

**✅ Do: Keep prompts concise**
Gemini Flash works best with 3-6 bullet points. GPT-5.4 can handle 8-10 structured rules. Overly long prompts (16+ bullet points per style) degrade quality.

### Style Transfer Pattern (Pet Portrait)
For AI style transfer features, each style needs exactly one sentence:
```text
Transform this pet into a [STYLE]. [2-3 visual keywords]. Keep the face and features recognizable.
```

The magic phrase is: **"Keep the [subject]'s [features] recognizable and faithful to the original."** Without it, the AI loses the subject's identity.

### Intensity WARNING
Extra modifiers like "Apply subtle treatment" or "Full artistic transformation" bleed across styles. One modifier contaminated all 16 styles toward "oil painting." **Do not append intensity modifiers to style prompts.** Let each style prompt stand alone.

### Prompt Architecture Decision
There are only two viable architectures:

| Approach | When to Use | Tradeoff |
|----------|------------|----------|
| **Dual-image** (product + background → AI → result) | AI model is strong enough to handle everything | AI controls size/position (unreliable) |
| **Single-image refinement** (sharp pre-composite → AI → polished) | Need precise control over size/placement | Requires extra pre-processing step, needs background removal |

Neither is universally better. Test both on your specific use case.

## Feature Development Workflow

### Adding a New AI Feature (Pet Portrait Case Study)

**Phase 1: Minimal Viable (30 min)**
- One API route calling AI directly (synchronous, not worker)
- One page with upload + style selector + result display
- Hardcode 6 styles, use existing /api/upload
- Test immediately on production

**Phase 2: Polish (2 hours)**
- Expand to 16 styles with preview cards
- Add multi-image generation (1-4 parallel requests)
- Before/after comparison slider
- Download + share card generation (Canvas API)
- Favorites (localStorage) + history (DB table)

**Phase 3: Cleanup (30 min)**
- Remove underperforming models (Flux — looked worse than Gemini)
- Remove harmful options (intensity — caused style bleed)
- Fix silent failures (history table not existing on production DB → add error logging)

### Sync vs Async for AI Features
- **Synchronous API** (Vercel serverless): best for single-image generation, quick turnaround (<60s). User waits but gets immediate result.
- **Async Worker** (Railway): best for batch processing, multi-step pipelines, long-running tasks. User polls or gets notification on completion.

Pet portrait uses synchronous. Background replacement uses async worker. Choose based on expected processing time.

## Deployment Reality

### Vercel Auto-Deploy May Not Work
GitHub push → Vercel auto-deploy is unreliable. Always verify with `vercel list` after pushing. If the latest deployment age > push time, manually trigger:
```bash
npx vercel --prod
```
This was the root cause of multiple "I don't see the changes" issues.

### Environment Variables Must Be Set on BOTH Platforms
- Vercel: for all API routes running as serverless functions
- Railway: for the worker running as a long-lived process
- Missing `NEXT_PUBLIC_URL` on Railway → URLs constructed as `http://localhost:3000` in production

### Verifying Deployment
After any deployment, confirm the change made it:
1. Check `vercel list` — latest should be <2 min old
2. Hard refresh browser (Ctrl+Shift+R)
3. If still old, check browser DevTools → Network → disable cache
4. Curl the page to verify server-side content

## Database Ad-Hoc Migrations

When Prisma schema doesn't have a table you need:

1. Create via direct script using the production connection:
```bash
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
await p.\$executeRawUnsafe(\`CREATE TABLE IF NOT EXISTS my_table (...)\`);
await p.\$disconnect();
"
```

2. **IMPORTANT**: Local `.env` must point to production DB for this to work. Verify with `echo $DATABASE_URL` first.

3. Always add error logging around raw SQL — silent catch blocks hide table-not-exist errors.

4. Add the table to `.env.example` notes so future developers know it exists.

## New Frontend Patterns

### Batch Upload UI
```tsx
const [files, setFiles] = useState<File[]>([]);
// Multi-select input → append to array
// Horizontal scrollable thumbnail row with remove buttons
// "Add more" button while under max limit
```

### Before/After Comparison Slider
CSS-only implementation: two stacked images, clip-path controlled by mouse/touch position:
```tsx
<div onMouseMove={e => setPos((e.clientX - rect.left) / rect.width * 100)}>
  <img src={after} /> {/* full width — shown on right side */}
  <div style={{ width: `${pos}%`, overflow: 'hidden' }}>
    <img src={before} style={{ minWidth: `${100/(pos/100)}%` }} /> {/* shown on left */}
  </div>
  <div style={{ left: `${pos}%` }} /> {/* draggable divider line */}
</div>
```

### Share Card Generation (Canvas API)
Generate branded share images client-side — no server needed:
```typescript
const canvas = document.createElement('canvas');
canvas.width = 1200; canvas.height = 1600;
const ctx = canvas.getContext('2d')!;
// Draw background, image, title, brand watermark
// Export: canvas.toBlob() → ClipboardItem → navigator.clipboard.write()
```

### Progress Tracking for Parallel Generation
```tsx
const [progress, setProgress] = useState({ current: 0, total: 0 });
// Upload phase: setProgress({ current: i + 1, total: files.length })
// Generate phase: show indeterminate spinner
// Use a progress bar: <div style={{ width: `${(current/total)*100}%` }} />
```

### Gallery Modal Pattern
Full-screen overlay with grid of all historical results:
- Filter tabs (All / Favorites)
- Hover overlay with action buttons (download, favorite, share)
- Click outside to close
- Load images lazily

### Silent Failure Pattern
Never do this:
```typescript
try { await db.query(); } catch {} // 👎 hides all errors
```
Always do this:
```typescript
try { await db.query(); } catch (e) { console.error("context:", e.message); } // 👍

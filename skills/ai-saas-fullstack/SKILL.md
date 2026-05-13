---
name: ai-saas-fullstack
description: >
  Build production-ready AI-powered SaaS applications with premium visual design.
  Use this skill whenever the user wants to build an AI website, AI SaaS product,
  AI tool platform, or any web app that involves AI processing (image, text, video,
  audio). Also trigger when the user mentions "AI 网站", landing page design, dashboard
  design, AI pipeline, or wants to deploy a full-stack AI application. Covers the
  complete lifecycle: visual design system, AI processing pipeline, dashboard/admin
  panel, and multi-platform deployment (Vercel + Railway + Supabase + S3).
---

# AI SaaS Fullstack Guide

Build production-ready AI SaaS applications. Based on patterns proven across multiple shipped AI products.

## Design System

### Color & Typography

Use a **deep dark background** with a single accent color for a premium, focused feel. The background should never be pure black — a dark purple-black or blue-black reads as intentional and polished.

```css
:root {
  --background: #191421;       /* deep purple-black, not #000 */
  --foreground: #f0f0f5;       /* soft white, never pure #fff for text */
  --primary: #b57bee;          /* single accent — purple works for AI/creative */
  --border: rgba(255,255,255,0.055);  /* subtle borders, never harsh */
  --radius: 0.875rem;          /* large default radius */
  --font-sans: "Inter", system-ui, sans-serif;
}

body {
  letter-spacing: -0.011em;    /* tighter tracking for modern feel */
}
```

Key principles:
- One accent color throughout the entire site. Don't use multiple competing accent colors.
- Text is never pure white — use `#f0f0f5` for primary, `rgba(255,255,255,0.3)` for secondary.
- Borders are always subtle — `rgba(255,255,255,0.06)` to `0.08` range.
- Large border-radius everywhere (0.75rem minimum for cards).

### Ambient Background

Always add a subtle ambient glow behind the page content. This makes the dark background feel alive rather than flat:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image:
    radial-gradient(ellipse 80% 60% at 50% -20%, rgba(181,123,238,0.06), transparent 70%),
    radial-gradient(ellipse 50% 40% at 80% 70%, rgba(96,165,250,0.03), transparent 60%);
  pointer-events: none;
}
```

Optionally add a subtle grain texture overlay:
```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,..."); /* SVG noise filter */
  pointer-events: none;
}
```

### Glass Cards (Glass Morphism)

The `.glass` class is the core building block for cards, sections, and panels:

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
  box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(181,123,238,0.08);
}
```

Use `.glass` for: feature cards, step content containers, metrics bars, showcase frames, and settings sections. The hover float effect (`translateY(-2px)`) makes the page feel responsive and premium.

### Gradient Text

For headlines that need emphasis, use a gradient that stays within the accent color family:

```css
.gradient-text {
  background: linear-gradient(135deg, #d4b8f0 0%, #b57bee 40%, #f0a0c0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Limit gradient text to 2-3 words per section. Overuse dilutes the effect.

### Bento Grid Layout

Bento grids (cards of varying sizes in a masonry-like layout) are the standard pattern for SaaS feature showcases:

```tsx
{/* 2/3 + 1/3 row */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
  <div className="md:col-span-2 glass p-6">{/* Large card */}</div>
  <div className="glass p-6">{/* Small card */}</div>
</div>

{/* 4-column row with mixed spans */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="md:col-span-2 glass p-6">{/* Half-width */}</div>
  <div className="glass p-6">{/* Quarter */}</div>
  <div className="glass p-6">{/* Quarter */}</div>
  <div className="glass p-6">{/* Quarter */}</div>
  <div className="md:col-span-2 glass p-6">{/* Half-width */}</div>
</div>
```

Gap should be `gap-4` (1rem) consistently. Cards should use `.glass` class. Mix card widths to create visual interest.

### Navigation

Use a **floating pill-shaped header** that sits slightly below the top of the viewport:

```tsx
<header className="sticky top-3 z-50 mx-auto max-w-2xl">
  <nav className="rounded-2xl border border-white/[0.06] bg-background/70 backdrop-blur-xl px-6 py-3">
    {/* Logo + nav links */}
  </nav>
</header>
```

The `top-3` offset with backdrop blur creates a floating island effect. Keep the nav minimal — 3-4 links max, plus logo and CTA button.

### Scroll Animations

Animate content as it scrolls into view using Framer Motion:

```tsx
// scroll-reveal.tsx
import { motion, useInView } from "framer-motion";

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", stiffness: 100, damping: 20, mass: 0.8 }}
    >
      {children}
    </motion.div>
  );
}
```

Spring transitions feel more alive than ease-out. `stiffness: 100, damping: 20` is a good universal preset.

### 3D Interactive Element

A Three.js/R3F element (logo, icon, or abstract shape) in the hero section signals "AI/tech" immediately:

- Use `@react-three/fiber` + `@react-three/drei`
- MeshPhysicalMaterial with clearcoat for a frosted glass look
- Continuous slow rotation + mouse-driven parallax
- Float animation for subtle breathing effect
- Environment map (`preset="city"`) for realistic reflections
- Add floating particles (points with AdditiveBlending) around the object
- Keep the Canvas in a wrapper component — server components cannot contain R3F directly

Important: ALL Three.js types must use `any` in TypeScript to avoid namespace import issues with Next.js dynamic imports. Create the Canvas in a wrapper client component, never directly in a server component.

### Partner/Trust Section

Show social proof between the hero and features:

1. **Platform logo marquee** — auto-scrolling row of platform names where the product is used. Use CSS `@keyframes marquee` for smooth infinite scroll. Duplicate the content for seamless looping. Add gradient fade edges with `mask-image` or pseudo-elements.

2. **Trust stats** — 3 numbers in a row: users served, items processed, success rate. Use gradient text for the numbers. Keep the font size large (text-xl) but the labels tiny (text-[10px]).

### Before/After Compare Slider

Essential for visual AI products. Let users see the transformation:

- Drag-based slider with a divider line
- Auto-play animation (sine wave, 5s cycle, pauses on interaction)
- Resume auto-play after 4 seconds of inactivity
- Glass handle knob with glow shadow
- Labels (before/after) as floating badges
- Play/pause toggle visible on hover
- Use `requestAnimationFrame` for smooth animation

## AI Processing Pipeline

### Architecture

```
Browser → Vercel (Next.js API) → S3/R2 (file storage)
                ↓
         Database (task + result records)
                ↓
         Railway (background worker, DB polling)
                ↓
         AI Service (Remove.bg, HuggingFace, OpenAI, etc.)
                ↓
         S3/R2 (processed results) → Proxy API → Browser
```

### File Upload → S3

Use Cloudflare R2 (S3-compatible, free egress). The S3 client MUST use lazy initialization — reading env vars at module load time will be `undefined` on Vercel's build environment:

```typescript
// lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

export async function uploadToS3(key: string, body: Buffer, contentType: string) {
  const s3 = getS3Client();
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}
```

Never use module-level `new S3Client({...})` — it captures env vars at build time when they don't exist yet.

### Image Proxy

Never expose S3 URLs directly to the browser. Route all images through an API proxy:

```
GET /api/s3/[...key] — downloads from S3, serves with proper Content-Type
GET /api/background-replace/[taskId]/result/[resultId] — result-specific proxy with cache headers
```

The proxy approach lets you add auth checks, set Cache-Control headers, and keep your S3 bucket private.

### Database Schema Pattern

For AI tasks, use a two-level model: Task (the request) → Results (individual outputs):

```prisma
model BgReplaceTask {
  id             String   @id @default(cuid())
  userId         String
  backgroundMode String   @default("preset")  // ai | preset | custom
  backgroundId   String?
  imageCount     Int      @default(0)
  cost           Int      @default(0)
  status         String   @default("pending")  // pending | processing | done | failed
  createdAt      DateTime @default(now())
  results        BgReplaceResult[]
}

model BgReplaceResult {
  id          String  @id @default(cuid())
  taskId      String
  originalKey String   // S3 key of uploaded image
  resultKey   String?  // S3 key of processed image (null until done)
  status      String  @default("pending")
  error       String?
  createdAt   DateTime @default(now())
}
```

### Credit System

Simple integer-based credit system per user:

- `User.credits` (int) — current balance
- `CreditTransaction` — every deduction and recharge is recorded
- Charge credits BEFORE creating the task (prevents race conditions)
- Show credit cost clearly: "1 credit per image" / "¥0.10 per image"

### Worker Pattern (DB Polling)

For most AI SaaS projects, **DB polling is simpler and more reliable than Redis/BullMQ**:

```typescript
// workers/bg-replace-worker.ts
import http from "http";

const POLL_INTERVAL = 3000; // 3 seconds

async function poll() {
  const task = await prisma.bgReplaceTask.findFirst({
    where: { status: "pending" },
    include: { results: true },
    orderBy: { createdAt: "asc" },
  });
  if (!task) return;
  await processTask(task);
}

// HTTP server — CRITICAL for Railway
const server = http.createServer((_req, res) => {
  res.writeHead(200).end("OK");
});
server.listen(process.env.PORT || 3000);

setInterval(poll, POLL_INTERVAL);
```

Why DB polling over Redis:
- No Redis dependency (one less service to manage and pay for)
- No connection issues across platforms (Vercel ↔ Upstash ↔ Railway)
- Simpler debugging (everything is in the database)
- For < 100 tasks/minute, polling at 3s intervals is perfectly fine
- The HTTP server keeps Railway from sleeping the deployment

### AI Service Fallback Pattern

Always implement a primary → secondary fallback for AI APIs:

```typescript
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  // Primary: Remove.bg API (commercial, reliable, fast)
  try {
    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": process.env.REMOVEBG_API_KEY! },
      body: formData,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn("Remove.bg failed, falling back to HuggingFace");
  }

  // Fallback: HuggingFace Inference (free tier, slower, less reliable)
  const hf = new HfInference(process.env.HF_TOKEN);
  const blob = await hf.imageBackgroundRemoval({ model: "briaai/RMBG-2.0", data: imageBuffer });
  return Buffer.from(await (blob as Blob).arrayBuffer());
}
```

Key principles:
- Try the paid/fast service first, fall back to free
- Log all fallbacks so you know when your primary is down
- Lazy-init API clients (don't construct them at module level)

### Image Composition

When compositing a processed subject onto a new background with sharp:

```typescript
import sharp from "sharp";

async function compositeImages(subjectBuf: Buffer, bgBuf: Buffer): Promise<Buffer> {
  const subject = sharp(subjectBuf);
  const subjectMeta = await subject.metadata();

  // Keep subject at original size
  // Scale background to match or slightly larger
  const bg = await sharp(bgBuf)
    .resize({ width: subjectMeta.width, height: subjectMeta.height, fit: "cover" })
    .toBuffer();

  // Add shadow for depth
  const shadow = await sharp(subjectBuf)
    .resize(Math.floor(subjectMeta.width! * 0.9), Math.floor(subjectMeta.height! * 0.85))
    .blur(15)
    .modulate({ brightness: 0.1 })
    .toBuffer();

  return sharp(bg)
    .composite([
      { input: shadow, gravity: "south", blend: "over" },
      { input: subjectBuf, blend: "over" },
    ])
    .png()
    .toBuffer();
}
```

## Dashboard / Admin Panel

### Layout Pattern

The dashboard should have these sections, in this order:

1. **Header** — User greeting + Export button + New Task CTA
2. **Stats Grid** — 4 cards in a 2x2 or 4-column grid: Credits, Month Tasks, Total Processed, Month Spent
3. **Quick Templates** — 4 template cards in a row, each linking to new-task with template preset
4. **Result Gallery** — 6-column grid of recent completed results (12 items), each linking to task detail
5. **Task List** — Recent tasks with: hover-to-reveal checkboxes, batch delete, status badges, cost info

### Stats API

Create a dedicated stats endpoint that aggregates everything in one query:

```
GET /api/user/stats → { totalTasks, totalImages, monthTasks, monthSpent, todayTasks, completedTasks, recentResults[] }
```

One API call per dashboard load, not one per card.

### Batch Operations

- Hover reveals a checkbox on each task row
- Checking any task shows a floating action bar at the bottom
- The action bar uses `glass` styling with `backdrop-blur-xl`
- Support: select all, deselect all, delete selected, download selected
- Confirm destructive actions with `window.confirm()`

### CSV Export

Generate CSV client-side from existing task data — no additional API needed:

```typescript
const exportCSV = () => {
  const header = "日期,图片数,背景模式,消耗积分,状态\n";
  const rows = tasks.map((t: any) =>
    `${new Date(t.createdAt).toLocaleDateString("zh-CN")},${t.imageCount},${t.backgroundMode},${t.cost},${t.status}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "export.csv"; a.click();
  URL.revokeObjectURL(url);
};
```

## Deployment

### Architecture

```
Vercel (Next.js frontend + API routes)
    ↓ queries
Supabase (PostgreSQL, connection pooler port 6543)
    ↓ polled by
Railway (background worker, HTTP server for wake-up)
    ↓ reads/writes
Cloudflare R2 (S3-compatible object storage)

Optional: Upstash Redis (only if > 100 tasks/minute or need real-time queues)
```

### Vercel

- Always add `"postinstall": "prisma generate"` to `package.json` scripts
- Use Supabase connection pooler URL (port 6543) for `DATABASE_URL` — direct connection (port 5432) resolves to IPv6 which Vercel's build environment can't reach
- Server components that query DB must use `export const dynamic = "force-dynamic"` or route to API endpoints
- Use `suppressHydrationWarning` on `<html>` tag

### Railway Workers

- Workers must have an HTTP server alongside them — Railway sleeps deployments with no HTTP traffic
- Set a start command: `npm run worker:all` (or equivalent)
- Ensure `tsx` is in `dependencies`, not `devDependencies` (Railway uses `--production` install)
- Branch must be set to `main` in Railway settings

### Supabase

- Use Singapore region (`ap-southeast-1`) for lowest latency from China
- Disable RLS (Row Level Security) — manage permissions in application code
- Connection pooler URL always for the app, direct URL only for schema migrations

### Environment Variables

Required across all platforms:

```
DATABASE_URL   — Supabase pooled connection (port 6543)
DIRECT_URL     — Supabase direct connection (port 5432)
S3_ENDPOINT    — Cloudflare R2 endpoint
S3_BUCKET      — R2 bucket name
S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
S3_PUBLIC_URL  — R2 public URL (or proxy through your API)
AUTH_SECRET    — NextAuth secret
REMOVEBG_API_KEY — Primary AI service
HF_TOKEN       — HuggingFace fallback
```

## Common Pitfalls

### Next.js 16 + Prisma 7

- Prisma 7 requires `@prisma/adapter-pg` + `prisma.config.ts` with `env('DATABASE_URL')`
- Avoid `ssr: false` with `next/dynamic` in Server Components — create wrapper client components instead
- `force-dynamic` on DB-queried pages to prevent build-time pre-rendering failures

### S3 on Vercel

- NEVER construct S3 client at module level — env vars are `undefined` during build
- ALWAYS use lazy initialization (getter function pattern)

### Chinese Filenames

- Chinese filenames cause S3 404 on some platforms (URL path extraction issues)
- Always rename files to English/ASCII before uploading to S3

### Railway Worker

- Must have HTTP server (keeps deployment alive)
- Branch must be `main` — deploying a feature branch causes "Missing script" errors
- Use DB polling unless you genuinely need real-time processing at scale

### Auth

- With JWT strategy, session callback receives `token` not `user`
- Never allow login without password validation
- Validate credentials via own API before calling `signIn()` to avoid redirect issues

### Design Consistency

- All pages use the same design tokens (colors, radius, font, glass class)
- All buttons use `rounded-full` or `rounded-xl` — never square corners
- All input fields use the same border/background/radius
- Card hover effects are consistent throughout: float up + border brighten + box shadow

## Landing Page Section Order

The proven section order for SaaS landing pages:

1. **Hero** — 3D element (left) + headline + CTA (right)
2. **Partner logos** — auto-scrolling marquee
3. **Trust stats** — 3 numbers (users, items processed, success rate)
4. **Features** — Bento grid with glass cards, include a browser-frame mockup with animated workflow
5. **How it works** — 3 steps with large number overlays
6. **Use cases** — Bento grid targeting specific user segments
7. **Before/After showcase** — CompareSlider with auto-play (for visual AI products)
8. **Metrics bar** — 3 key numbers (price, speed, variety)
9. **Closing CTA** — magnetic button, same gradient as hero CTA

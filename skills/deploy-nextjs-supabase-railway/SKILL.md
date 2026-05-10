---
name: deploy-nextjs-supabase-railway
description: >
  Deploy a Next.js application with Supabase (PostgreSQL) and Railway (background workers).
  Use this skill whenever the user wants to deploy a Next.js app to production, set up a cloud
  database, run background workers, or mentions Vercel/Supabase/Railway deployment. Also trigger
  when the user hits build errors on Vercel, database connection issues on deployment, or needs
  to configure environment variables across platforms.
---

# Deploy Next.js + Supabase + Railway

Deploy a three-tier Next.js application:
- **Vercel** — frontend + API routes (serverless)
- **Supabase** — PostgreSQL database (managed, free tier)
- **Railway** — background workers (long-running BullMQ consumers)

## Prerequisites Check

Always verify these first:

```bash
node --version   # >= 18
npm --version
git remote -v    # must have GitHub remote
```

If the project uses Prisma 7, verify `@prisma/adapter-pg` and `pg` are in dependencies (not devDependencies).

## Phase 1: Database → Supabase

### 1.1 Create Project

User goes to https://supabase.com → New Project → Fill in:
- **Region**: ap-southeast-1 (Singapore, lowest latency from China)
- **Database Password**: Ask user to set one and remember it
- **Enable RLS**: UNCHECK — we manage permissions in application code

### 1.2 Get Connection Strings

After creation, user navigates: Project → Settings (gear icon) → Database → Connection string → URI tab.

Two connection strings are needed:

```
# Pooled connection (for the app — PgBouncer handles connection pooling)
DATABASE_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations — bypasses PgBouncer)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres"
```

**Critical**: The password must be URL-encoded. Special characters like `*` → `%2A`, `,` → `%2C`. Supabase sometimes wraps the password in brackets `[password]` in the UI — the brackets are display formatting, NOT part of the password.

### 1.3 Push Schema and Seed

```bash
# Push schema (use DIRECT_URL for migrations)
npx prisma generate
DATABASE_URL="<DIRECT_URL>" npx prisma db push
npx tsx prisma/seed.ts
```

If `prisma db push` hangs, the connection pooler URL is being used. Always use the direct URL for schema operations.

### 1.4 Set Env Vars Locally

Update `.env`:
```
DATABASE_URL="<pooled-connection-string>"
DIRECT_URL="<direct-connection-string>"
```

The `.env` file is gitignored — it stays local. For deployment, env vars go to Vercel and Railway separately.

## Phase 2: Frontend → Vercel

### 2.1 Install CLI and Login

```bash
npm i -g vercel
vercel login
```

Vercel CLI opens a browser for OAuth. If in non-interactive mode, user must visit the device URL manually.

### 2.2 Pre-Flight Fixes

Before deploying, apply these fixes to avoid common build errors:

**Fix 1: Prisma Client must be generated during build**

Add to `package.json` scripts:
```json
"postinstall": "prisma generate"
```

**Fix 2: Move tsx to dependencies (not devDependencies)**

Railway uses `npm install --production` which strips devDependencies. If tsx is a devDep, `tsx src/workers/*.ts` will fail with "command not found".

**Fix 3: Prisma 7 requires adapter and prisma.config.ts**

Ensure `src/lib/db.ts` uses the PrismaPg adapter:
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

Ensure `prisma.config.ts` exists with:
```typescript
import { defineConfig, env } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
```

**Fix 4: Server components that query DB must use `force-dynamic`**

Vercel pre-renders pages at build time. If a page directly uses Prisma (e.g., landing page), add:
```typescript
export const dynamic = "force-dynamic";
```

Otherwise get: `Error: connect ENETUNREACH <ipv6-address>` (Supabase IPv6 unreachable during build).

**Fix 5: Suppress hydration warnings from browser extensions**

Add `suppressHydrationWarning` to `<html>` tag:
```tsx
<html lang="zh-CN" suppressHydrationWarning>
```

**Fix 6: BullMQ queue names cannot contain colons**

Use `image-queue`, `video-queue`, `trend-queue`, `swap-queue`, `suggest-queue` — hyphens, not colons.

### 2.3 Deploy

```bash
vercel --prod --yes
```

If "Detected linked project does not have id" error:
```bash
vercel link --yes
vercel --prod --yes
```

### 2.4 Set Environment Variables on Vercel

```bash
vercel env add <VAR_NAME> production
# Paste value when prompted
```

Required vars:
- `DATABASE_URL` (pooled Supabase URL)
- `REDIS_URL` (Upstash or other Redis)
- `AUTH_SECRET` (random string)
- `OPENAI_API_KEY` (if using AI)
- `REPLICATE_API_TOKEN` (if using Replicate)
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (if using GitHub OAuth)
- `WORKER_URL` (Railway deployment URL, for waking workers)

## Phase 3: Workers → Railway

### 3.1 Worker Entry Point

Create `src/workers/index.ts` that starts all workers AND runs an HTTP server:

```typescript
import http from "http";
// Import all workers (side-effect imports that register BullMQ consumers)
import "./image-worker";
import "./video-worker";
import "./swap-worker";
import "./suggestion-worker";

const PORT = parseInt(process.env.PORT || "3000");
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let idleTimer: ReturnType<typeof setTimeout> | null = null;
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => process.exit(0), IDLE_TIMEOUT);
}

const server = http.createServer((_req, res) => {
  resetIdleTimer();
  res.writeHead(200).end("OK");
});

server.listen(PORT, () => {
  console.log(`Worker listening on ${PORT}`);
  resetIdleTimer();
});
```

The HTTP server is CRITICAL for Railway:
- Railway auto-sleeps deployments with no HTTP traffic
- The worker dies after 5 idle minutes (saves compute)
- The Vercel API pings `WORKER_URL` after queueing jobs to wake it

### 3.2 Deploy to Railway

User goes to https://railway.app → GitHub login → New Project → Deploy from GitHub.

After initial deploy, configure:
- **Settings → Start Command**: `npm run worker:all`
- **Settings → Branch**: `main` (NOT feat/xxx)
- **Variables**: Same env vars as Vercel

The `worker:all` script in package.json:
```json
"worker:all": "npx prisma generate && tsx src/workers/index.ts"
```

### 3.3 Railway Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `npm error Missing script: "worker:all"` | Deploying wrong branch | Settings → Branch → `main` |
| `sh: tsx: command not found` | tsx in devDependencies | Move to dependencies |
| `Cannot find module '.prisma/client'` | No postinstall generate | Add `"postinstall": "prisma generate"` |
| Worker runs then dies instantly | No HTTP server | Add the HTTP server from 3.1 |

### 3.4 Wake Workers from Vercel

In the generate API route, fire-and-forget a ping after queueing a job:

```typescript
// Wake up Railway worker
if (process.env.WORKER_URL) {
  fetch(process.env.WORKER_URL).catch(() => {});
}
```

Railway takes 30-60 seconds to cold-start from sleep. The job waits in Redis queue until the worker comes online.

## Post-Deploy Verification

1. Open production URL — landing page loads without errors
2. Register/login works (both GitHub and credentials)
3. Navigate to /trends — data loads from Supabase
4. Submit a generation request — task appears in /library
5. Check Railway logs — worker picked up the job

## Architecture Summary

```
Browser → Vercel (Next.js) → Supabase (PostgreSQL)
                ↓
         Redis (Upstash)
                ↓
         Railway (Workers) ← wakes on HTTP ping
```

---
name: nextjs-production-checklist
description: >
  Production hardening checklist for Next.js applications. Use when the user says "is it ready for production",
  "check my Next.js app", "production checklist", "deploy checklist", or mentions specific issues like
  hydration errors, auth problems, API rate limiting, security concerns, or mobile responsiveness.
  Also trigger when the user has finished building a Next.js app and is about to deploy.
---

# Next.js Production Checklist

Systematic hardening checklist covering the 15 most common issues encountered when shipping Next.js apps to production.

## 1. Hydration Errors

**Symptom**: Console error about server/client HTML mismatch at `<html>` tag, mentioning `data-immersive-translate-*` or similar attributes.

**Cause**: Browser extensions modify DOM before React hydrates.

**Fix**: Add `suppressHydrationWarning` to the root `<html>` tag:
```tsx
<html lang="zh-CN" suppressHydrationWarning>
```

Also check for: `Date.now()`, `Math.random()`, locale-dependent formatting in server components. These cause mismatches.

## 2. Auth: Session Callbacks in JWT Mode

**Symptom**: User logs in but `session.user.credits` is undefined. Header shows "登录" instead of user nav.

**Cause**: With `session: { strategy: "jwt" }`, the `session` callback receives `({ session, token })`, NOT `({ session, user })`. The `user` parameter only exists with database sessions.

**Fix**:
```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.credits = (user as any).credits;
    }
    return token;
  },
  async session({ session, token }) {
    return {
      ...session,
      user: { ...session.user, id: token.id as string, credits: token.credits as number },
    };
  },
}
```

## 3. Auth: Credentials Login Without Password

**Symptom**: Any email can login with any password, even without registering.

**Cause**: The credentials provider's `authorize` function has a fallback path for "users without password" (meant for GitHub-only users). This allows anyone to login with random passwords.

**Fix**: Require password validation for ALL credentials login:
```typescript
async authorize(credentials) {
  const email = credentials?.email as string;
  const password = credentials?.password as string;
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return null; // Must have password

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return user;
}
```

## 4. Auth: Login Failure Redirects Instead of Showing Error

**Symptom**: When login fails, page redirects to home instead of showing inline error.

**Cause**: NextAuth's `signIn` function can trigger redirects even with `redirect: false` in certain conditions.

**Fix**: Validate credentials via a separate API endpoint BEFORE calling `signIn`:
```typescript
// Step 1: Validate via own API
const checkRes = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
const check = await checkRes.json();
if (check.code !== 0) { setError(check.message); return; }

// Step 2: Only call signIn if valid
const result = await signIn("credentials", { email, password, redirect: false });
```

## 5. Auth: PrismaAdapter Requires OAuth Tables

**Symptom**: GitHub OAuth redirects to "Server error" page.

**Cause**: `PrismaAdapter` needs `Account`, `Session`, `VerificationToken` tables in the schema. Without them, OAuth callbacks fail.

**Fix**: Add these models to `schema.prisma`:
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  // ... other fields
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("accounts")
}
// Same for Session and VerificationToken
```

**Better approach**: Skip PrismaAdapter entirely for OAuth. Handle user creation in the `signIn` callback:
```typescript
async signIn({ user, account }) {
  if (account && account.provider !== "credentials") {
    const existing = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!existing) {
      await prisma.user.create({ data: { email: user.email!, name: user.name, credits: 20 } });
    }
  }
  return true;
}
```

## 6. Vercel: Prisma Client Not Generated During Build

**Symptom**: Vercel build fails with `Cannot find module '.prisma/client/default'`.

**Fix**: Add postinstall script to `package.json`:
```json
"postinstall": "prisma generate"
```

## 7. Vercel: Database Connection Fails During Build (IPv6)

**Symptom**: Vercel build fails with `connect ENETUNREACH <ipv6-address>:5432`.

**Cause**: Supabase returns IPv6 addresses. Vercel build environment can't reach IPv6. Pages that use Prisma directly get pre-rendered at build time.

**Fix**: Two options:
1. Use Supabase connection pooler URL (port 6543, PgBouncer) — resolves to IPv4
2. Add `export const dynamic = "force-dynamic"` to server components that query DB

## 8. Prisma 7: Adapter-Pg Required

**Symptom**: `PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`.

**Fix**: Prisma 7 requires an adapter:
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

## 9. BullMQ: Queue Names Cannot Contain Colons

**Symptom**: `Error: Queue name cannot contain :`.

**Fix**: Use hyphens: `image-queue`, `video-queue`, `trend-queue`, `suggest-queue`, `swap-queue`.

## 10. Railway: Workers Fail to Start

**Symptom**: Railway shows `Crashed` with `Missing script` or `command not found: tsx`.

**Common causes and fixes:**

| Symptom | Fix |
|---------|-----|
| `Missing script: "worker:all"` | Railway deployed from wrong branch → Settings → Branch → `main` |
| `sh: tsx: not found` | Move `tsx` from devDependencies to dependencies |
| Build fails | Add `nixpacks.toml` or set correct start command in Settings |
| Workers crash after startup | Add HTTP server for health checks (Railway needs it) |

## 11. Railway: Workers Burn Free Credits (24/7 Idle)

**Fix**: Add auto-shutdown with idle timeout. Create an HTTP server alongside workers:
```typescript
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => process.exit(0), IDLE_TIMEOUT);
}

http.createServer((req, res) => {
  resetIdleTimer();
  res.writeHead(200).end("OK");
}).listen(process.env.PORT || 3000);
```

Then from the API, fire-and-forget a ping after queueing a job to wake Railway.

## 12. Security: API Keys Stored in Database

**Symptom**: OpenAPI/Replicate API keys stored in `model_providers.config` JSON column — visible to anyone with DB access.

**Fix**: Read API keys from environment variables in the adapter constructor, not from DB config:
```typescript
constructor(_config: unknown) {
  this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}
```

## 13. Security: Raw API Errors Exposed to Users

**Symptom**: Users see raw API error messages like "You exceeded your current quota, please check your plan and billing details".

**Fix**: Map API errors to user-friendly messages. Never expose raw errors:
```typescript
function userFriendlyError(raw: string): string {
  if (raw.toLowerCase().includes("quota")) return "生成失败，请稍后重试";
  if (raw.toLowerCase().includes("timeout")) return "服务响应超时，请稍后重试";
  return "生成失败，请稍后重试";
}
```

Store both in DB: `error: userFriendlyError(e.message), rawError: e.message`. Show `rawError` only to admin users.

## 14. API Rate Limiting

**Symptom**: No protection against brute-force API calls.

**Fix**: Per-user in-memory rate limiter:
```typescript
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
```

Apply at API entry points:
```typescript
if (!checkRateLimit(`gen:${user.id}`, 10, 60000)) {
  return error(42900, "请求太频繁", 429);
}
```

## 15. Production Optimization: Mobile + PWA + SEO

**Mobile**: Header should collapse to hamburger menu on mobile. Test at 375px width.

**PWA**: Add `manifest.json` with icons, theme color, and display mode. Add `<link rel="manifest">` to layout.

**SEO**: Add metadata, sitemap, robots.txt, OpenGraph tags. Use `metadataBase` for canonical URLs.

**Analytics**: Add `@vercel/analytics` for page view tracking.

## Quick Pre-Deploy Script

```bash
# Type check
npx tsc --noEmit

# Build check
npm run build

# Start check (starts and immediately exits)
timeout 5 npm start || true

echo "All checks passed!"
```

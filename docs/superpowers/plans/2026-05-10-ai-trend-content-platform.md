# AI 爆款内容生成平台 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个追踪抖音热门话题、AI 自动生成爆款图片/视频并提供发布建议的 Web 平台。

**Architecture:** Next.js 15 全栈单体应用，PostgreSQL + Prisma 做数据层，BullMQ + Redis 做异步任务队列，4 个独立 Worker 处理趋势抓取/AI 生成/发布建议，对象存储存放生成文件。AI 模型通过统一接口抽象。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Redis, BullMQ, NextAuth.js, Zod, Zustand, React Query

---

## 文件结构总览

```
src/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                 # 首页/落地页
│   ├── (auth)/login/page.tsx    # 登录
│   ├── (auth)/register/page.tsx # 注册
│   ├── trends/page.tsx          # 趋势发现
│   ├── trends/[id]/page.tsx     # 话题详情
│   ├── generate/page.tsx        # 内容生成
│   ├── library/page.tsx         # 内容库
│   ├── library/[id]/page.tsx    # 内容详情+发布建议
│   ├── dashboard/page.tsx       # 个人中心
│   ├── settings/page.tsx        # 设置+充值
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── trends/route.ts + [id]/route.ts
│       ├── generate/route.ts + [taskId]/route.ts
│       ├── library/route.ts + [id]/route.ts
│       ├── user/me/route.ts + transactions/route.ts + recharge/route.ts
│       └── models/route.ts
├── components/
│   ├── ui/                     # shadcn 组件 (自动生成)
│   ├── layout/header.tsx, sidebar.tsx
│   ├── trends/trend-card.tsx, heat-chart.tsx
│   ├── generate/model-selector.tsx, prompt-input.tsx, progress-tracker.tsx
│   ├── library/content-card.tsx, publish-panel.tsx
│   └── user/credits-display.tsx
├── lib/
│   ├── db.ts                   # Prisma 客户端单例
│   ├── auth.ts                 # NextAuth 配置
│   ├── redis.ts                # Redis 连接
│   ├── queue.ts                # BullMQ 队列定义
│   ├── validators.ts           # Zod schemas
│   ├── response.ts             # 统一响应工具函数
│   └── models/                 # AI 模型抽象层
│       ├── types.ts
│       ├── registry.ts
│       ├── openai.ts
│       ├── replicate.ts
│       └── domestic.ts
└── workers/
    ├── trend-worker.ts
    ├── image-worker.ts
    ├── video-worker.ts
    └── suggestion-worker.ts
```

---

## Phase 1: 项目基础 + 数据库 + 认证

### Task 1: 初始化 Next.js 项目

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.example`

- [ ] **Step 1: 创建项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter zod zustand @tanstack/react-query bullmq ioredis @aws-sdk/client-s3 @aws-sdk/lib-storage openai replicate
npm install -D @types/node
```

- [ ] **Step 3: 安装 shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input label select tabs dialog dropdown-menu avatar badge skeleton separator toast
```

- [ ] **Step 4: 创建 .env.example**

```
DATABASE_URL="postgresql://user:pass@localhost:5432/aigen"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="your-auth-secret"
AUTH_EMAIL_SERVER="smtp://..."
AUTH_EMAIL_FROM="noreply@example.com"
OSS_ENDPOINT="https://oss.example.com"
OSS_ACCESS_KEY="..."
OSS_SECRET_KEY="..."
OSS_BUCKET="ai-gen-content"
OPENAI_API_KEY="sk-..."
REPLICATE_API_TOKEN="..."
TONGYI_API_KEY="..."
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: scaffold next.js project with dependencies"
```

---

### Task 2: Prisma 数据库 Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: 编写 Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatar    String?
  credits   Int      @default(20)
  role      String   @default("user")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  transactions CreditTransaction[]
  contents      Content[]

  @@map("users")
}

model CreditTransaction {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  amount      Int
  type        String
  description String?
  taskId      String?  @map("task_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("credit_transactions")
}

model TrendingTopic {
  id           String   @id @default(cuid())
  title        String
  description  String?
  category     String   @default("hashtag")
  heatScore    Int      @default(0) @map("heat_score")
  heatHistory  Json     @default("[]") @map("heat_history")
  aiPrediction Json?    @map("ai_prediction")
  platformId   String?  @map("platform_id")
  status       String   @default("rising")
  fetchedAt    DateTime @default(now()) @map("fetched_at")

  contents Content[]

  @@map("trending_topics")
}

model Content {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  topicId         String   @map("topic_id")
  type            String
  model           String
  prompt          String
  negativePrompt  String?  @map("negative_prompt")
  params          Json     @default("{}")
  status          String   @default("pending")
  fileUrl         String?  @map("file_url")
  thumbnailUrl    String?  @map("thumbnail_url")
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")

  user    User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic   TrendingTopic     @relation(fields: [topicId], references: [id])
  suggestion PublishSuggestion?

  @@map("contents")
}

model PublishSuggestion {
  id          String   @id @default(cuid())
  contentId   String   @unique @map("content_id")
  bestTimes   Json     @default("[]") @map("best_times")
  caption     String?
  hashtags    Json     @default("[]")
  bgm         Json     @default("[]")
  generatedAt DateTime @default(now()) @map("generated_at")

  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@map("publish_suggestions")
}

model ModelProvider {
  id          String  @id @default(cuid())
  name        String
  type        String
  provider    String
  isActive    Boolean @default(true) @map("is_active")
  costPerGen  Int     @default(1) @map("cost_per_gen")
  config      Json    @default("{}")

  @@map("model_providers")
}
```

- [ ] **Step 2: 创建 Prisma 客户端单例**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: 运行迁移**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 4: 提交**

```bash
git add prisma/schema.prisma src/lib/db.ts && git commit -m "feat: add prisma schema and db client"
```

---

### Task 3: NextAuth 认证配置

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/response.ts`

- [ ] **Step 1: 编写 auth.ts**

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.AUTH_EMAIL_SERVER,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      return { ...session, user: { ...session.user, id: user.id, credits: (user as any).credits } };
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/trends",
  },
});
```

- [ ] **Step 2: 编写 API 路由**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: 编写统一响应工具**

```typescript
// src/lib/response.ts
import { NextResponse } from "next/server";

export function success(data: any, message = "ok") {
  return NextResponse.json({ code: 0, data, message });
}

export function error(code: number, message: string, status = 400) {
  return NextResponse.json({ code, data: null, message }, { status });
}

export function paginated(list: any[], total: number, page: number, pageSize: number) {
  return NextResponse.json({ code: 0, data: { list, total, page, pageSize } });
}
```

- [ ] **Step 4: 编写认证中间件**

```typescript
// src/lib/auth-guard.ts
import { auth } from "@/lib/auth";
import { error } from "@/lib/response";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return { id: session.user.id, email: session.user.email! };
}

export function withAuth(handler: Function) {
  return async (req: Request, context: any) => {
    try {
      const user = await getAuthUser();
      return handler(req, context, user);
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return error(40100, "请先登录", 401);
      throw e;
    }
  };
}
```

- [ ] **Step 5: 提交**

```bash
git add src/lib/auth.ts src/lib/response.ts src/lib/auth-guard.ts src/app/api/auth/ && git commit -m "feat: add nextauth config and auth guard"
```

---

### Task 4: 基础布局组件

**Files:**
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 编写 Header**

```tsx
// src/components/layout/header.tsx
"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/user/credits-display";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/trends" className="text-lg font-bold">
          AI爆款
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <CreditsDisplay />
              <Link href="/trends"><Button variant="ghost" size="sm">趋势</Button></Link>
              <Link href="/generate"><Button variant="ghost" size="sm">生成</Button></Link>
              <Link href="/library"><Button variant="ghost" size="sm">内容库</Button></Link>
              <Link href="/dashboard"><Button variant="ghost" size="sm">我的</Button></Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>退出</Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">登录</Button></Link>
              <Link href="/register"><Button size="sm">注册</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 编写 Sidebar (桌面端用，可选先写占位)**

```tsx
// src/components/layout/sidebar.tsx
export function Sidebar() {
  return null; // MVP 不做侧边栏，后续再加
}
```

- [ ] **Step 3: 更新根布局**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/layout/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI爆款 - 抖音热门话题AI内容生成",
  description: "追踪抖音热门话题，AI自动生成爆款图片和视频",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 编写 Providers (SessionProvider + QueryClient)**

```tsx
// src/app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/ src/app/layout.tsx src/app/providers.tsx && git commit -m "feat: add layout components and providers"
```

---

### Task 5: 信用卡片组件

**Files:**
- Create: `src/components/user/credits-display.tsx`

- [ ] **Step 1: 编写积分展示组件**

```tsx
// src/components/user/credits-display.tsx
"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function CreditsDisplay() {
  const { data: session } = useSession();

  return (
    <Link href="/settings">
      <Badge variant="secondary" className="cursor-pointer gap-1">
        <span>🪙</span>
        <span>{session?.user?.credits ?? 0}</span>
      </Badge>
    </Link>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/user/creds-display.tsx && git commit -m "feat: add credits display badge"
```

---

### Task 6: 登录/注册页

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: 登录页**

```tsx
// src/app/(auth)/login/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("email", { email, redirect: false });
    if (result?.ok) {
      router.push("/trends");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>输入邮箱，我们会发送一个登录链接</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "发送中..." : "发送登录链接"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 注册页**

```tsx
// src/app/(auth)/register/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("email", { email, redirect: false });
    if (result?.ok) {
      router.push("/trends");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>注册</CardTitle>
          <CardDescription>注册即送 20 积分，开始生成爆款内容</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "发送中..." : "注册领取 20 积分"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/\(auth\)/ && git commit -m "feat: add login and register pages"
```

---

## Phase 2: 趋势追踪

### Task 7: 趋势 API

**Files:**
- Create: `src/app/api/trends/route.ts`
- Create: `src/app/api/trends/[id]/route.ts`
- Create: `src/lib/validators.ts`

- [ ] **Step 1: 编写验证 schemas**

```typescript
// src/lib/validators.ts
import { z } from "zod";

export const trendsQuerySchema = z.object({
  category: z.enum(["challenge", "music", "hashtag", "event"]).optional(),
  sort: z.enum(["heat", "new"]).default("heat"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const generateSchema = z.object({
  topicId: z.string().min(1),
  modelId: z.string().min(1),
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(1000),
  params: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    style: z.string().optional(),
  }).optional(),
});

export const rechargeSchema = z.object({
  amount: z.number().refine(v => [50, 120, 300].includes(v), "无效的充值档位"),
});
```

- [ ] **Step 2: 趋势列表 API**

```typescript
// src/app/api/trends/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { paginated, error } from "@/lib/response";
import { trendsQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const parsed = trendsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return error(40001, "参数错误");

  const { category, sort, page, pageSize } = parsed.data;
  const where = category ? { category } : {};

  const [list, total] = await Promise.all([
    prisma.trendingTopic.findMany({
      where,
      orderBy: sort === "heat" ? { heatScore: "desc" } : { fetchedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trendingTopic.count({ where }),
  ]);

  return paginated(list, total, page, pageSize);
}
```

- [ ] **Step 3: 话题详情 API**

```typescript
// src/app/api/trends/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await prisma.trendingTopic.findUnique({
    where: { id },
    include: { contents: { where: { status: "done" }, take: 8, orderBy: { createdAt: "desc" } } },
  });

  if (!topic) return error(40400, "话题不存在", 404);
  return success(topic);
}
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/validators.ts src/app/api/trends/ && git commit -m "feat: add trends api endpoints"
```

---

### Task 8: 趋势发现页

**Files:**
- Create: `src/app/trends/page.tsx`
- Create: `src/components/trends/trend-card.tsx`

- [ ] **Step 1: TrendCard 组件**

```tsx
// src/components/trends/trend-card.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TrendCardProps {
  id: string;
  title: string;
  category: string;
  heatScore: number;
  status: string;
  aiPrediction?: any;
}

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};

const statusBadge: Record<string, string> = {
  rising: "📈 上升", peak: "🔥 爆火", falling: "📉 降温",
};

export function TrendCard({ id, title, category, heatScore, status }: TrendCardProps) {
  return (
    <Link href={`/trends/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">{categoryLabels[category] || category}</Badge>
              <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold tabular-nums">{heatScore}</span>
              <p className="text-xs text-muted-foreground">{statusBadge[status]}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: 趋势发现页**

```tsx
// src/app/trends/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendCard } from "@/components/trends/trend-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["全部", "挑战赛", "BGM", "话题", "事件"];

export default function TrendsPage() {
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["trends", category, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/trends?${params}`);
      return res.json();
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        {categories.map((c) => (
          <Button
            key={c}
            variant={category === (c === "全部" ? "" : c) ? "default" : "outline"}
            size="sm"
            onClick={() => { setCategory(c === "全部" ? "" : c); setPage(1); }}
          >
            {c}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data?.list?.map((t: any) => <TrendCard key={t.id} {...t} />)}
          </div>
          {data?.data && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground">第 {page} 页 / 共 {Math.ceil(data.data.total / 20)} 页</span>
              <Button variant="outline" disabled={page * 20 >= data.data.total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/trends/ src/app/trends/ && git commit -m "feat: add trends page with card grid and pagination"
```

---

### Task 9: 话题详情页 + 热度图表

**Files:**
- Create: `src/app/trends/[id]/page.tsx`
- Create: `src/components/trends/heat-chart.tsx`

- [ ] **Step 1: 热度折线图组件 (纯 SVG)**

```tsx
// src/components/trends/heat-chart.tsx
interface HeatPoint { time: string; score: number; }

export function HeatChart({ data }: { data: HeatPoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">暂无热度数据</p>;

  const width = 600; const height = 200; const padding = 30;
  const maxScore = Math.max(...data.map(d => d.score), 1);
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
    y: height - padding - (d.score / maxScore) * (height - padding * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/><stop offset="100%" stopColor="#f97316" stopOpacity="0"/></linearGradient></defs>
      <path d={areaD} fill="url(#fade)" />
      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f97316" />)}
    </svg>
  );
}
```

- [ ] **Step 2: 话题详情页**

```tsx
// src/app/trends/[id]/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { HeatChart } from "@/components/trends/heat-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["trend", id],
    queryFn: async () => {
      const res = await fetch(`/api/trends/${id}`);
      return res.json();
    },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-8"><Skeleton className="h-64" /></div>;
  if (!data?.data) return <div className="max-w-4xl mx-auto px-6 py-8"><p>话题不存在</p></div>;

  const topic = data.data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{topic.title}</h1>
          <p className="text-muted-foreground">{topic.description}</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">{topic.heatScore} 热度</Badge>
      </div>

      <div className="bg-card rounded-lg p-6 mb-8">
        <h3 className="text-sm font-medium mb-4">热度变化趋势</h3>
        <HeatChart data={topic.heatHistory as any[]} />
      </div>

      {topic.aiPrediction && (
        <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium mb-1">🤖 AI 趋势预判</h3>
          <p className="text-sm">{(topic.aiPrediction as any).summary}</p>
        </div>
      )}

      <Button size="lg" onClick={() => router.push(`/generate?topicId=${topic.id}`)}>
        以此话题生成内容
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/trends/\[id\]/ src/components/trends/heat-chart.tsx && git commit -m "feat: add topic detail page with heat chart"
```

---

### Task 10: 趋势抓取 Worker

**Files:**
- Create: `src/lib/redis.ts`
- Create: `src/lib/queue.ts`
- Create: `src/workers/trend-worker.ts`

- [ ] **Step 1: Redis 连接**

```typescript
// src/lib/redis.ts
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: IORedis };

export const redis = globalForRedis.redis ?? new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
```

- [ ] **Step 2: BullMQ 队列定义**

```typescript
// src/lib/queue.ts
import { Queue } from "bullmq";
import { redis } from "./redis";

export const trendQueue = new Queue("trend:queue", { connection: redis });
export const imageQueue = new Queue("image:queue", { connection: redis });
export const videoQueue = new Queue("video:queue", { connection: redis });
export const suggestQueue = new Queue("suggest:queue", { connection: redis });
```

- [ ] **Step 3: Trend Worker**

```typescript
// src/workers/trend-worker.ts
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

interface TrendItem {
  title: string;
  description?: string;
  category: string;
  heatScore: number;
  platformId: string;
}

function analyzeHeatHistory(existing: any[], newScore: number) {
  const now = new Date().toISOString();
  const updated = [...existing, { time: now, score: newScore }].slice(-72);
  const trend = updated.length >= 2
    ? updated[updated.length - 1].score > updated[updated.length - 2].score ? "rising" : "falling"
    : "rising";
  return { history: updated, status: newScore > 8000 ? "peak" : trend };
}

const worker = new Worker("trend:queue", async (job) => {
  // 实际抓取逻辑用 Puppeteer 爬抖音热搜页面
  // 这里展示数据处理流程
  const items = job.data as TrendItem[];

  for (const item of items) {
    const existing = await prisma.trendingTopic.findFirst({
      where: { platformId: item.platformId },
    });

    const { history, status } = analyzeHeatHistory(
      (existing?.heatHistory as any[]) || [],
      item.heatScore,
    );

    await prisma.trendingTopic.upsert({
      where: { id: existing?.id ?? "new" },
      update: { heatScore: item.heatScore, heatHistory: history, status, fetchedAt: new Date() },
      create: {
        title: item.title,
        description: item.description,
        category: item.category,
        heatScore: item.heatScore,
        heatHistory: history,
        platformId: item.platformId,
        status,
      },
    });
  }
}, { connection: redis, concurrency: 1 });

console.log("Trend worker started");
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/redis.ts src/lib/queue.ts src/workers/ && git commit -m "feat: add redis, queue definitions, and trend worker"
```

---

## Phase 3: AI 内容生成

### Task 11: AI 模型抽象层

**Files:**
- Create: `src/lib/models/types.ts`
- Create: `src/lib/models/registry.ts`
- Create: `src/lib/models/openai.ts`

- [ ] **Step 1: 模型类型定义**

```typescript
// src/lib/models/types.ts
export interface GenParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  duration?: number;
  style?: string;
}

export interface GenResult {
  fileUrl: string;
  thumbnailUrl?: string;
  metadata: Record<string, any>;
}

export interface ModelAdapter {
  generateImage(params: GenParams): Promise<GenResult>;
  generateVideo(params: GenParams): Promise<GenResult>;
}
```

- [ ] **Step 2: 模型注册表**

```typescript
// src/lib/models/registry.ts
import { prisma } from "@/lib/db";
import { ModelAdapter } from "./types";
import { OpenAIAdapter } from "./openai";

const adapters: Record<string, ModelAdapter> = {};

export async function getModelAdapter(modelId: string): Promise<ModelAdapter> {
  if (adapters[modelId]) return adapters[modelId];

  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model) throw new Error(`Model ${modelId} not found`);

  let adapter: ModelAdapter;
  switch (model.provider) {
    case "openai": adapter = new OpenAIAdapter(model.config as any); break;
    // case "replicate": adapter = new ReplicateAdapter(model.config); break;
    // case "tongyi": case "wenyi": case "jimeng": adapter = new DomesticAdapter(model); break;
    default: throw new Error(`Unknown provider: ${model.provider}`);
  }

  adapters[modelId] = adapter;
  return adapter;
}
```

- [ ] **Step 3: OpenAI 适配器**

```typescript
// src/lib/models/openai.ts
import OpenAI from "openai";
import { ModelAdapter, GenParams, GenResult } from "./types";

export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI;

  constructor(config: { apiKey: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async generateImage(params: GenParams): Promise<GenResult> {
    const response = await this.client.images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
      n: 1,
      size: (params.width && params.height)
        ? `${params.width}x${params.height}` as any
        : "1024x1024",
    });

    return {
      fileUrl: response.data[0].url!,
      metadata: { revised_prompt: response.data[0].revised_prompt },
    };
  }

  async generateVideo(_params: GenParams): Promise<GenResult> {
    throw new Error("Video generation not supported by this model");
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/models/ && git commit -m "feat: add ai model abstraction layer with openai adapter"
```

---

### Task 12: 生成 API

**Files:**
- Create: `src/app/api/generate/route.ts`
- Create: `src/app/api/generate/[taskId]/route.ts`
- Create: `src/app/api/models/route.ts`

- [ ] **Step 1: POST /api/generate**

```typescript
// src/app/api/generate/route.ts
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { imageQueue, videoQueue } from "@/lib/queue";
import { success, error } from "@/lib/response";
import { generateSchema } from "@/lib/validators";

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { topicId, modelId, type, prompt, params } = parsed.data;

  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model || !model.isActive) return error(40002, "模型不可用");

  if (user.id) {
    const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
    if (!userRecord || userRecord.credits < model.costPerGen) {
      return error(40003, "积分不足");
    }
  }

  const content = await prisma.content.create({
    data: {
      userId: user.id,
      topicId,
      type,
      model: model.name,
      prompt,
      negativePrompt: "",
      params: params || {},
      status: "pending",
    },
  });

  const queue = type === "video" ? videoQueue : imageQueue;
  await queue.add("generate", { contentId: content.id, modelId, prompt, params }, {
    jobId: content.id,
  });

  return success({ taskId: content.id, status: "queued" });
});
```

- [ ] **Step 2: GET /api/generate/[taskId]**

```typescript
// src/app/api/generate/[taskId]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const content = await prisma.content.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, fileUrl: true, thumbnailUrl: true, metadata: true },
  });

  if (!content) return error(40400, "任务不存在", 404);

  return success({
    taskId: content.id,
    status: content.status,
    progress: content.status === "done" ? 100 : content.status === "processing" ? 50 : 0,
    result: content.status === "done" ? { fileUrl: content.fileUrl, thumbnailUrl: content.thumbnailUrl, metadata: content.metadata } : null,
  });
}
```

- [ ] **Step 3: GET /api/models**

```typescript
// src/app/api/models/route.ts
import { prisma } from "@/lib/db";
import { success } from "@/lib/response";

export async function GET() {
  const models = await prisma.modelProvider.findMany({ where: { isActive: true } });
  return success(models);
}
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/generate/ src/app/api/models/ && git commit -m "feat: add generate and models api endpoints"
```

---

### Task 13: 内容生成页

**Files:**
- Create: `src/app/generate/page.tsx`
- Create: `src/components/generate/model-selector.tsx`
- Create: `src/components/generate/prompt-input.tsx`
- Create: `src/components/generate/progress-tracker.tsx`

- [ ] **Step 1: ModelSelector**

```tsx
// src/components/generate/model-selector.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelSelectorProps {
  type: "image" | "video";
  selected: string;
  onSelect: (id: string) => void;
}

export function ModelSelector({ type, selected, onSelect }: ModelSelectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: async () => { const res = await fetch("/api/models"); return res.json(); },
  });

  if (isLoading) return <Skeleton className="h-20" />;
  const models = (data?.data || []).filter((m: any) => m.type === type);

  return (
    <div className="grid grid-cols-2 gap-3">
      {models.map((m: any) => (
        <Card
          key={m.id}
          className={`cursor-pointer border-2 ${selected === m.id ? "border-primary" : "border-transparent"}`}
          onClick={() => onSelect(m.id)}
        >
          <CardContent className="p-3 text-sm">
            <p className="font-medium">{m.name}</p>
            <p className="text-muted-foreground">{m.costPerGen} 积分/次</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: PromptInput**

```tsx
// src/components/generate/prompt-input.tsx
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface PromptInputProps {
  prompt: string;
  onChange: (v: string) => void;
  negativePrompt: string;
  onNegativeChange: (v: string) => void;
}

export function PromptInput({ prompt, onChange, negativePrompt, onNegativeChange }: PromptInputProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">提示词 (你想生成什么)</label>
        <Textarea
          placeholder="例如：一只可爱的橘猫正在跳抖音热门舞蹈，赛博朋克风格..."
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium">负向提示词 (不想出现什么)</label>
        <Input
          placeholder="模糊、扭曲、低画质..."
          value={negativePrompt}
          onChange={(e) => onNegativeChange(e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ProgressTracker (轮询组件)**

```tsx
// src/components/generate/progress-tracker.tsx
import { useEffect, useState } from "react";

interface ProgressTrackerProps {
  taskId: string;
  onComplete: (result: any) => void;
}

export function ProgressTracker({ taskId, onComplete }: ProgressTrackerProps) {
  const [status, setStatus] = useState("queued");

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/generate/${taskId}`);
      const data = await res.json();
      setStatus(data.data.status);
      if (data.data.status === "done") {
        clearInterval(interval);
        onComplete(data.data.result);
      }
      if (data.data.status === "failed") {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [taskId, onComplete]);

  const stages = [
    { key: "pending", label: "排队中" },
    { key: "queued", label: "已入队" },
    { key: "processing", label: "生成中" },
    { key: "done", label: "完成" },
  ];

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const active = stages.findIndex(x => x.key === status);
        const state = i < active ? "done" : i === active ? "active" : "waiting";
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              state === "done" ? "bg-green-500 text-white" :
              state === "active" ? "bg-primary text-white animate-pulse" :
              "bg-muted text-muted-foreground"
            }`}>
              {state === "done" ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${state === "active" ? "font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Generate 页面主组件**

```tsx
// src/app/generate/page.tsx
"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ProgressTracker } from "@/components/generate/progress-tracker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const [type, setType] = useState<"image" | "video">("image");
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!modelId || !prompt) {
      toast({ title: "请选择模型并填写提示词", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: searchParams.get("topicId") || "", modelId, type, prompt, params: {} }),
    });
    const data = await res.json();
    if (data.code === 0) {
      setTaskId(data.data.taskId);
    } else {
      toast({ title: data.message, variant: "destructive" });
    }
  };

  if (taskId) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6">生成进行中</h2>
        <ProgressTracker taskId={taskId} onComplete={() => toast({ title: "生成完成！" })} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">创建内容</h1>
      <Tabs value={type} onValueChange={(v) => { setType(v as any); setModelId(""); }} className="mb-6">
        <TabsList>
          <TabsTrigger value="image">图片</TabsTrigger>
          <TabsTrigger value="video">视频</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">选择模型</label>
          <ModelSelector type={type} selected={modelId} onSelect={setModelId} />
        </div>
        <PromptInput prompt={prompt} onChange={setPrompt} negativePrompt={negativePrompt} onNegativeChange={setNegativePrompt} />
        <Button size="lg" className="w-full" onClick={handleSubmit}>开始生成</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add src/app/generate/ src/components/generate/ && git commit -m "feat: add generate page with model selector and progress tracker"
```

---

### Task 14: 图片和视频生成 Worker

**Files:**
- Create: `src/workers/image-worker.ts`
- Create: `src/workers/video-worker.ts`

- [ ] **Step 1: Image Worker**

```typescript
// src/workers/image-worker.ts
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getModelAdapter } from "@/lib/models/registry";

const worker = new Worker("image:queue", async (job) => {
  const { contentId, modelId, prompt, params } = job.data;

  await prisma.content.update({ where: { id: contentId }, data: { status: "processing" } });

  try {
    const adapter = await getModelAdapter(modelId);
    const result = await adapter.generateImage({ prompt, ...params });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: "done", fileUrl: result.fileUrl, thumbnailUrl: result.thumbnailUrl, metadata: result.metadata },
    });

    // 扣减积分
    const content = await prisma.content.findUnique({ where: { id: contentId }, include: { topic: true } });
    if (content) {
      const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
      const cost = model?.costPerGen ?? 1;
      await prisma.user.update({
        where: { id: content.userId },
        data: { credits: { decrement: cost } },
      });
      await prisma.creditTransaction.create({
        data: { userId: content.userId, amount: -cost, type: "usage", taskId: contentId, description: `图片生成: ${content.prompt.slice(0, 50)}` },
      });
    }
  } catch (e: any) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "failed", metadata: { error: e.message } },
    });
  }
}, { connection: redis, concurrency: 3 });

console.log("Image worker started");
```

- [ ] **Step 2: Video Worker (结构相同)**

```typescript
// src/workers/video-worker.ts
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getModelAdapter } from "@/lib/models/registry";

const worker = new Worker("video:queue", async (job) => {
  const { contentId, modelId, prompt, params } = job.data;

  await prisma.content.update({ where: { id: contentId }, data: { status: "processing" } });

  try {
    const adapter = await getModelAdapter(modelId);
    const result = await adapter.generateVideo({ prompt, ...params });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: "done", fileUrl: result.fileUrl, thumbnailUrl: result.thumbnailUrl, metadata: result.metadata },
    });

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (content) {
      const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
      const cost = model?.costPerGen ?? 5;
      await prisma.user.update({ where: { id: content.userId }, data: { credits: { decrement: cost } } });
      await prisma.creditTransaction.create({
        data: { userId: content.userId, amount: -cost, type: "usage", taskId: contentId, description: `视频生成: ${content.prompt.slice(0, 50)}` },
      });
    }
  } catch (e: any) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "failed", metadata: { error: e.message } },
    });
  }
}, { connection: redis, concurrency: 1 });

console.log("Video worker started");
```

- [ ] **Step 3: 提交**

```bash
git add src/workers/ && git commit -m "feat: add image and video generation workers"
```

---

## Phase 4: 内容库 + 发布建议

### Task 15: 内容库 API

**Files:**
- Create: `src/app/api/library/route.ts`
- Create: `src/app/api/library/[id]/route.ts`

- [ ] **Step 1: GET /api/library**

```typescript
// src/app/api/library/route.ts
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { paginated } from "@/lib/response";

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const url = req.nextUrl;
  const type = url.searchParams.get("type") || undefined;
  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = 20;

  const where: any = { userId: user.id };
  if (type) where.type = type;

  const [list, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { topic: { select: { title: true } } },
    }),
    prisma.content.count({ where }),
  ]);

  return paginated(list, total, page, pageSize);
});
```

- [ ] **Step 2: GET + DELETE /api/library/[id]**

```typescript
// src/app/api/library/[id]/route.ts
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";

export const GET = withAuth(async (_req: NextRequest, ctx: any, user: { id: string }) => {
  const { id } = await ctx.params;
  const content = await prisma.content.findUnique({
    where: { id },
    include: { topic: { select: { title: true } }, suggestion: true },
  });
  if (!content || content.userId !== user.id) return error(40400, "内容不存在", 404);
  return success(content);
});

export const DELETE = withAuth(async (_req: NextRequest, ctx: any, user: { id: string }) => {
  const { id } = await ctx.params;
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content || content.userId !== user.id) return error(40400, "内容不存在", 404);
  await prisma.content.delete({ where: { id } });
  return success(null);
});
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/library/ && git commit -m "feat: add library api endpoints"
```

---

### Task 16: 内容库页面

**Files:**
- Create: `src/app/library/page.tsx`
- Create: `src/components/library/content-card.tsx`
- Create: `src/app/library/[id]/page.tsx`
- Create: `src/components/library/publish-panel.tsx`

- [ ] **Step 1: ContentCard**

```tsx
// src/components/library/content-card.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentCardProps {
  id: string;
  type: string;
  status: string;
  prompt: string;
  thumbnailUrl?: string;
  topic?: { title: string };
  createdAt: string;
}

export function ContentCard({ id, type, status, prompt, thumbnailUrl, topic }: ContentCardProps) {
  return (
    <Link href={`/library/${id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={prompt} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              {status === "processing" ? "生成中..." : status === "failed" ? "生成失败" : "等待中"}
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{type === "image" ? "🖼️" : "🎬"}</Badge>
            {topic && <span className="text-xs text-muted-foreground">{topic.title}</span>}
          </div>
          <p className="text-xs line-clamp-2 text-muted-foreground">{prompt}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Library 页面**

```tsx
// src/app/library/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { ContentCard } from "@/components/library/content-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function LibraryPage() {
  const [type, setType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["library", type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/library?${params}`);
      return res.json();
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">我的内容库</h1>
      <Tabs value={type} onValueChange={setType} className="mb-6">
        <TabsList>
          <TabsTrigger value="">全部</TabsTrigger>
          <TabsTrigger value="image">图片</TabsTrigger>
          <TabsTrigger value="video">视频</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.data?.list?.map((c: any) => <ContentCard key={c.id} {...c} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 内容详情页 + 发布建议面板**

```tsx
// src/components/library/publish-panel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublishPanelProps {
  suggestion?: {
    bestTimes?: string[];
    caption?: string;
    hashtags?: string[];
    bgm?: { name: string; url?: string }[];
  } | null;
}

export function PublishPanel({ suggestion }: PublishPanelProps) {
  if (!suggestion) return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">发布建议生成中...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">📝 AI 发布建议</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        {suggestion.bestTimes?.length ? (
          <div>
            <h4 className="font-medium mb-1">⏰ 最佳发布时间</h4>
            <div className="flex gap-2 flex-wrap">{suggestion.bestTimes.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}</div>
          </div>
        ) : null}
        {suggestion.caption ? (
          <div>
            <h4 className="font-medium mb-1">✍️ 推荐配文</h4>
            <p className="bg-muted rounded p-2 text-xs leading-relaxed">{suggestion.caption}</p>
          </div>
        ) : null}
        {suggestion.hashtags?.length ? (
          <div>
            <h4 className="font-medium mb-1">#️⃣ 推荐标签</h4>
            <div className="flex gap-1 flex-wrap">{suggestion.hashtags.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>
          </div>
        ) : null}
        {suggestion.bgm?.length ? (
          <div>
            <h4 className="font-medium mb-1">🎵 推荐 BGM</h4>
            <div className="flex gap-2 flex-wrap">{suggestion.bgm.map((b, i) => <Badge key={i} variant="secondary">{b.name}</Badge>)}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 内容详情页**

```tsx
// src/app/library/[id]/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { PublishPanel } from "@/components/library/publish-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => { const res = await fetch(`/api/library/${id}`); return res.json(); },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-8"><Skeleton className="h-96" /></div>;
  const content = data?.data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {content?.type === "image" && content.fileUrl ? (
            <img src={content.fileUrl} alt={content.prompt} className="w-full rounded-lg" />
          ) : content?.type === "video" && content.fileUrl ? (
            <video src={content.fileUrl} controls className="w-full rounded-lg" />
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">无法预览</div>
          )}
          <h2 className="text-lg font-semibold mt-4">{content?.prompt}</h2>
          <div className="flex gap-2 mt-4">
            {content?.fileUrl && (
              <Button asChild variant="outline">
                <a href={content.fileUrl} download target="_blank">下载</a>
              </Button>
            )}
          </div>
        </div>
        <div>
          <PublishPanel suggestion={content?.suggestion} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add src/app/library/ src/components/library/ && git commit -m "feat: add library pages and publish suggestion panel"
```

---

### Task 17: 发布建议 Worker

**Files:**
- Create: `src/workers/suggestion-worker.ts`

- [ ] **Step 1: Suggestion Worker**

```typescript
// src/workers/suggestion-worker.ts
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

const worker = new Worker("suggest:queue", async (job) => {
  const { contentId } = job.data;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { topic: true },
  });

  if (!content) return;

  // 发布建议生成逻辑：可接入 AI 生成最佳时间、配文、标签、BGM
  // 这里展示数据结构，实际用 LLM API 生成
  const suggestion = {
    bestTimes: ["12:00-13:00", "18:00-19:00", "21:00-22:00"],
    caption: `${content.topic.title} 太火了！AI 生成的这个效果绝了 🔥 #${content.topic.title}`,
    hashtags: [`#${content.topic.title}`, `#AI生成`, `#爆款内容`, `#抖音热门`],
    bgm: [{ name: "热门BGM推荐1" }, { name: "热门BGM推荐2" }],
  };

  await prisma.publishSuggestion.upsert({
    where: { contentId },
    update: suggestion,
    create: { contentId, ...suggestion },
  });
}, { connection: redis, concurrency: 1 });

console.log("Suggestion worker started");
```

- [ ] **Step 2: 在 image-worker 和 video-worker 生成完成后触发 suggest**

在 `image-worker.ts` 和 `video-worker.ts` 的 done 分支加入：
```typescript
import { suggestQueue } from "@/lib/queue";
// ... 在 content.status 更新为 "done" 之后加入:
await suggestQueue.add("suggest", { contentId }, { jobId: `suggest-${contentId}` });
```

- [ ] **Step 3: 提交**

```bash
git add src/workers/ && git commit -m "feat: add suggestion worker and trigger from generation workers"
```

---

## Phase 5: 积分系统 + 用户中心

### Task 18: 用户 API

**Files:**
- Create: `src/app/api/user/me/route.ts`
- Create: `src/app/api/user/transactions/route.ts`
- Create: `src/app/api/user/recharge/route.ts`

- [ ] **Step 1: GET /api/user/me**

```typescript
// src/app/api/user/me/route.ts
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success } from "@/lib/response";

export const GET = withAuth(async (_req: any, _ctx: any, user: { id: string }) => {
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, avatar: true, credits: true, createdAt: true },
  });
  const stats = await prisma.content.groupBy({
    by: ["type", "status"],
    where: { userId: user.id },
    _count: true,
  });

  return success({ user: u, stats });
});
```

- [ ] **Step 2: GET /api/user/transactions**

```typescript
// src/app/api/user/transactions/route.ts
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { paginated } from "@/lib/response";

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const page = Number(req.nextUrl.searchParams.get("page")) || 1;
  const [list, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.creditTransaction.count({ where: { userId: user.id } }),
  ]);
  return paginated(list, total, page, 20);
});
```

- [ ] **Step 3: POST /api/user/recharge**

```typescript
// src/app/api/user/recharge/route.ts
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { rechargeSchema } from "@/lib/validators";

const PRICE_MAP: Record<number, { yuan: number; credits: number }> = {
  50: { yuan: 15, credits: 50 },
  120: { yuan: 30, credits: 120 },
  300: { yuan: 60, credits: 300 },
};

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const body = await req.json();
  const parsed = rechargeSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const plan = PRICE_MAP[parsed.data.amount];
  if (!plan) return error(40001, "无效充值档位");

  // 实际支付接入微信/支付宝 SDK，这里创建待支付订单
  // 支付回调确认后执行积分增加

  // 演示：直接增加积分（实际应在支付回调中处理）
  await prisma.user.update({ where: { id: user.id }, data: { credits: { increment: plan.credits } } });
  await prisma.creditTransaction.create({
    data: { userId: user.id, amount: plan.credits, type: "purchase", description: `充值 ${plan.yuan} 元 → ${plan.credits} 积分` },
  });

  return success({ credits: plan.credits, yuan: plan.yuan });
});
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/user/ && git commit -m "feat: add user profile, transactions, and recharge api"
```

---

### Task 19: 个人中心页 + 设置/充值页

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/settings/page.tsx`
- Create: `src/components/user/transaction-list.tsx`

- [ ] **Step 1: Dashboard 页**

```tsx
// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user/me");
      return res.json();
    },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-8"><Skeleton className="h-64" /></div>;

  const { user, stats } = data?.data || {};

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm">积分余额</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold">{user?.credits ?? 0}</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">图片生成</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {stats?.filter((s: any) => s.type === "image" && s.status === "done").reduce((a: number, b: any) => a + b._count, 0) ?? 0}
            </span>
            <span className="text-muted-foreground text-sm ml-1">张</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">视频生成</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {stats?.filter((s: any) => s.type === "video" && s.status === "done").reduce((a: number, b: any) => a + b._count, 0) ?? 0}
            </span>
            <span className="text-muted-foreground text-sm ml-1">条</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/trends"><Button>浏览趋势</Button></Link>
        <Link href="/generate"><Button variant="outline">立即生成</Button></Link>
        <Link href="/settings"><Button variant="outline">充值积分</Button></Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TransactionList 组件**

```tsx
// src/components/user/transaction-list.tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export function TransactionList() {
  const { data } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => { const res = await fetch("/api/user/transactions"); return res.json(); },
  });

  const list = data?.data?.list || [];

  return (
    <div className="space-y-2">
      {list.map((t: any) => (
        <div key={t.id} className="flex items-center justify-between py-2 border-b text-sm">
          <div>
            <p>{t.description || (t.type === "purchase" ? "充值" : "消耗")}</p>
            <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString("zh-CN")}</p>
          </div>
          <span className={t.amount > 0 ? "text-green-500" : "text-red-500"}>
            {t.amount > 0 ? "+" : ""}{t.amount} 积分
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Settings/充值页**

```tsx
// src/app/settings/page.tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionList } from "@/components/user/transaction-list";
import { useToast } from "@/hooks/use-toast";

const plans = [
  { amount: 50, credits: 50, yuan: 15, label: "基础包" },
  { amount: 120, credits: 120, yuan: 30, label: "进阶包" },
  { amount: 300, credits: 300, yuan: 60, label: "专业包" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { data, refetch } = useQuery({
    queryKey: ["user"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });

  const handleRecharge = async (amount: number) => {
    setLoading(String(amount));
    const res = await fetch("/api/user/recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (data.code === 0) {
      toast({ title: `充值成功！获得 ${data.data.credits} 积分` });
      refetch();
    }
    setLoading(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">设置 & 充值</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => (
          <Card key={plan.amount}>
            <CardHeader><CardTitle className="text-lg">{plan.label}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-1">{plan.credits} <span className="text-sm font-normal text-muted-foreground">积分</span></p>
              <p className="text-muted-foreground text-sm mb-4">¥{plan.yuan}</p>
              <Button className="w-full" onClick={() => handleRecharge(plan.amount)} disabled={loading === String(plan.amount)}>
                {loading === String(plan.amount) ? "处理中..." : `充值 ¥${plan.yuan}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>积分流水</CardTitle></CardHeader>
        <CardContent><TransactionList /></CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add src/app/dashboard/ src/app/settings/ src/components/user/ && git commit -m "feat: add dashboard, settings/recharge pages"
```

---

## Phase 6: 首页 + 收尾

### Task 20: 落地页

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: 首页/落地页**

```tsx
// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div>
      <section className="text-center py-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          追踪抖音热点，AI 生成爆款内容
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          实时监控抖音热门话题，AI 智能分析趋势，自动生成爆款图片和视频，附赠发布建议。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register"><Button size="lg">免费注册，送 20 积分</Button></Link>
          <Link href="/trends"><Button variant="outline" size="lg">浏览趋势</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="font-semibold mb-2">实时趋势追踪</h3>
            <p className="text-sm text-muted-foreground">24h 监控抖音热搜，AI 预测话题爆发趋势，让你抢占流量先机</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-semibold mb-2">多模型 AI 生成</h3>
            <p className="text-sm text-muted-foreground">DALL-E、Stable Diffusion、国产模型自由切换，一张图只需几秒</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold mb-2">智能发布建议</h3>
            <p className="text-sm text-muted-foreground">AI 推荐最佳发布时间、配文、标签和 BGM，提高爆款概率</p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-6">定价方案</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-1">基础包</h3>
            <p className="text-3xl font-bold">50 <span className="text-sm font-normal text-muted-foreground">积分</span></p>
            <p className="text-muted-foreground text-sm mb-4">¥15</p>
          </div>
          <div className="border rounded-lg p-6 border-primary">
            <h3 className="font-semibold mb-1">进阶包</h3>
            <p className="text-3xl font-bold">120 <span className="text-sm font-normal text-muted-foreground">积分</span></p>
            <p className="text-muted-foreground text-sm mb-4">¥30</p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-1">专业包</h3>
            <p className="text-3xl font-bold">300 <span className="text-sm font-normal text-muted-foreground">积分</span></p>
            <p className="text-muted-foreground text-sm mb-4">¥60</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">新用户注册即送 20 积分，先体验再付费</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/page.tsx && git commit -m "feat: add landing page"
```

---

### Task 21: 数据库种子脚本

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Seed 脚本**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 模型配置
  const models = [
    { name: "DALL-E 3", type: "image", provider: "openai", costPerGen: 3, isActive: true, config: { apiKey: process.env.OPENAI_API_KEY } },
    { name: "Stable Diffusion XL", type: "image", provider: "replicate", costPerGen: 1, isActive: true, config: { model: "stability-ai/sdxl" } },
    { name: "通义万相", type: "image", provider: "tongyi", costPerGen: 2, isActive: true, config: {} },
    { name: "Sora", type: "video", provider: "openai", costPerGen: 15, isActive: false, config: {} },
    { name: "即梦", type: "video", provider: "jimeng", costPerGen: 5, isActive: true, config: {} },
  ];

  for (const m of models) {
    await prisma.modelProvider.upsert({
      where: { id: m.name.toLowerCase().replace(/\s+/g, "-") },
      update: m,
      create: { id: m.name.toLowerCase().replace(/\s+/g, "-"), ...m },
    });
  }

  console.log("Seed complete: model providers created");
}

main().then(() => prisma.$disconnect());
```

- [ ] **Step 2: 更新 package.json**

```json
// 在 package.json 的 scripts 加入
"db:seed": "tsx prisma/seed.ts",
"worker:trend": "tsx src/workers/trend-worker.ts",
"worker:image": "tsx src/workers/image-worker.ts",
"worker:video": "tsx src/workers/video-worker.ts",
"worker:suggest": "tsx src/workers/suggestion-worker.ts"
```

- [ ] **Step 3: 运行种子数据**

```bash
npm run db:seed
```

- [ ] **Step 4: 提交**

```bash
git add prisma/seed.ts package.json && git commit -m "feat: add database seed and worker scripts"
```

---

## 启动与部署

```bash
# 开发环境
npm run dev                     # Next.js 开发服务器
npm run worker:trend            # 趋势抓取 Worker (需 Redis)
npm run worker:image            # 图片生成 Worker
npm run worker:video            # 视频生成 Worker
npm run worker:suggest          # 发布建议 Worker

# 数据库
npx prisma migrate dev          # 开发环境迁移
npm run db:seed                 # 初始化模型配置

# 生产部署 (Railway / VPS)
npm run build && npm start      # Next.js 生产模式
# Workers 也需在生产环境独立运行
```

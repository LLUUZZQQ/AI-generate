# FrameCraft - 产品照片背景替换平台 — 设计文档

> 日期：2026-05-10
> 状态：已确认

## 一、产品概述

追踪抖音热门话题，AI 自动生成爆款图片和视频，并提供智能发布建议。

### 目标用户

- **KOL / 内容创作者**：追热点出内容，追求效率和爆款率
- **普通用户 / 爱好者**：低门槛、好玩、社交分享

### 变现模式

**点数制**：按生成次数消耗积分，新用户送 20 积分（≈ 5-10 张图）。

| 类型 | 消耗 | 充值档位 |
|------|------|----------|
| 图片生成 | 1-3 积分/张 | 50积分 ¥15 |
| 视频生成 | 5-15 积分/条 | 120积分 ¥30 / 300积分 ¥60 |

---

## 二、系统架构

```
Next.js 15 (全栈)
├── 前端页面 (React + Tailwind + shadcn/ui)
├── API Routes (REST 接口)
├── Prisma ORM → PostgreSQL
├── Redis (BullMQ 任务队列)
│   ├── trend:queue   (趋势抓取)
│   ├── image:queue   (图片生成)
│   ├── video:queue   (视频生成)
│   └── suggest:queue (发布建议)
├── Background Workers
│   ├── Trend Worker      — 抖音热搜抓取 + AI 趋势分析
│   ├── Image Worker      — DALL-E / SD / 国产模型
│   ├── Video Worker      — Sora / 即梦 / 开源模型
│   └── Suggestion Worker — 发布时机 + 配文 + 标签 + BGM
└── 对象存储 (OSS/S3) — 生成图片/视频文件
```

所有 AI 模型通过统一抽象层调用：`(model, prompt, params) => result`，新增模型只加配置不改业务代码。

---

## 三、数据模型

### User
`id, email, name, avatar, credits (剩余积分), role, created_at`

### CreditTransaction
`id, user_id(FK), amount, type(purchase|usage|gift), task_id, created_at`

### TrendingTopic
`id, title, description, category(challenge|music|hashtag|event), heat_score, heat_history(JSON), ai_prediction(JSON), platform_id, status(rising|peak|falling), fetched_at`

### Content
`id, user_id(FK), topic_id(FK), type(image|video), model, prompt, negative_prompt, params(JSON), status(pending→processing→done|failed), file_url, thumbnail_url, metadata(JSON), created_at`

### PublishSuggestion
`id, content_id(FK, 1:1), best_times(JSON), caption, hashtags(JSON), bgm(JSON), generated_at`

### ModelProvider
`id, name, type(image|video), provider, is_active, cost_per_gen, config(JSON)`

### 核心关系
- User 1→N CreditTransaction
- User 1→N Content
- TrendingTopic 1→N Content
- Content 1→1 PublishSuggestion
- Content N→1 ModelProvider

---

## 四、页面结构 & 路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页/落地页 | 产品介绍、功能展示、定价 |
| `/trends` | 趋势发现 | 热门话题列表，筛选/排序 |
| `/trends/[id]` | 话题详情 | 热度曲线、AI预判、一键生成入口 |
| `/generate` | 内容生成 | 选话题→选模型→提示词→参数 |
| `/library` | 内容库 | 生成历史，下载/查看 |
| `/library/[id]` | 内容详情 | 预览 + 发布建议面板 |
| `/dashboard` | 个人中心 | 积分余额、统计、快捷入口 |
| `/settings` | 设置+充值 | 账户管理、充值、消费记录 |

### 用户核心旅程
```
首页 → 注册(送20积分) → 浏览趋势 → 话题详情 →
点击「生成」→ 选模型+提示词 → 提交 → 等待完成 →
查看结果+发布建议 → 积分不足 → 充值 → 继续
```

---

## 五、API 设计

统一响应格式：`{ code: 0, data: {...}, message: "ok" }`
分页响应：`{ code: 0, data: { list: [...], total, page, pageSize } }`

### 趋势
- `GET /api/trends?category=&sort=heat&page=` — 话题列表
- `GET /api/trends/:id` — 话题详情 + 热度曲线 + AI预判

### 生成
- `POST /api/generate` — 提交生成任务，Body: `{topicId, modelId, type, prompt, params}` → 返回 `{taskId, status:"queued"}`
- `GET /api/generate/:taskId` — 查询进度，`status: queued→processing→done|failed`

### 内容库
- `GET /api/library?type=&status=&page=` — 列表
- `GET /api/library/:id` — 详情 + 发布建议
- `DELETE /api/library/:id` — 删除

### 用户
- `GET /api/user/me` — 用户信息 + 积分
- `GET /api/user/transactions` — 积分流水
- `POST /api/user/recharge` — 创建充值订单

### 其他
- `GET /api/models` — 可用模型列表 + 定价
- `POST /api/auth/signup` / `POST /api/auth/signin` — NextAuth.js

---

## 六、技术选型

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Next.js 15 | 全栈一体，前后端不分离 |
| 样式 | Tailwind CSS + shadcn/ui | 原子化 + 源码级组件控制 |
| 状态 | Zustand + React Query | 轻量 + 数据缓存 |
| ORM | Prisma | 类型安全，自动生成 TS 类型 |
| 认证 | NextAuth.js | 邮箱+微信登录 |
| 校验 | Zod | 输入/输出校验 |
| 队列 | BullMQ + Redis | Node 最成熟的任务队列 |
| 存储 | OSS/S3 | 图片视频文件存储 |
| AI | OpenAI SDK + Replicate + 国产 API | 多模型统一抽象 |
| 支付 | 微信/支付宝 | 国内支付 |
| 抓取 | Puppeteer | 抖音趋势数据采集 |

---

## 七、Worker 设计

### Trend Worker
定时任务（每 5-10 分钟）→ 抓取抖音热搜 → AI 分析热度趋势 → 更新 TrendingTopic 表

### Generation Workers (Image / Video)
消费 Redis 队列 → 调用对应 AI API → 轮询结果 → 上传 OSS → 更新 Content 状态 → 扣减积分 → 通知用户

### Suggestion Worker
内容生成完成后触发 → AI 分析内容 + 话题 → 生成最佳发布时间、配文、标签、BGM 推荐

---

## 八、非功能需求

- **安全**：API 鉴权中间件，用户数据隔离，API Key 加密存储
- **性能**：静态页面 SSG，列表分页 + 虚拟滚动，图片懒加载 + CDN
- **可靠性**：Worker 失败重试（BullMQ 内建），生成任务超时兜底
- **扩展**：模型层抽象接口，新增模型 = 新增配置 + 注册 Worker Handler

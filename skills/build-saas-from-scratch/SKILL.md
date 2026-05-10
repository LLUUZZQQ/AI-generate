---
name: build-saas-from-scratch
description: >
  Build a production-ready SaaS application from scratch using a structured workflow:
  brainstorming → design spec → implementation plan → subagent-driven development →
  optimization → deployment. Use when the user wants to build a web app, SaaS product,
  platform, or any non-trivial software project. Also trigger when the user says "build me X",
  "I want to create Y", or starts a new project. Covers the full lifecycle from idea to production.
---

# Build SaaS From Scratch

Complete workflow for building production-ready SaaS applications. Each phase has a corresponding skill to invoke for detailed execution.

## The Five-Phase Workflow

```
Brainstorm → Design → Plan → Build → Optimize → Deploy
```

## Phase 0: Project Setup

Before anything else, ensure the project is ready for structured development:

1. Initialize git: `git init && git add -A && git commit -m "initial"`
2. Create directory structure: `docs/superpowers/specs/` and `docs/superpowers/plans/`
3. Invoke the `superpowers:brainstorming` skill for any creative/new project work

## Phase 1: Brainstorming

**Skill**: `superpowers:brainstorming`

Go through these steps in order:
1. Explore project context (existing code, requirements)
2. Offer visual companion for UI-heavy projects
3. Ask clarifying questions one at a time (multiple choice preferred)
4. Propose 2-3 approaches with trade-offs and recommendation
5. Present design section by section, getting approval after each
6. Write design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
7. Self-review for placeholders, contradictions, ambiguity
8. User reviews written spec before proceeding

Key questions to cover:
- Target users (who is this for?)
- Monetization (how does it make money?)
- Core differentiator (what makes it special?)
- Platform (web/mobile/desktop?)
- Tech preferences (any constraints?)

## Phase 2: Design Document

Save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

Must contain:
1. **Product Overview** — what, who, how it makes money
2. **System Architecture** — component diagram, data flow
3. **Data Models** — every table with fields, types, and relationships
4. **Page Routes** — every URL with its purpose
5. **API Design** — every endpoint with request/response format
6. **Tech Stack** — every technology with rationale
7. **Background Jobs** — workers, scheduled tasks
8. **Non-functional Requirements** — security, performance, reliability

## Phase 3: Implementation Plan

**Skill**: `superpowers:writing-plans`

Save to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.

### File Structure First
Before tasks, map out the entire file tree. Design units with clear boundaries. Each file should have one responsibility.

### Task Structure
Every task follows the TDD pattern:
- Write failing test → run to verify failure → implement → run to verify pass → commit

### Task Granularity
Each step = 2-5 minutes. A task has 3-7 steps. Don't batch unrelated work.

### Plan Header
```markdown
# [Feature] Implementation Plan
> For agentic workers: Use superpowers:subagent-driven-development

**Goal:** One sentence
**Architecture:** 2-3 sentences
**Tech Stack:** Key technologies
```

### No Placeholders
Every step must contain actual code, exact file paths, exact commands with expected output. Never write "TBD", "implement X", or "similar to Task N".

### Self-Review Before Execution
1. Spec coverage — every requirement has a task
2. Placeholder scan — no TBD/TODO/fill-in-later
3. Type consistency — types and function names match across tasks

## Phase 4: Subagent-Driven Development

**Skill**: `superpowers:subagent-driven-development`

### The Loop
For each task in the plan:
1. **Dispatch implementer** — fresh subagent with full task text + context
2. **Spec review** — verify implements exactly what was requested, nothing more/less
3. **Code quality review** — verify clean, tested, maintainable
4. **Fix if needed** — implementer fixes issues, re-review
5. **Mark complete** — only when both reviews pass

### Tips
- Batch tightly coupled tasks (API + page that uses it) into one dispatch
- Dispatch spec + code quality review together for small tasks
- Don't skip reviews — issues caught early cost 10x less
- If implementer reports DONE_WITH_CONCERNS, read their concerns before reviewing

## Phase 5: Optimization Rounds

After the core functionality works, iterate on UX:

### Round Types
- **Visual Polish** — color scheme, typography, spacing, dark mode
- **Interaction** — scroll effects, animations, hover states, transitions
- **Empty States** — what users see when there's no data
- **Error Handling** — friendly messages, retry buttons, fallbacks
- **Responsive** — mobile header, touch targets, viewport
- **Performance** — image lazy loading, skeleton screens, code splitting

### Process
Each round: identify issues → fix → verify in browser → commit. Use the browse tool to test in a real browser. Read screenshot output to verify visual changes.

### Animation Principles
- Use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth transitions (not `ease`)
- Scroll-reveal via Intersection Observer (not on-load CSS animation)
- Stagger cards with 80ms delays for premium feel
- Button press: `transform: scale(0.97)` on `:active`
- Use `requestAnimationFrame` for count-up animations

## Phase 6: Deployment

**Skill**: `deploy-nextjs-supabase-railway`

See that skill for full deployment guide. Quick checklist:
1. Cloud database (Supabase) — push schema + seed
2. Frontend (Vercel) — env vars + Prisma fixes
3. Workers (Railway) — HTTP server + auto-sleep
4. Post-deploy verification on every page

## Common Mistakes to Avoid

**Architecture:**
- Don't do microservices for MVP. Next.js monolith works for 99% of projects.
- Redis is for async jobs, not for primary data. PostgreSQL is your source of truth.
- Workers must be deployed separately — Vercel functions have 10s timeout.

**Development:**
- Don't write code without a plan. Even 10 minutes of planning saves hours.
- Don't skip reviews. Subagent reports are optimistic — read the actual code.
- Don't batch unrelated changes in one commit. Each commit = one logical change.

**Deployment:**
- Don't use Supabase direct connection on Vercel. Use the connection pooler.
- Don't forget `postinstall: prisma generate`. Without it, Vercel build fails.
- Don't run workers 24/7 on Railway. Add idle timeout + HTTP wake-up.

## When to Use Which Skill

| Situation | Skill |
|-----------|-------|
| New idea, no clear requirements | `superpowers:brainstorming` |
| Requirements clear, need plan | `superpowers:writing-plans` |
| Plan written, ready to code | `superpowers:subagent-driven-development` |
| Code complete, need to ship | `superpowers:finishing-a-development-branch` |
| Bug/error during development | `superpowers:systematic-debugging` |
| Need code review | `superpowers:requesting-code-review` |
| Ready to deploy | `deploy-nextjs-supabase-railway` |
| Post-deploy polish | Manual optimization rounds |

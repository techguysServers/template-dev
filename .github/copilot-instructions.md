# GitHub Copilot instructions — TechGuys Dev Template

Model target: claude-sonnet-4-6 (or equivalent). Execute, don't over-engineer.

---

## Rule #0 — always latest version + official docs

Never trust your memory for a version, scaffold/install command, or setup step.
- Use official `@latest` commands (`npm create x@latest`, `dotnet new`, `spring init`…) — they pull the newest version.
- If unsure of the command or version → read the official docs first (links in `STACK.md`).
- Version numbers in this repo are indicative (2026-06-15), not fixed targets.

---

## Stack by domain

These are the **defaults**. All frameworks listed in `STACK.md` are valid — pick by project/client context.

### Landing page
Astro or Next.js · Tailwind v4 · shadcn/ui

### Frontend app
Default **Next.js** (React). Also: Nuxt (Vue) · Angular · SvelteKit · Remix · Vite SPA.
Briques: Zustand/Pinia · TanStack Query · RHF+Zod · shadcn · Clerk.

### Backend API
Default **Node.js + Hono**. Also by language: Node (Fastify/NestJS) · Python (FastAPI/Django) · Java (Spring Boot) · .NET (ASP.NET Core) · Go (Chi/Echo).
Validation mandatory everywhere: Zod / Pydantic / Bean Validation / DataAnnotations.

### Database
Supabase (Postgres) · Drizzle ORM (Node) / SQLModel (Python) / JPA (Java) / EF Core (.NET) · Upstash Redis

Full decision tree + official doc links → `STACK.md`

---

## Architecture

### Landing page — component-first

- `app/**/page.tsx` = thin shell, no JSX logic
- All UI in `components/<page-name>/`
- `components/ui/` = Shadcn — never modify directly
- `components/shared/` = Navbar, Footer, cross-page
- `hooks/` = extracted when logic > ~15 lines

### Frontend app — feature-first

- `components/features/<feature>/` = co-located components, hooks, types
- `lib/db/` = Drizzle client + schema
- `lib/auth/` = Clerk helpers
- Server Components by default, `"use client"` only when needed

### Backend — Hono, route-first

- `src/routes/v1/` = one file per resource
- `src/middleware/` = auth, rateLimit, logger
- `src/lib/db.ts` = Drizzle client
- Validate every input with Zod before any processing
- Return `{ data }` or `{ error: { code, message } }` — always consistent

---

## TypeScript

- `strict: true` always
- No `any` — use `unknown` + type guard
- Props as `interface NomProps` (suffix `Props`)
- Named exports everywhere except Next.js page/layout files
- `cn()` from `@/lib/utils` for Tailwind class merging

---

## Security baseline

- Zod on all API inputs (body, params, query)
- Arcjet for rate limiting on public routes
- Auth middleware on all protected routes
- JWT verified server-side, never trusted from client
- No secrets in code — `.env.local` only
- Security headers in `next.config.mjs`

---

## Observability

- Sentry for errors (frontend + backend)
- Axiom for structured logs
- Always include `requestId` in log lines
- Never log tokens, passwords, or PII

---

## Quality gates (must all pass before PR)

```bash
# Frontend / Landing
npm run typecheck && npm run lint && npm run format && npm run build

# Backend
npm run typecheck && npm run lint && npm run test && npm run build
```

---

## Commits

Conventional Commits: `type(scope): message`

Types: `feat` · `fix` · `chore` · `refactor` · `perf` · `docs` · `style` · `test` · `ci` · `revert`
Scopes: `ui` · `api` · `db` · `auth` · `config` · `deps` · `infra` · `seo` · `a11y` · `perf` · `security`

---

## Git flow

- `main` ← PR from dev (stable, CI required)
- `dev` ← PR from feat/* branches
- `feat/<slug>` ← one feature per branch = one issue
- `dev-config` ← config-only changes, from dev

---

## A11y & SEO (landing / frontend)

- WCAG 2.1 AA. Semantic HTML. Alt on all images.
- One `<h1>` per page, heading hierarchy respected.
- Every page exports `metadata` or `generateMetadata`.

---

## Do not

- Push directly to `main` or `dev`
- Leave `console.log` in committed code
- Use `any` in TypeScript
- Use inline styles or hardcoded colors / hex values
- Modify `components/ui/` (Shadcn primitives)
- Create files not required by the task
- Add error handling for scenarios that can't happen
- Expose stack traces in API responses

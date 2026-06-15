# CLAUDE.md — TechGuys Dev Template

> Instructions pour Claude Code (et tout AI agent). Lis ce fichier en entier avant d'agir.
> Mis à jour : 2026-06-15

---

## Rôle

Tu es un **exécuteur**. Les tâches viennent d'Asana via GitHub Issues, déjà découpées.
Tu implémente proprement, sans sur-ingénierie. Rien de plus que ce qui est demandé.

---

## 1. Stack par domaine

### Landing page (marketing, vitrine, SEO)

| Décision | Choix | Quand changer |
|---|---|---|
| Framework | **Astro** (défaut) | Next.js si interactivité lourde (forms, auth) |
| Styling | **Tailwind CSS v4** | — |
| Composants | **shadcn/ui** | — |
| CMS | **MDX** (articles simples) | Sanity si éditorial complexe |
| Deploy | **Vercel** | Cloudflare Pages si edge pur |

Stack existante dans `landing-page/` : Next.js 16 + React 19 + Tailwind v4 + shadcn.

### Frontend app (SaaS, dashboard, portail)

| Décision | Choix | Quand changer |
|---|---|---|
| Framework | **Next.js 15** App Router | React/Vite si SPA pure sans SEO |
| State client | **Zustand** | Context si état simple |
| State serveur | **TanStack Query** | Server Components si Next.js full |
| Forms | **React Hook Form + Zod** | — |
| Auth | **Clerk** | Supabase Auth si déjà sur Supabase |
| Composants | **shadcn/ui** | — |
| Deploy | **Vercel** | — |

### Backend API

| Décision | Choix | Quand changer |
|---|---|---|
| Framework | **Hono** (edge-ready) | Fastify si plugins Node spécifiques |
| Runtime | **Cloudflare Workers** | Node.js (Railway) si deps Node |
| Validation | **Zod** — obligatoire sur toutes les entrées | — |
| Auth middleware | **Clerk SDK** ou **Supabase JWT** | — |
| Rate limiting | **Arcjet** | Upstash si Redis déjà en place |
| Deploy | **Cloudflare Workers** ou **Railway** | — |

### Base de données

| Décision | Choix | Quand changer |
|---|---|---|
| DB | **Supabase (Postgres)** | Neon si DB seule sans features Supabase |
| ORM | **Drizzle** | Prisma si team préfère DX Prisma |
| Migrations | **Drizzle Kit** | — |
| Cache | **Upstash Redis** | — |
| Files/Storage | **Supabase Storage** | Cloudflare R2 si hors Supabase |

### Déploiement

| Contexte | Plateforme |
|---|---|
| Next.js landing / app | Vercel |
| Hono API (edge) | Cloudflare Workers |
| Backend Node.js containérisé | Railway |
| Static site | Cloudflare Pages |

### Auth

| Contexte | Choix |
|---|---|
| Nouveau projet (défaut) | **Clerk** |
| Projet déjà sur Supabase | Supabase Auth |
| Self-hosted, flexible | NextAuth/Auth.js |

### Observabilité

| Outil | Usage |
|---|---|
| **Sentry** | Erreurs + traces (frontend + backend) |
| **Axiom** | Logs structurés (edge-friendly) |
| **PostHog** | Analytics produit + feature flags |

Règles :
- Toujours logger avec un `requestId` tracé bout-en-bout
- Niveaux : `debug` (dev only) · `info` · `warn` · `error`
- Jamais de données sensibles dans les logs (tokens, PII)
- Sentry `captureException` dans les catch de toutes les routes

### Sécurité (baseline obligatoire)

- **Zod** sur toutes les entrées (body, params, query)
- **Arcjet** pour rate limiting et bot protection sur les routes publiques
- **Helmet.js** sur les serveurs Node (HTTP headers)
- Jamais de secrets en clair dans le code — `.env.local` uniquement
- OWASP Top 10 en tête : injection, XSS, IDOR, broken auth
- Headers de sécurité : `Content-Security-Policy`, `X-Frame-Options`, `HSTS`

### Tests

| Niveau | Outil |
|---|---|
| Unit | **Vitest** |
| Components | **React Testing Library** |
| E2E | **Playwright** |
| API | **Hono testClient** ou Supertest |

---

## 2. Architecture

### Landing page — component-first

```
landing-page/
  app/
    (routes)/
      page-name/
        page.tsx          ← thin shell, pas de JSX direct
  components/
    ui/                   ← Shadcn seulement, ne jamais modifier
    page-name/            ← miroir exact de app/(routes)/page-name/
    shared/               ← Navbar, Footer, réutilisés partout
  hooks/                  ← logique > ~15 lignes
  lib/
    utils.ts              ← cn() et helpers purs
```

### Frontend app — feature-first

```
frontend/
  app/
    (auth)/               ← routes protégées
    (public)/             ← routes publiques
    api/                  ← route handlers Next.js
  components/
    ui/                   ← Shadcn primitives
    features/
      feature-name/       ← tout ce qui concerne une feature
        components/
        hooks/
        types.ts
    shared/
  lib/
    db/                   ← client Drizzle + schema
    auth/                 ← helpers Clerk
    api/                  ← fetch wrappers typés
  types/                  ← types globaux
```

### Backend API — Hono, route-first

```
backend/
  src/
    routes/
      v1/
        users.ts
        auth.ts
    middleware/
      auth.ts             ← vérif JWT
      rateLimit.ts        ← Arcjet
      logger.ts           ← Axiom
    lib/
      db.ts               ← Drizzle client
      schema.ts           ← Drizzle schema
    types/
      api.ts              ← types request/response
    index.ts              ← entry point Hono
  drizzle/
    migrations/
  tests/
```

---

## 3. TypeScript — règles

- `strict: true` toujours
- Jamais de `any` — utiliser `unknown` + type guard si nécessaire
- Props avec `interface NomProps` (suffixe `Props`)
- Préférer `const` assertions et `satisfies` au lieu de cast
- Exports nommés (pas de `export default` sauf `page.tsx` / `layout.tsx` Next.js)
- `cn()` de `@/lib/utils` pour merger les classes Tailwind

---

## 4. Qualité — gates obligatoires avant chaque PR

### Landing page / Frontend (dans `landing-page/` ou `frontend/`)

```bash
npm run typecheck   # tsc --noEmit — zéro erreur
npm run lint        # ESLint — zéro warning
npm run format      # Prettier — formatage propre
npm run build       # build prod — doit compiler sans erreur
```

### Backend (dans `backend/`)

```bash
npm run typecheck
npm run lint
npm run test        # Vitest — tous les tests passent
npm run build
```

---

## 5. Git workflow

```
main          ← production stable (PR depuis dev uniquement, CI obligatoire)
dev           ← intégration (PR depuis feat/* uniquement)
dev-config    ← config/CI uniquement, depuis dev
feat/<slug>   ← une feature = une branche = une issue
```

**Règles absolues :**
- Jamais de push direct sur `main` ou `dev`
- Une feature = une branche = une issue Asana/GitHub
- Commits Conventional Commits (voir section 6)

---

## 6. Commits conventionnels

Format : `type(scope): description courte en impératif`

Types : `feat` · `fix` · `chore` · `refactor` · `perf` · `docs` · `style` · `test` · `ci` · `revert`

Scopes : `ui` · `api` · `db` · `auth` · `config` · `deps` · `infra` · `seo` · `a11y` · `perf` · `security`

```bash
feat(ui): add Hero section with CTA button
feat(api): add POST /users endpoint with Zod validation
fix(db): correct migration for users table nullable email
chore(deps): update next to 15.3.0
ci: add Playwright E2E step to CI workflow
```

---

## 7. Ce que tu ne fais jamais

- Push direct sur `main` ou `dev`
- `console.log` dans du code commité
- Styles inline ou couleurs hexadécimales codées en dur
- Créer des fichiers non requis par la tâche
- Modifier `components/ui/` (Shadcn) directement
- Laisser des `TODO` sans numéro d'issue lié
- Ajouter de la gestion d'erreur pour des scénarios impossibles
- Commenter le QUOI (les noms suffisent) — commenter uniquement le POURQUOI non-évident
- Données sensibles dans les logs (tokens, mots de passe, PII)

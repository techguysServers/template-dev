# STACK.md — Décisions technologiques TechGuys

> Référence pour choisir la bonne techno selon le contexte.
> Quand tu hésites, lis cette page. Si tu vas à l'encontre d'un choix, documente pourquoi.

---

## Comment utiliser ce document

1. Identifie le **domaine** de ce que tu construis (colonne gauche)
2. Lis le **choix par défaut** (gras)
3. Consulte la colonne **"quand changer"** si le contexte est différent
4. Si tu dévies, laisse un commentaire `// STACK: choix X plutôt que Y parce que [raison]` dans le fichier concerné

---

## Landing page (site marketing, vitrine, SEO)

**Objectif :** temps de chargement minimal, SEO parfait, peu d'interactivité.

| Catégorie | Défaut | Alternative | Trigger |
|---|---|---|---|
| Framework | **Astro** | Next.js | Formulaires complexes, auth nécessaire |
| Styling | **Tailwind CSS v4** | — | — |
| Composants | **shadcn/ui** | Radix UI pur | Très peu de composants custom |
| Animations | **Framer Motion** | CSS transitions | Animations simples |
| Contenu | **MDX** | Sanity, Contentful | Équipe éditoriale non-technique |
| Images | **Cloudinary** | next/image natif | Transformations avancées |
| Formulaires | **React Hook Form + Zod** | Formspark | Validation côté client uniquement |
| Analytics | **PostHog** | Plausible | Conformité RGPD stricte |
| Deploy | **Vercel** | Cloudflare Pages | Pas de fonctions serveur |

Repo existant : `landing-page/` — Next.js 16 + React 19 + Tailwind v4 + shadcn.

---

## Frontend app (SaaS, dashboard, portail)

**Objectif :** UX riche, état complexe, données temps réel, auth.

| Catégorie | Défaut | Alternative | Trigger |
|---|---|---|---|
| Framework | **Next.js 15** App Router | React + Vite | SPA pure, pas de SEO |
| State client | **Zustand** | Context API | État très simple |
| State serveur | **TanStack Query** | SWR | Mutations complexes |
| Forms | **React Hook Form + Zod** | Formik | — |
| Auth | **Clerk** | Supabase Auth | Déjà sur Supabase |
| Tables | **TanStack Table** | — | — |
| Dates | **date-fns** | dayjs | — |
| Composants | **shadcn/ui** | — | — |
| Deploy | **Vercel** | — | — |

---

## Backend API

**Objectif :** endpoints typés, validation stricte, edge-ready.

| Catégorie | Défaut | Alternative | Trigger |
|---|---|---|---|
| Framework | **Hono** | Fastify | Plugins Node.js spécifiques (multer, etc.) |
| Runtime | **Cloudflare Workers** | Node.js (Railway) | Deps incompatibles edge |
| Validation | **Zod** | — | Obligatoire partout |
| Auth middleware | **Clerk SDK** | Supabase JWT | Auth déjà configuré |
| Rate limiting | **Arcjet** | Upstash Ratelimit | Redis déjà en place |
| Email | **Resend** | SendGrid | Volume très élevé |
| Queue | **Inngest** | BullMQ | Serveur Node.js persistant |
| Deploy | **Cloudflare Workers** | Railway | Conteneur, longue durée de vie |

---

## Base de données

**Objectif :** Postgres type-safe, migrations versionnées, performant.

| Catégorie | Défaut | Alternative | Trigger |
|---|---|---|---|
| DB | **Supabase (Postgres)** | Neon | DB seule sans RLS ni Storage |
| ORM | **Drizzle** | Prisma | Équipe plus à l'aise avec Prisma |
| Migrations | **Drizzle Kit** | — | — |
| Cache | **Upstash Redis** | — | — |
| Storage | **Supabase Storage** | Cloudflare R2 | Hors écosystème Supabase |
| Search | **Postgres full-text** | Typesense | Recherche très avancée |
| Realtime | **Supabase Realtime** | Pusher | Hors écosystème Supabase |

---

## Auth

| Contexte | Choix | Raison |
|---|---|---|
| Nouveau projet (défaut) | **Clerk** | Sessions, MFA, OAuth, UI pré-built, edge-compatible |
| Déjà sur Supabase | Supabase Auth | Évite la double dépendance auth |
| Self-hosted, flexible | NextAuth/Auth.js | Contrôle total, DB custom |
| Pas d'UI, API only | Clerk Backend SDK | Vérification JWT sans UI |

---

## Déploiement

| Contexte | Plateforme | Raison |
|---|---|---|
| Next.js (défaut) | **Vercel** | Optimisé Next.js, previews PR |
| Hono API (edge) | **Cloudflare Workers** | Edge global, gratuit généreux |
| Backend Node.js | **Railway** | Containers, pas de cold start |
| Static site | **Cloudflare Pages** | CDN global, gratuit |
| Backend Python/autre | **Render** | Alternative Railway |

---

## Observabilité

| Outil | Ce qu'il surveille | Quand l'ajouter |
|---|---|---|
| **Sentry** | Erreurs JS, traces back/front | Dès le MVP |
| **Axiom** | Logs structurés (serverless-friendly) | Dès que backend en prod |
| **PostHog** | Funnel, événements, feature flags | Dès que users en prod |
| **Checkly** | Uptime + E2E synthétique | Après lancement |

### Conventions de logging

```typescript
// Bon
logger.info({ requestId, userId, action: "user.login" }, "User logged in")
logger.error({ requestId, error: err.message, stack: err.stack }, "DB query failed")

// Mauvais
console.log("user logged in", user)         // pas structuré
console.log("token:", token)                 // donnée sensible
```

---

## Sécurité

### Baseline obligatoire pour tout projet en prod

| Mesure | Outil | Scope |
|---|---|---|
| Validation entrées | **Zod** | Backend + Frontend |
| Rate limiting | **Arcjet** | Routes publiques |
| HTTP headers | **Helmet.js** | Serveurs Node |
| Secrets | `.env.local` / Vercel Env | Jamais en clair |
| CORS | Whitelist explicite | APIs publiques |
| SQL injection | Drizzle paramétré | — |
| XSS | CSP headers + DOMPurify | HTML dynamique |

### Headers de sécurité minimum (next.config)

```js
headers: [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
]
```

---

## Tests

| Niveau | Outil | Ce qu'on teste |
|---|---|---|
| **Unit** | Vitest | Fonctions pures, utils, transformations |
| **Components** | React Testing Library | Composants isolés avec user interactions |
| **Integration** | Vitest + Hono testClient | Routes API avec DB réelle (test container) |
| **E2E** | Playwright | Parcours critiques (signup, checkout, login) |

### Règles

- Pas de mocks de la DB en tests d'intégration — utiliser une vraie DB de test
- Coverage minimum 80% sur les utils et les routes API
- E2E uniquement sur les parcours critiques (3-5 max, ils sont lents)
- Tests dans `__tests__/` ou `.test.ts` co-localisés avec le fichier testé

---

## Queue / Background jobs

| Contexte | Outil | Raison |
|---|---|---|
| Serverless (Vercel, Workers) | **Inngest** | Sans infra, retry, observabilité |
| Node.js persistant | **BullMQ** | Redis-backed, très fiable |
| Scheduling cron | **Inngest** ou Vercel Cron | Selon l'hébergement |
| Webhooks entrants | **Svix** | Signature, replay, dashboard |

---

## Monorepo vs Polyrepo

| Contexte | Structure |
|---|---|
| 1-2 projets liés | **Polyrepo** — un repo par domaine |
| 3+ projets avec code partagé | **Turborepo** (monorepo) |
| Packages npm internes | Turborepo + `packages/` |

Ce template est un **polyrepo** par défaut. Si tu migres vers monorepo : Turborepo + `pnpm workspaces`.

---

## Ne pas utiliser (sauf raison explicite)

| Techno | Remplacée par | Raison |
|---|---|---|
| Express | Hono | Trop vieux, pas edge, pas typé |
| Mongoose/MongoDB | Drizzle + Postgres | SQL préféré pour cohérence |
| Redux | Zustand + TanStack Query | Trop verbeux |
| Moment.js | date-fns | Bundle size |
| jQuery | — | 2010 a appelé |
| Create React App | Next.js ou Vite | Abandonné |
| Webpack config custom | Next.js / Vite built-in | Complexité inutile |
| Sass/SCSS | Tailwind CSS | Suffisant dans 99% des cas |

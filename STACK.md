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

## ⚠️ Principe n°1 — toujours la dernière version stable

**Ne te fie jamais à ta mémoire pour une version, une commande de scaffold ou une étape de setup.**
Les versions changent constamment. Avant de scaffolder ou d'installer quoi que ce soit :

1. **Utilise les commandes officielles `create` / `init` qui tirent toujours la dernière version**
   (`npm create x@latest`, `npx create-x@latest`, `dotnet new`, `spring init`, etc.).
2. **Si tu n'es pas certain de la commande ou de la version → va lire la doc officielle.**
   Chaque section ci-dessous donne le lien officiel. C'est la source de vérité, pas ce fichier.
3. **Ne jamais épingler une version périmée.** Vérifie la dernière version stable
   (`npm view <pkg> version`, page releases GitHub, doc officielle) au moment du setup.
4. Les numéros de version cités dans ce document sont **indicatifs au 2026-06-15** —
   considère-les comme « la dernière stable de cette branche », pas comme une cible figée.

> Règle d'or : *si je ne peux pas confirmer la dernière version / la bonne commande de tête,
> je consulte la doc officielle avant d'agir.*

---

## Landing page (site marketing, vitrine, SEO)

**Objectif :** temps de chargement minimal, SEO parfait, peu d'interactivité.

| Catégorie | Défaut | Alternative | Trigger |
|---|---|---|---|
| Framework | **Astro** | Next.js | Formulaires complexes, auth nécessaire |
| Scaffold | `npm create astro@latest` | `npx create-next-app@latest` | — |
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

### Choix du framework

Toutes ces options sont valides. **Par défaut : Next.js** (écosystème, RSC, déploiement Vercel, le plus de support interne). Choisis selon le contexte / la préférence client.

| Framework | Langage / base | Scaffold (toujours `@latest`) | Doc officielle | Quand le choisir |
|---|---|---|---|---|
| **Next.js** (défaut) | React | `npx create-next-app@latest` | https://nextjs.org/docs | SSR + SEO + API routes, défaut TechGuys |
| **Nuxt** | Vue | `npm create nuxt@latest` | https://nuxt.com/docs | Équipe/client Vue, SSR |
| **Angular** | TypeScript | `npx @angular/cli@latest new` | https://angular.dev | Grosse app entreprise, client déjà Angular |
| **SvelteKit** | Svelte | `npx sv create` | https://svelte.dev/docs/kit | Bundle léger, DX, perf |
| **Remix / React Router 7** | React | `npx create-react-router@latest` | https://reactrouter.com | Web standards, nested routing |
| **React + Vite** | React | `npm create vite@latest` | https://vite.dev | SPA pure, pas de SEO |
| **Vue + Vite** | Vue | `npm create vue@latest` | https://vuejs.org | SPA Vue sans SSR |

> Avant de scaffolder : vérifie la commande exacte sur la doc officielle (elles évoluent — ex. SvelteKit est passé à `sv`).

### Briques transverses (selon le framework choisi)

| Catégorie | React (Next/Remix/Vite) | Vue (Nuxt/Vite) | Angular |
|---|---|---|---|
| State client | **Zustand** | **Pinia** | Services + Signals |
| State serveur | **TanStack Query** | **TanStack Query (Vue)** / `useFetch` Nuxt | TanStack Query (Angular) / RxJS |
| Forms | **React Hook Form + Zod** | **VeeValidate + Zod** | Reactive Forms |
| Composants UI | **shadcn/ui** | **shadcn-vue** / PrimeVue | **Angular Material** / PrimeNG |
| Styling | **Tailwind CSS v4** | Tailwind CSS v4 | Tailwind CSS v4 |
| Auth | **Clerk** | Clerk / Supabase Auth | Auth0 / Supabase Auth |
| Tables | TanStack Table | TanStack Table | Angular Material Table |
| Dates | date-fns | date-fns | date-fns |
| Deploy | **Vercel** | Vercel / Netlify | Vercel / Azure Static Web Apps |

---

## Backend API

**Objectif :** endpoints typés, validation stricte, observable, sécurisé.

### Choix du langage + framework

**Par défaut : Node.js + Hono** (edge-ready, typé, déploiement Cloudflare). Mais le choix dépend de l'écosystème du projet, des compétences client et des contraintes (ML → Python, entreprise → Java/.NET).

| Langage | Framework | Scaffold / setup (dernière version) | Doc officielle | Quand le choisir |
|---|---|---|---|---|
| **Node.js** (défaut) | **Hono** | `npm create hono@latest` | https://hono.dev | Edge, API typée, léger |
| Node.js | Fastify | `npm create fastify@latest` | https://fastify.dev | Serveur Node classique, plugins |
| Node.js | NestJS | `npx @nestjs/cli@latest new` | https://nestjs.com | Grosse app structurée (DI, modules) |
| **Python** | **FastAPI** | `uv init` + `uv add fastapi[standard]` | https://fastapi.tiangolo.com | ML/IA, data, API async typée |
| Python | Django | `uv add django` + `django-admin startproject` | https://docs.djangoproject.com | App full-featured, admin, ORM intégré |
| **Java** | **Spring Boot** | `spring init` (CLI) ou https://start.spring.io | https://spring.io/projects/spring-boot | Entreprise, JVM, robustesse |
| **.NET** | **ASP.NET Core** | `dotnet new webapi` | https://learn.microsoft.com/aspnet/core | Écosystème Microsoft, perf, C# |
| **Go** | Chi / Echo / Gin | `go mod init` + `go get` (voir doc) | https://go.dev / https://echo.labstack.com | Perf, binaire unique, concurrence |

> **Prérequis runtime** : Python (`uv` ou `python 3.12+`), Java (JDK 21+), .NET (SDK 8+), Go (1.22+).
> Si le runtime n'est pas installé, le wizard affiche le lien d'installation officiel — installe la **dernière LTS / stable**.

### Briques transverses (équivalents par écosystème)

| Catégorie | Node | Python | Java (Spring) | .NET |
|---|---|---|---|---|
| Validation | **Zod** | **Pydantic** | Bean Validation (Jakarta) | DataAnnotations / FluentValidation |
| ORM | **Drizzle** | **SQLModel** / SQLAlchemy | Spring Data JPA / Hibernate | EF Core |
| Auth | Clerk SDK / Supabase JWT | python-jose / Clerk | Spring Security | ASP.NET Identity |
| Tests | Vitest | pytest | JUnit 5 | xUnit |
| Rate limit | Arcjet / Upstash | slowapi | Bucket4j / Resilience4j | AspNetCoreRateLimit |
| Logs | Axiom / pino | structlog / loguru | Logback + SLF4J | Serilog |
| Email | Resend | Resend / fastapi-mail | Spring Mail | MailKit |
| Queue | Inngest / BullMQ | Celery / arq | Spring + RabbitMQ | Hangfire |

> Validation reste **obligatoire sur toutes les entrées**, quel que soit le langage (Zod / Pydantic / Bean Validation / DataAnnotations).

### Runtime / déploiement backend

| Stack | Déploiement par défaut |
|---|---|
| Node + Hono (edge) | Cloudflare Workers |
| Node + Fastify/NestJS | Railway / Render (container) |
| Python (FastAPI/Django) | Railway / Render / Fly.io |
| Java Spring Boot | Railway / Azure / AWS (JAR ou container) |
| .NET | Azure App Service / Railway (container) |
| Go | Fly.io / Railway / Cloud Run |

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
| Vectoriel / RAG | **pgvector** (dans Postgres) | Pinecone, Qdrant | Volume très élevé / besoin dédié |

### Vectoriel & IA (pgvector)

Pour l'IA (RAG, recherche sémantique, embeddings), **reste dans Postgres avec `pgvector`** par défaut — pas de DB vectorielle séparée tant que ce n'est pas nécessaire. Image Docker `pgvector/pgvector` ou extension Supabase (`create extension vector`).

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- embedding vector(1536) + index HNSW (cosine) — voir docker/README.md
```

Bascule vers **Qdrant** / **Pinecone** seulement à grande échelle (millions de vecteurs, filtrage avancé, multi-tenant lourd).

---

## Auth

| Contexte | Choix | Raison |
|---|---|---|
| Nouveau projet (défaut) | **Clerk** | Sessions, MFA, OAuth, UI pré-built, edge-compatible |
| Déjà sur Supabase | Supabase Auth | Évite la double dépendance auth |
| **Self-hosted / SSO entreprise** | **Keycloak** | OIDC/SAML, realms, fédération LDAP/AD, open-source |
| Managed entreprise | Auth0 / WorkOS | SSO B2B, SCIM, sans héberger |
| Self-hosted léger, flexible | NextAuth/Auth.js | Contrôle total, DB custom |
| Pas d'UI, API only | Clerk Backend SDK | Vérification JWT sans UI |

### Keycloak (auth self-hosted / entreprise)

Quand le client exige du **SSO d'entreprise** (OIDC/SAML), de la fédération d'identité (LDAP/Active Directory), des **realms** multi-tenants, ou veut éviter un SaaS d'auth externe. Inclus dans `docker/docker-compose.yml` pour le dev local (http://localhost:8080). En prod : conteneur dédié + Postgres + reverse proxy TLS. Vérifie la dernière version sur https://www.keycloak.org.

---

## Déploiement

**Par défaut : Vercel (front) + Cloudflare Workers (API edge).** Le choix dépend du runtime, des contraintes et du budget. Tableau comparatif :

| Plateforme | Idéal pour | Modèle | Notes |
|---|---|---|---|
| **Vercel** | Next.js, fronts | Serverless | Preview par PR, DX top, défaut front |
| **Cloudflare** (Workers/Pages/Containers) | API edge, static, edge compute | Edge / serverless | Global, gratuit généreux, `wrangler deploy` |
| **Railway** | Containers Node/Python/Java | Container PaaS | Pas de cold start, DB managées, simple |
| **Render** | Containers, cron, workers | Container PaaS | Alternative Railway, blueprints YAML |
| **Fly.io** | Apps multi-régions, Go/Rust | Container (machines) | Proche utilisateur, volumes |
| **AWS / GCP / Azure** | Entreprise, contraintes fortes | IaaS/PaaS | Via IaC (Terraform), plus complexe |

Stratégie de promotion : `feat/*` → **preview** · `dev` → **staging** · `main` → **production** (avec approbation manuelle via GitHub Environment).

---

## Conteneurisation — Docker

Templates prêts dans `docker/` (voir `docker/README.md`).

| Élément | Fichier | Usage |
|---|---|---|
| API Node | `Dockerfile.node` | Hono / Fastify / NestJS |
| Next.js | `Dockerfile.nextjs` | App Next.js standalone |
| Python | `Dockerfile.python` | FastAPI / Django (via uv) |
| Stack dev | `docker-compose.yml` | Postgres+pgvector, Redis, Keycloak, Mailpit |

Règles : multi-stage, **non-root**, image slim, healthcheck, digests épinglés en prod, jamais de secret dans l'image. Détail → `.cursor/rules/infra.mdc`.

---

## CI/CD — GitHub Actions

| Workflow | Rôle |
|---|---|
| `ci.yml` | typecheck · lint · format · build (gate `quality` requis) |
| `security.yml` | gitleaks · CodeQL (SAST) · Trivy · dependency-review |
| `release.yml` | versioning sémantique automatique (rc sur dev, stable sur main) |
| `deploy.yml` | déploiement par environnement (Cloudflare/Railway/Render/Vercel/Docker) |

Principes : permissions minimales par job, `concurrency` pour annuler les runs obsolètes, secrets via GitHub Secrets/Environments, production protégée par required reviewers.

---

## Secrets & configuration

| Contexte | Outil |
|---|---|
| CI/CD | GitHub Secrets + Environments |
| Runtime PaaS | Variables d'env de la plateforme (Vercel/Railway/CF) |
| Multi-env / équipe | **Doppler** ou **Infisical** |
| Entreprise / rotation / audit | **HashiCorp Vault** |

`.env.local` ignoré par git · `.env.example` documente les clés (valeurs vides) · jamais de secret commité (vérifié par gitleaks en CI).

---

## Infrastructure as Code (IaC)

| Outil | Quand |
|---|---|
| **Terraform** (défaut) | Multi-cloud, ressources versionnées, standard de l'industrie |
| Pulumi | Préférence TypeScript/Python plutôt que HCL |
| SST | Full AWS + TypeScript, apps serverless |

Squelette dans `infra/terraform/`. Utiliser dès qu'il y a plusieurs environnements ou des ressources cloud à versionner. State distant + lock obligatoire en équipe. Pour Vercel/Railway/Render simples, la config plateforme suffit souvent.

---

## Observabilité

| Outil | Ce qu'il surveille | Quand l'ajouter |
|---|---|---|
| **Sentry** | Erreurs JS, traces back/front | Dès le MVP |
| **Axiom** | Logs structurés (serverless-friendly) | Dès que backend en prod |
| **OpenTelemetry** | Traces/metrics/logs standardisés | App distribuée, multi-service |
| **Grafana / Prometheus** | Dashboards, metrics, alertes | Self-hosted / entreprise |
| **PostHog** | Funnel, événements, feature flags | Dès que users en prod |
| **BetterStack / Checkly** | Uptime + E2E synthétique | Après lancement |

> Pour une app multi-service, instrumente avec **OpenTelemetry** (standard vendor-neutral) et exporte vers Sentry/Axiom/Grafana/Datadog selon le contexte. Expose `/health` et `/ready` pour les orchestrateurs (Docker, K8s, Railway).

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
| Secret scanning | **gitleaks** (CI) | Tout le repo |
| SAST | **CodeQL** (CI) | Code applicatif |
| Vulns deps/images | **Trivy** + Dependabot | Deps + images Docker |

### Sécurité supply-chain (CI)

Le workflow `.github/workflows/security.yml` exécute en continu : **gitleaks** (secrets), **CodeQL** (analyse statique), **Trivy** (vulnérabilités deps + filesystem), **dependency-review** (deps ajoutées dans la PR). Dependabot (`.github/dependabot.yml`) ouvre les PR de mise à jour. Une faille HIGH/CRITICAL casse la CI.

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

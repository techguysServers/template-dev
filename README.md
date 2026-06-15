# template-dev

Template de développement TechGuys — multi-domaine, AI-ready, prêt à déployer.

Couvre : **Landing page · Frontend app · Backend API · Base de données · Auth · Déploiement · Sécurité · Observabilité**

---

## Quickstart

```bash
# 1. Créer un repo depuis ce template (bouton "Use this template" sur GitHub)
# 2. Cloner le repo
git clone https://github.com/techguysServers/{nom-du-repo}.git
cd {nom-du-repo}

# 3. Lancer le wizard de setup
$env:GITHUB_TOKEN="ghp_xxxx"   # Windows PowerShell
node scripts/setup.js
```

Le wizard te guide pour :
- Scaffolder le bon projet selon ce que tu construis
- Configurer GitHub (labels, branch protection)
- Connecter Asana (sync bidirectionnelle)

---

## Structure du repo

```
template-dev/
├── landing-page/           ← Next.js 16 + Tailwind v4 + shadcn/ui (ready)
├── frontend/               ← Frontend app (scaffold via wizard)
├── backend/                ← Backend API (scaffold via wizard)
├── scripts/
│   └── setup.js            ← Wizard interactif (scaffold + GitHub + Asana)
├── .cursor/rules/          ← Règles Cursor AI (architecture, qualité, sécurité…)
├── .github/
│   ├── copilot-instructions.md  ← GitHub Copilot
│   └── workflows/          ← CI/CD + Asana sync
├── CLAUDE.md               ← Instructions Claude Code
├── STACK.md                ← Décisions technologiques par domaine
└── TEMPLATE_SOP.md         ← Procédure complète (workflow, PR, commits…)
```

---

## Stack par domaine

Le wizard et `STACK.md` couvrent **toutes** ces options. Le tableau ci-dessous = les **défauts** ; chaque ligne a des alternatives valides (frameworks, langages) détaillées dans `STACK.md`.

| Domaine | Défaut | Alternatives couvertes |
|---|---|---|
| **Landing page** | Astro | Next.js |
| **Frontend app** | Next.js (React) | Nuxt · Angular · SvelteKit · Remix · React/Vue Vite |
| **Backend API** | Node.js + Hono | Fastify · NestJS · Python (FastAPI/Django) · Java (Spring Boot) · .NET · Go |
| **Base de données** | Supabase (Postgres) + Drizzle | Neon · Prisma · SQLModel · JPA · EF Core |
| **Auth** | Clerk | Supabase Auth · NextAuth · Auth0 |
| **Deploy** | Vercel | Cloudflare Workers · Railway · Render · Fly.io · Azure |
| **Observabilité** | Sentry · Axiom · PostHog | — |
| **Tests** | Vitest · RTL · Playwright | pytest · JUnit · xUnit |

> ⚠️ **Toujours la dernière version.** Le wizard utilise les commandes officielles `@latest`. En cas de doute sur une commande/version, consulte la doc officielle (liens dans `STACK.md`).

Détail complet et arbre de décision → [STACK.md](./STACK.md)

---

## Pour les AI agents (Claude, Cursor, Copilot)

| IDE / Outil | Fichier de règles |
|---|---|
| **Claude Code** | `CLAUDE.md` (ce repo) |
| **Cursor** | `.cursor/rules/*.mdc` |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Windsurf / Zed** | `.github/copilot-instructions.md` (compatible) |

---

## Workflow de développement

```
main ← PR from dev (stable, CI obligatoire)
dev  ← PR from feat/*
feat/<slug> ← une feature = une branche = une issue
```

1. Créer une issue GitHub (ou sync depuis Asana)
2. `git checkout dev && git pull`
3. `git checkout -b feat/nom-feature`
4. Développer, commits atomiques
5. Quality gates : `npm run typecheck && npm run lint && npm run format && npm run build`
6. Push + PR vers `dev`
7. Review → merge → deploy auto

Procédure détaillée → [TEMPLATE_SOP.md](./TEMPLATE_SOP.md)

---

## Prérequis

- Node.js 20+
- Git
- Compte GitHub avec accès à `techguysServers`
- Token GitHub : `repo` + `admin:repo_hook` → [github.com/settings/tokens](https://github.com/settings/tokens)

---

## Références

| Ressource | Lien |
|---|---|
| Stack decisions | [STACK.md](./STACK.md) |
| Procédure complète | [TEMPLATE_SOP.md](./TEMPLATE_SOP.md) |
| Instructions AI | [CLAUDE.md](./CLAUDE.md) |
| Shadcn/ui | https://ui.shadcn.com |
| Hono | https://hono.dev |
| Drizzle | https://orm.drizzle.team |
| Conventional Commits | https://www.conventionalcommits.org |

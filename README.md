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

| Domaine | Stack par défaut |
|---|---|
| **Landing page** | Astro ou Next.js · Tailwind v4 · shadcn/ui |
| **Frontend app** | Next.js 15 App Router · Zustand · TanStack Query · Clerk |
| **Backend API** | Hono (edge) · Zod · Arcjet · Cloudflare Workers |
| **Base de données** | Supabase (Postgres) · Drizzle ORM |
| **Auth** | Clerk (défaut) · Supabase Auth |
| **Deploy** | Vercel · Cloudflare Workers · Railway |
| **Observabilité** | Sentry · Axiom · PostHog |
| **Tests** | Vitest · React Testing Library · Playwright |

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

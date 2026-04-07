# template-dev

Template de développement landing page — Next.js 16 · React 19 · TypeScript · Tailwind v4 · Shadcn/ui.

---

## Utiliser ce template

### Prérequis

- Node.js 20+
- Git + Git Bash (Windows)
- Un compte GitHub avec accès admin au repo
- Un projet Asana avec les sections : `to-do`, `doing`, `review/test`, `done`

---

## Setup — 3 étapes

### Step 1 — Setup GitHub (labels + branch protection)

Génère un token GitHub sur [github.com/settings/tokens](https://github.com/settings/tokens)
Scopes requis : `repo`, `admin:repo_hook`

```powershell
$env:GITHUB_TOKEN="ghp_xxx"
node scripts/setup.js
```

Menu → **1. Setup GitHub**

Ce que ça fait :
- Supprime les labels par défaut GitHub
- Recrée les 57 labels du projet depuis `.github/labels.json`
- Protège les branches `main` et `dev` (PR only, 1 reviewer, CI 100% requis)

---

### Step 2 — Setup Asana (tokens)

Dans le même menu → **2. Setup Asana**

Tu auras besoin de :
- `ASANA_PAT` — token personnel Asana → [app.asana.com/0/my-profile-settings/apps](https://app.asana.com/0/my-profile-settings/apps)
- `ASANA_PROJECT_GID` — GID du projet Asana (visible dans l'URL : `/0/{GID}/...`)

Le script affiche le lien direct pour coller ces valeurs dans GitHub Secrets :
`https://github.com/{owner}/{repo}/settings/secrets/actions`

---

### Step 3 — Sync initiale Asana → GitHub

Une fois les secrets ajoutés :

GitHub → **Actions** → **Asana sync** → **Run workflow**

Ce que ça fait :
- Importe toutes les tâches Asana comme Issues GitHub
- Crée les Milestones depuis les sections `Phase X`
- Assigne les labels `jalon:phase-N` et `asana-synced`
- Ignore les tâches avec `[lock]` dans le nom

---

## C'est parti

À partir de là tout est automatique :

| Déclencheur | Action |
|---|---|
| Toutes les 30 min | Asana → GitHub (nouvelles tâches, mises à jour) |
| PR ouverte / rouverte | Tâche Asana → `review/test` |
| PR : changes requested | Tâche Asana → `doing` |
| PR : approved | Tâche Asana → `review/test` |
| PR mergée | Tâche Asana → `done` |
| PR fermée sans merge | Tâche Asana → `doing` |
| Issue rouverte | Tâche Asana → `doing` |
| Push sur `dev` si `labels.json` modifié | Labels mis à jour automatiquement |
| PR mergée sur `main` | Release GitHub créée, version bump |

---

## Git flow

```
main          ← PR depuis dev uniquement (stable, CI 100% requis)
dev           ← PR depuis feat/* (intégration, CI 100% requis)
dev-config    ← changements de config uniquement, depuis dev
feat/<slug>   ← une feature = une branche, depuis dev
```

**Une PR = une issue = une feature.**
Lier la PR à l'issue avec `Closes #N` ou `Fixes #N` dans le body — c'est ce qui déclenche la sync Asana.

---

## Commits

Format obligatoire — [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description courte

# Types : feat | fix | chore | refactor | perf | docs | style | test | ci | revert
# Scope : ui | design-system | seo | a11y | perf | infra | config | deps | auth | api
```

---

## Qualité — gates obligatoires avant PR

```bash
cd landing-page
npm run typecheck   # TypeScript strict
npm run lint        # ESLint
npm run format      # Prettier
npm run build       # Next.js build
```

Les 4 doivent passer à 100%. La CI les vérifie automatiquement sur chaque PR.

---

## Développement

```bash
cd landing-page
npm install
npm run dev
```

**Step 1 obligatoire :** avant de développer quoi que ce soit, créer une branche `feat/design-system` et builder la page vitrine de tous les composants Shadcn avec le `globals.css` du projet. Cette page sert de référence design system pour toute la suite.

---

## Stack

| Outil | Rôle |
|---|---|
| Next.js 16 | Framework React (App Router) |
| React 19 | UI |
| TypeScript strict | Typage |
| Tailwind CSS v4 | Styles |
| Shadcn/ui | Composants UI |
| Prettier | Formatage |
| ESLint | Linting |
| Dependabot | MAJ deps auto (hebdo → `dev`) |

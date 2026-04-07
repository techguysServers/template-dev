# TEMPLATE SOP — Standard Operating Procedure

> Ce document est la référence complète pour tout dev qui utilise ce template.
> Lis-le une fois en entier avant de commencer.

---

## Table des matières

1. [Créer le repo depuis le template](#1-créer-le-repo-depuis-le-template)
2. [Setup initial](#2-setup-initial)
3. [Configurer son environnement local](#3-configurer-son-environnement-local)
4. [Workflow de développement](#4-workflow-de-développement)
5. [Step obligatoire — Design System](#5-step-obligatoire--design-system)
6. [Comment développer une feature](#6-comment-développer-une-feature)
7. [Ouvrir une Pull Request](#7-ouvrir-une-pull-request)
8. [Qualité — gates obligatoires](#8-qualité--gates-obligatoires)
9. [Commits conventionnels](#9-commits-conventionnels)
10. [Références](#10-références)

---

## 1. Créer le repo depuis le template

1. Aller sur le repo template GitHub
2. Cliquer **"Use this template"** → **"Create a new repository"**
3. Nommer le repo, choisir l'organisation **techguysServers**
4. Visibilité : **Private**
5. Cliquer **"Create repository"**
6. Cloner le repo en local :
   ```bash
   git clone https://github.com/techguysServers/{nom-du-repo}.git
   cd {nom-du-repo}
   ```

---

## 2. Setup initial

> À faire une seule fois après la création du repo. Durée : ~10 min.

### Prérequis

- Node.js 20+ installé
- Git Bash installé (Windows)
- Token GitHub avec scopes `repo` + `admin:repo_hook` → [github.com/settings/tokens](https://github.com/settings/tokens)
- Accès admin au projet Asana

### Lancer le wizard

```powershell
# Windows PowerShell
$env:GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
node scripts/setup.js
```

```bash
# Git Bash / Mac / Linux
GITHUB_TOKEN="ghp_xxxxxxxxxxxx" node scripts/setup.js
```

### Menu — Step 1 : Setup GitHub

Choisir **1. Setup GitHub** dans le menu.

Ce que ça fait automatiquement :
- Supprime les labels par défaut de GitHub
- Crée les 57 labels du projet (types, statuts, priorités, jalons, epics…)
- Protège les branches `main` et `dev` :
  - PR obligatoire (pas de push direct)
  - 1 reviewer minimum
  - CI doit passer à 100%

### Menu — Step 2 : Setup Asana

Choisir **2. Setup Asana** dans le menu.

Tu auras besoin de :
- **ASANA_PAT** — token Asana → [app.asana.com/0/my-profile-settings/apps](https://app.asana.com/0/my-profile-settings/apps)
- **ASANA_PROJECT_GID** — GID du projet visible dans l'URL Asana : `app.asana.com/0/{GID}/...`

Le script affiche les deux secrets à coller dans :
`https://github.com/techguysServers/{repo}/settings/secrets/actions`

### Step 3 : Sync initiale Asana → GitHub

Une fois les secrets ajoutés dans GitHub :

1. Aller dans l'onglet **Actions** du repo GitHub
2. Sélectionner le workflow **"Asana sync"**
3. Cliquer **"Run workflow"**

Ce que ça crée :
- Une **Issue GitHub** par tâche Asana (hors tâches `[lock]`)
- Un **Milestone** par section `Phase X` du projet Asana
- Les labels `asana-synced` + `jalon:phase-N` sur chaque issue

---

## 3. Configurer son environnement local

```bash
cd landing-page
npm install
cp ../.env.example .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Extensions recommandées

Le repo propose automatiquement les extensions VSCode à installer.
Accepter la suggestion ou installer manuellement :
- **Prettier** — formatage auto à la sauvegarde
- **ESLint** — erreurs en temps réel
- **Tailwind CSS IntelliSense** — autocomplétion des classes
- **TypeScript** — vérification de types

### Modèle AI recommandé

- **Cursor** : Claude Sonnet 4.6 (sélectionner dans la barre en bas)
- **VSCode + Copilot** : configurable dans les settings
- **Claude.ai** : claude-sonnet-4-6

> Le modèle n'a pas à sur-réfléchir. Il exécute les tâches définies dans Asana. Tout le contexte est dans les issues GitHub.

---

## 4. Workflow de développement

### Structure des branches

```
main          ← production stable (PR depuis dev uniquement)
dev           ← intégration (PR depuis feat/* uniquement)
dev-config    ← changements de config/CI uniquement, depuis dev
feat/<slug>   ← une feature = une branche = une issue
```

### Règles absolues

- **Jamais de push direct sur `main` ou `dev`**
- **Une feature = une branche = une issue Asana**
- **Une branche = plusieurs commits atomiques**
- **Toujours partir de `dev` pour créer une feature**

### Flux automatique Asana ↔ GitHub

| Événement GitHub | Mise à jour Asana |
|---|---|
| PR ouverte / rouverte | Tâche → `review/test` |
| PR : changes requested | Tâche → `doing` |
| PR : approved | Tâche → `review/test` |
| PR mergée | Tâche → `done` |
| PR fermée sans merge | Tâche → `doing` |
| Issue rouverte | Tâche → `doing` |
| Toutes les 30 min | Nouvelles tâches Asana → Issues GitHub |

---

## 5. Step obligatoire — Design System

**Avant tout développement de feature**, la première branche doit être le design system.

```bash
git checkout dev
git pull
git checkout -b feat/design-system
```

### Ce qu'il faut faire

1. Définir les variables CSS dans `landing-page/app/globals.css` :
   - Couleurs primaires, secondaires, neutres
   - Typographie (font-family, tailles)
   - Spacing, border-radius, shadows
   - Mode sombre (dark mode)

2. Créer une page `landing-page/app/design-system/page.tsx` qui affiche **tous les composants Shadcn** disponibles dans `components/ui/` avec les couleurs du projet.

3. Cette page est la référence visuelle pour toute la suite du développement. **Elle ne sera pas en production** (la route peut être supprimée avant le déploiement).

### Pourquoi c'est obligatoire

Le premier prompt de dev au modèle AI doit être :
> "Voici le design system du projet [coller le contenu de globals.css]. Utilise exclusivement ces variables et ces composants Shadcn."

Sans ça, le modèle invente des couleurs et des styles incohérents.

---

## 6. Comment développer une feature

### 1. Récupérer la tâche depuis GitHub

Aller dans **Issues** du repo GitHub, choisir une issue avec le label `status:ready`.

Copier :
- Le **titre** de l'issue (= nom de la feature)
- La **description** complète (= contexte fourni par Asana)
- Le **numéro** de l'issue (ex: `#42`)

### 2. Créer la branche

```bash
git checkout dev
git pull
git checkout -b feat/nom-court-de-la-feature
```

Exemple : `feat/hero-section`, `feat/contact-form`, `feat/seo-meta`

### 3. Premier prompt dans l'IDE

Ouvrir Cursor ou VSCode avec Copilot et envoyer ce prompt :

```
Contexte du projet : [coller la description Asana depuis l'issue GitHub #XX]

Design system : utilise exclusivement les variables CSS de globals.css
et les composants Shadcn disponibles dans components/ui/.

Architecture : component-first.
- La page app/(routes)/nom-page/page.tsx est un shell (pas de logique UI dedans)
- Tous les composants UI sont dans components/nom-page/
- Miroir exact entre app/ et components/

Tâche : [décrire ce qu'il faut faire]
```

### 4. Développer

Règles d'architecture à respecter :

```
landing-page/
  app/
    (routes)/
      nom-page/
        page.tsx          ← thin shell, importe le composant page, pas de JSX direct
  components/
    ui/                   ← Shadcn uniquement, ne pas modifier
    nom-page/             ← miroir de app/(routes)/nom-page/
      NomPageHero.tsx
      NomPageFeatures.tsx
    shared/               ← réutilisé sur plusieurs pages
  hooks/                  ← custom hooks si logique > ~15 lignes
```

Checklist pendant le dev :
- [ ] `"use client"` uniquement si vraiment nécessaire (event handlers, hooks browser)
- [ ] Server Components par défaut
- [ ] Pas de `any` TypeScript
- [ ] `cn()` de `@/lib/utils` pour merger les classes Tailwind
- [ ] Pas de `console.log`
- [ ] Alt sur toutes les images, sémantique HTML correcte
- [ ] Chaque page exporte `metadata` ou `generateMetadata`

### 5. Commits atomiques

Un commit = une unité logique de travail. Format obligatoire :

```bash
git add .
git commit -m "feat(ui): add Hero section with CTA button"
git commit -m "feat(seo): add metadata to landing page"
git commit -m "fix(a11y): add aria-label to navigation links"
```

---

## 7. Ouvrir une Pull Request

### 1. Pousser la branche

```bash
git push -u origin feat/nom-de-la-feature
```

### 2. Créer la PR sur GitHub

GitHub propose automatiquement de créer une PR. Cliquer **"Compare & pull request"**.

- **Base** : `dev`
- **Title** : `feat(scope): description courte`
- **Body** : remplir le template automatiquement chargé

### 3. Remplir le template PR

Points critiques :
- **Lier l'issue** avec `Closes #N` ou `Fixes #N` dans le body → déclenche la sync Asana automatiquement
- **Version bump** : choisir `release:major`, `release:minor` ou `release:patch`
- **CHANGELOG** : ajouter une ligne sous `## [Unreleased]` dans `CHANGELOG.md`
- **Checklist** : tout cocher avant de demander une review

### 4. Assigner un reviewer

Assigner **@Miche1-Pierre** (ou le lead désigné) comme reviewer.
Le reviewer reçoit une notification automatique via CODEOWNERS.

### 5. Attendre la CI

La CI tourne automatiquement et vérifie :
- Prettier (formatage)
- ESLint (linting)
- TypeScript (typage strict)
- Next.js build (compilation)

**Les 4 doivent passer à 100%.** Si un check échoue, corriger avant de demander une review.

---

## 8. Qualité — gates obligatoires

Lancer ces commandes **avant chaque PR**, dans `landing-page/` :

```bash
npm run typecheck   # TypeScript strict — zéro erreur
npm run lint        # ESLint — zéro warning
npm run format      # Prettier — applique le formatage
npm run build       # Next.js build — doit compiler sans erreur
```

Raccourci pour tout vérifier d'un coup :

```bash
npm run typecheck && npm run lint && npm run format && npm run build
```

---

## 9. Commits conventionnels

Format : `type(scope): description courte en impératif`

### Types

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `chore` | Maintenance, tooling |
| `refactor` | Refacto sans changement fonctionnel |
| `perf` | Amélioration de performance |
| `docs` | Documentation uniquement |
| `style` | Formatage, pas de changement logique |
| `test` | Ajout ou modif de tests |
| `ci` | CI/CD |
| `revert` | Revert d'un commit précédent |

### Scopes

`ui` · `design-system` · `seo` · `a11y` · `perf` · `infra` · `config` · `deps` · `auth` · `api`

### Exemples

```bash
feat(ui): add pricing section component
fix(seo): add missing og:image meta tag
chore(deps): update next to 16.2.0
refactor(ui): extract CTA button to shared component
perf(images): convert hero image to webp
ci: add typecheck step to CI workflow
```

---

## 10. Références

| Ressource | Lien |
|---|---|
| Repo GitHub | `https://github.com/techguysServers/{repo}` |
| Issues / tâches | `https://github.com/techguysServers/{repo}/issues` |
| Actions CI | `https://github.com/techguysServers/{repo}/actions` |
| GitHub Secrets | `https://github.com/techguysServers/{repo}/settings/secrets/actions` |
| Asana project | `https://app.asana.com/0/{ASANA_PROJECT_GID}` |
| Token Asana | `https://app.asana.com/0/my-profile-settings/apps` |
| Token GitHub | `https://github.com/settings/tokens` |
| Shadcn/ui docs | `https://ui.shadcn.com` |
| Conventional Commits | `https://www.conventionalcommits.org` |
| Keep a Changelog | `https://keepachangelog.com` |

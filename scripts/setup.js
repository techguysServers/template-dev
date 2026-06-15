#!/usr/bin/env node
/**
 * Setup wizard — lance avec : node scripts/setup.js
 *
 *   Scaffold project  → crée landing / frontend / backend (toute techno)
 *   Setup GitHub       → labels + branch protection (nécessite GITHUB_TOKEN)
 *   Setup Asana        → secrets de sync (nécessite GITHUB_TOKEN)
 *
 * Principe : chaque scaffold utilise la commande OFFICIELLE en @latest
 * (donc toujours la dernière version). Si une techno n'est pas scaffoldable
 * automatiquement, le wizard renvoie vers la doc officielle.
 */

import readline from "readline"
import { execSync, spawnSync } from "child_process"
import { readFileSync, existsSync } from "fs"
import { Octokit } from "@octokit/rest"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((r) => rl.question(q, r))

function run(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: "utf8", ...opts }).trim() } catch { return null }
}

function runOrFail(cmd, opts = {}) {
  console.log(`\n  $ ${cmd}\n`)
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts })
  if (result.status !== 0) throw new Error(`Command failed: ${cmd}`)
}

function banner(title) {
  console.log(`\n${"─".repeat(64)}\n  ${title}\n${"─".repeat(64)}`)
}

function success(msg) { console.log(`  ✓ ${msg}`) }
function info(msg)    { console.log(`  · ${msg}`) }
function warn(msg)    { console.log(`  ! ${msg}`) }
function err(msg)     { console.error(`  ✗ ${msg}`) }
function step(n, total, msg) { console.log(`\n[${n}/${total}] ${msg}`) }

// ── Repo detection ────────────────────────────────────────────────────────────

async function getRepo() {
  let repoArg = process.env.GITHUB_REPO

  if (!repoArg) {
    const remote = run("git remote get-url origin")
    if (remote) {
      const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/)
      if (m) repoArg = m[1]
    }
  }

  if (repoArg) {
    const confirm = await ask(`\nRepo détecté : ${repoArg}. Confirmer ? [Y/n] `)
    if (confirm.toLowerCase() === "n") repoArg = null
  }

  if (!repoArg) {
    repoArg = await ask("GitHub repo (owner/repo) : ")
  }

  return repoArg.trim()
}

// ── Registre des stacks ─────────────────────────────────────────────────────
//
// Chaque entrée décrit COMMENT scaffolder, en s'appuyant sur la commande
// officielle (toujours @latest → dernière version). `prereq` vérifie qu'un
// runtime est installé (Python/JDK/.NET/Go). `scaffold(dir)` renvoie la commande
// shell, ou null si l'outil ne supporte pas le scaffold non-interactif → on
// renvoie alors vers la doc. `notes` = étapes/conventions TechGuys à appliquer.

const FRONTEND_STACKS = [
  {
    name: "Next.js (React) — défaut",
    docs: "https://nextjs.org/docs/app/getting-started/installation",
    scaffold: (dir) =>
      `npx create-next-app@latest ${dir} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`,
    notes: [
      "Ajoute shadcn/ui : cd " + "<dir>" + " && npx shadcn@latest init",
      "State : Zustand + TanStack Query. Forms : React Hook Form + Zod.",
      "Architecture component-first (voir CLAUDE.md / .cursor/rules/architecture.mdc).",
    ],
  },
  {
    name: "Nuxt (Vue)",
    docs: "https://nuxt.com/docs/getting-started/installation",
    scaffold: (dir) => `npm create nuxt@latest ${dir}`,
    notes: [
      "State : Pinia. Data : useFetch / TanStack Query Vue.",
      "UI : shadcn-vue (https://www.shadcn-vue.com) ou PrimeVue.",
    ],
  },
  {
    name: "Angular",
    docs: "https://angular.dev/installation",
    scaffold: (dir) => `npx @angular/cli@latest new ${dir} --style=css --routing`,
    notes: [
      "UI : Angular Material (ng add @angular/material) ou PrimeNG.",
      "State : Signals + services, ou NgRx si état complexe.",
    ],
  },
  {
    name: "SvelteKit",
    docs: "https://svelte.dev/docs/kit/creating-a-project",
    scaffold: (dir) => `npx sv create ${dir}`,
    notes: [
      "La commande de scaffold évolue (anciennement create-svelte → sv).",
      "Vérifie la doc officielle si `sv` échoue.",
    ],
  },
  {
    name: "Remix / React Router 7",
    docs: "https://reactrouter.com/start/framework/installation",
    scaffold: (dir) => `npx create-react-router@latest ${dir}`,
    notes: ["Web standards, nested routing, loaders/actions."],
  },
  {
    name: "React + Vite (SPA)",
    docs: "https://vite.dev/guide/",
    scaffold: (dir) => `npm create vite@latest ${dir} -- --template react-ts`,
    notes: [
      "Pas de SSR/SEO. Ajoute Tailwind : npm i tailwindcss @tailwindcss/vite.",
      "Routing : react-router-dom. State : Zustand + TanStack Query.",
    ],
  },
  {
    name: "Vue + Vite (SPA)",
    docs: "https://vuejs.org/guide/quick-start",
    scaffold: (dir) => `npm create vue@latest ${dir}`,
    notes: ["State : Pinia. UI : shadcn-vue ou PrimeVue."],
  },
]

const BACKEND_STACKS = [
  {
    name: "Node.js + Hono (edge) — défaut",
    docs: "https://hono.dev/docs/getting-started/basic",
    scaffold: (dir) => `npm create hono@latest ${dir}`,
    notes: [
      "Validation : Zod sur TOUTES les entrées.",
      "Auth : @clerk/backend. Rate limit : @arcjet/node. Logs : Axiom/pino.",
      "Déploiement : Cloudflare Workers (edge) ou Node/Railway.",
    ],
  },
  {
    name: "Node.js + Fastify",
    docs: "https://fastify.dev/docs/latest/Guides/Getting-Started/",
    scaffold: (dir) => `npm create fastify@latest -- --dir ${dir} --lang ts`,
    notes: ["Validation : Zod / JSON Schema. ORM : Drizzle."],
  },
  {
    name: "Node.js + NestJS",
    docs: "https://docs.nestjs.com/first-steps",
    scaffold: (dir) => `npx @nestjs/cli@latest new ${dir} --package-manager npm`,
    notes: ["Structuré (DI, modules). Validation : class-validator + Zod."],
  },
  {
    name: "Python + FastAPI",
    docs: "https://fastapi.tiangolo.com/#installation",
    prereq: { cmd: "uv --version", name: "uv (Python)", installUrl: "https://docs.astral.sh/uv/getting-started/installation/" },
    scaffold: null, // setup multi-étapes : on guide
    manual: (dir) => [
      `uv init ${dir}`,
      `cd ${dir}`,
      `uv add "fastapi[standard]" pydantic sqlmodel`,
      `uv run fastapi dev`,
    ],
    notes: [
      "Validation : Pydantic. ORM : SQLModel/SQLAlchemy. Tests : pytest.",
      "uv = gestionnaire moderne (remplace pip/venv). Sinon : python -m venv + pip.",
    ],
  },
  {
    name: "Python + Django",
    docs: "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
    prereq: { cmd: "uv --version", name: "uv (Python)", installUrl: "https://docs.astral.sh/uv/getting-started/installation/" },
    scaffold: null,
    manual: (dir) => [
      `uv init ${dir}`,
      `cd ${dir}`,
      `uv add django`,
      `uv run django-admin startproject config .`,
      `uv run python manage.py runserver`,
    ],
    notes: ["ORM + admin intégrés. DRF pour les API REST."],
  },
  {
    name: "Java + Spring Boot",
    docs: "https://spring.io/quickstart",
    prereq: { cmd: "java -version", name: "JDK 21+", installUrl: "https://adoptium.net/" },
    scaffold: null,
    manual: (dir) => [
      "Génère le projet sur https://start.spring.io",
      "  · Project: Gradle/Maven · Language: Java · Spring Boot: dernière stable",
      "  · Dependencies: Spring Web, Spring Data JPA, Validation, PostgreSQL Driver",
      `Dézippe le résultat dans ${dir}/`,
      "Ou via CLI : spring init --dependencies=web,data-jpa,validation " + dir,
    ],
    notes: ["Validation : Bean Validation. Sécurité : Spring Security."],
  },
  {
    name: ".NET + ASP.NET Core",
    docs: "https://learn.microsoft.com/aspnet/core/tutorials/min-web-api",
    prereq: { cmd: "dotnet --version", name: ".NET SDK 8+", installUrl: "https://dotnet.microsoft.com/download" },
    scaffold: (dir) => `dotnet new webapi -o ${dir}`,
    notes: ["Validation : DataAnnotations / FluentValidation. ORM : EF Core."],
  },
  {
    name: "Go (Chi / Echo)",
    docs: "https://go.dev/doc/tutorial/web-service-gin",
    prereq: { cmd: "go version", name: "Go 1.22+", installUrl: "https://go.dev/dl/" },
    scaffold: null,
    manual: (dir) => [
      `mkdir ${dir} && cd ${dir}`,
      `go mod init github.com/techguysServers/${dir}`,
      `go get github.com/go-chi/chi/v5   # ou github.com/labstack/echo/v4`,
      "Crée main.go (voir doc officielle pour le boilerplate à jour).",
    ],
    notes: ["Binaire unique, perf, concurrence. ORM : sqlc / GORM."],
  },
]

// ── Scaffold — moteur générique ──────────────────────────────────────────────

function checkPrereq(prereq) {
  if (!prereq) return true
  const ok = run(prereq.cmd) !== null
  if (!ok) {
    warn(`${prereq.name} non détecté.`)
    info(`Installe la dernière version stable : ${prereq.installUrl}`)
  }
  return ok
}

async function pickAndScaffold(label, stacks) {
  banner(`Scaffold — ${label}`)

  console.log(`\nChoisis la techno (toutes valides — le défaut est en premier) :`)
  stacks.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`))
  console.log(`\n  ⚠ Rappel : le wizard utilise les commandes officielles @latest.`)
  console.log(`     Si une commande a changé, va voir la doc officielle (affichée à chaque étape).`)

  const choice = parseInt((await ask("\nChoix : ")).trim(), 10)
  const stack = stacks[choice - 1]
  if (!stack) { err("Choix invalide."); return }

  const dir = (await ask(`Nom du dossier [${label === "Frontend app" ? "frontend" : "backend"}] : `)).trim()
    || (label === "Frontend app" ? "frontend" : "backend")

  if (existsSync(dir)) {
    const overwrite = (await ask(`\nLe dossier ${dir}/ existe déjà. Continuer quand même ? [o/N] `)).trim().toLowerCase()
    if (overwrite !== "o") { info("Scaffold annulé."); return }
  }

  console.log(`\n  📖 Doc officielle : ${stack.docs}`)

  // Prérequis runtime (Python/Java/.NET/Go)
  if (stack.prereq && !checkPrereq(stack.prereq)) {
    const cont = (await ask("\nContinuer malgré le prérequis manquant ? [o/N] ")).trim().toLowerCase()
    if (cont !== "o") { info("Scaffold annulé — installe le prérequis puis relance."); return }
  }

  // Scaffold automatique OU guide manuel
  if (typeof stack.scaffold === "function" && stack.scaffold(dir)) {
    try {
      runOrFail(stack.scaffold(dir))
      success(`${stack.name} scaffoldé dans ${dir}/`)
    } catch (e) {
      err(`Le scaffold a échoué : ${e.message}`)
      warn(`La commande a peut-être changé — vérifie la doc : ${stack.docs}`)
      return
    }
  } else if (typeof stack.manual === "function") {
    console.log(`\n  Cette techno se met en place à la main (étapes officielles) :\n`)
    stack.manual(dir).forEach((line) => console.log(`    ${line.startsWith(" ") ? line : "› " + line}`))
    console.log(`\n  → Vérifie toujours la dernière version sur : ${stack.docs}`)
  }

  // Conventions / next steps TechGuys
  if (stack.notes?.length) {
    console.log(`\n  Conventions TechGuys à appliquer :`)
    stack.notes.forEach((n) => console.log(`    · ${n.replace("<dir>", dir)}`))
  }

  // Commit
  await offerCommit(dir, label.toLowerCase())
}

async function scaffoldLandingChoice() {
  banner("Scaffold — Landing page")
  console.log(`
Une landing page privilégie le SEO et la perf.
  1. Astro          (statique, SEO pur — npm create astro@latest)
  2. Next.js        (si interactivité/auth — déjà dans landing-page/)
  3. Autre framework (voir liste Frontend)
`)
  const c = (await ask("Choix : ")).trim()
  if (c === "2") {
    info("landing-page/ est déjà configuré (Next.js 16 + Tailwind + shadcn).")
    info("Lance : cd landing-page && npm install && npm run dev")
    return
  }
  if (c === "1") {
    const dir = (await ask("Nom du dossier [astro-landing] : ")).trim() || "astro-landing"
    console.log(`\n  📖 Doc officielle : https://docs.astro.build`)
    try {
      runOrFail(`npm create astro@latest ${dir} -- --template minimal --typescript strict --git false`)
      info("Tailwind : cd " + dir + " && npx astro add tailwind")
      info("shadcn (via React) : npx astro add react puis npx shadcn@latest init")
      success(`Astro scaffoldé dans ${dir}/`)
      await offerCommit(dir, "astro landing page")
    } catch (e) {
      err(`Échec : ${e.message} — voir https://docs.astro.build`)
    }
    return
  }
  await pickAndScaffold("Frontend app", FRONTEND_STACKS)
}

async function scaffoldProject() {
  banner("Scaffold project")
  console.log(`
Qu'est-ce que tu construis ?
  1. Landing page    (Astro / Next.js)
  2. Frontend app    (Next.js, Nuxt, Angular, SvelteKit, Remix, Vite…)
  3. Backend API     (Node, Python, Java, .NET, Go…)
  4. Full-stack      (frontend + backend)
  5. DevOps / Infra  (Docker, compose, CI/CD, déploiement)
`)
  const choice = (await ask("Choix : ")).trim()
  switch (choice) {
    case "1": await scaffoldLandingChoice(); break
    case "2": await pickAndScaffold("Frontend app", FRONTEND_STACKS); break
    case "3": await pickAndScaffold("Backend API", BACKEND_STACKS); break
    case "4":
      await pickAndScaffold("Frontend app", FRONTEND_STACKS)
      await pickAndScaffold("Backend API", BACKEND_STACKS)
      break
    case "5": await setupInfra(); break
    default: err("Choix invalide.")
  }
}

// ── DevOps / Infra ───────────────────────────────────────────────────────────

async function setupInfra() {
  banner("DevOps / Infra")

  const hasDocker = run("docker --version") !== null
  const hasCompose = run("docker compose version") !== null

  console.log(`
Ce template fournit déjà (présents dans le repo) :
  · docker/Dockerfile.node | .nextjs | .python   (multi-stage, non-root)
  · docker/docker-compose.yml                     (Postgres+pgvector, Redis, Keycloak, Mailpit)
  · .github/workflows/security.yml                (gitleaks, CodeQL, Trivy, dependency-review)
  · .github/workflows/deploy.yml                  (templates Cloudflare/Railway/Render/Vercel/Docker)
  · infra/terraform/main.tf.example               (squelette IaC)

Docs : docker/README.md · STACK.md · .cursor/rules/infra.mdc
`)

  console.log("Que veux-tu faire ?")
  console.log("  1. Démarrer la stack de dev locale (docker compose up -d)")
  console.log("  2. Voir les cibles de déploiement")
  console.log("  3. Rien, juste l'info ci-dessus")

  const c = (await ask("\nChoix : ")).trim()

  if (c === "1") {
    if (!hasDocker || !hasCompose) {
      warn("Docker / Docker Compose non détecté.")
      info("Installe Docker Desktop : https://www.docker.com/products/docker-desktop/")
      return
    }
    if (!existsSync(".env") && existsSync(".env.example")) {
      info("Crée d'abord .env depuis .env.example (cp .env.example .env), puis relance.")
    }
    try {
      runOrFail("docker compose -f docker/docker-compose.yml up -d")
      success("Stack démarrée.")
      info("Postgres :5432 · Redis :6379 · Keycloak http://localhost:8080 · Mailpit http://localhost:8025")
    } catch (e) {
      err(`Échec : ${e.message}`)
    }
    return
  }

  if (c === "2") {
    console.log(`
Cibles de déploiement (voir STACK.md → Déploiement) :
  · Vercel               — front Next.js (intégration GitHub native, preview par PR)
  · Cloudflare Workers   — API edge (Hono)        → wrangler deploy
  · Railway / Render     — containers Node/Python/Java/.NET
  · Fly.io               — apps multi-régions
  · AWS/GCP/Azure        — entreprise, via Terraform (infra/terraform/)

Active le bloc correspondant dans .github/workflows/deploy.yml
et configure les Environments GitHub (staging / production).
`)
    return
  }

  info("OK — tout est déjà dans le repo.")
}

async function offerCommit(dir, label) {
  if (!existsSync(dir)) return
  const onDev = run("git branch --show-current") === "dev"
  if (!onDev) {
    warn("Tu n'es pas sur `dev`. Commit manuel recommandé après : git checkout dev && git pull")
    return
  }
  const doCommit = (await ask(`\nCommit initial de ${dir}/ sur dev ? [O/n] `)).trim().toLowerCase()
  if (doCommit === "n") return
  run(`git add ${dir}/`)
  const result = run(`git commit -m "chore(scaffold): add ${label} base"`)
  if (result !== null) success("Commit initial fait sur dev")
  else info("Rien à commiter (déjà à jour)")
}

// ── 2. Setup GitHub ───────────────────────────────────────────────────────────

async function setupGitHub(octokit, owner, repo) {
  banner("Setup GitHub")

  // 1a. Labels
  step(1, 2, "Labels")
  const labelsPath = new URL("../.github/labels.json", import.meta.url).pathname
    .replace(/^\/([A-Z]:)/, "$1") // fix Windows path /C:/... → C:/...

  if (!existsSync(labelsPath)) {
    err(".github/labels.json introuvable — skip labels")
  } else {
    const labels = JSON.parse(readFileSync(labelsPath, "utf8"))

    info("Suppression des labels existants…")
    const existing = await octokit.paginate(octokit.issues.listLabelsForRepo, {
      owner, repo, per_page: 100,
    })
    for (const label of existing) {
      await octokit.issues.deleteLabel({ owner, repo, name: label.name })
    }
    info(`${existing.length} labels supprimés`)

    info("Création des labels…")
    for (const label of labels) {
      await octokit.issues.createLabel({
        owner, repo,
        name: label.name,
        color: label.color,
        description: label.description,
      })
    }
    success(`${labels.length} labels créés`)
  }

  // 1b. Branch protection
  step(2, 2, "Protection des branches")
  for (const branch of ["main", "dev"]) {
    try {
      await octokit.repos.updateBranchProtection({
        owner, repo, branch,
        required_status_checks: { strict: true, contexts: ["quality"] },
        enforce_admins: false,
        required_pull_request_reviews: {
          required_approving_review_count: 1,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: true,
        },
        restrictions: null,
        allow_force_pushes: false,
        allow_deletions: false,
      })
      success(`${branch} protégée`)
    } catch (e) {
      err(`${branch} : ${e.message}`)
    }
  }
}

// ── 3. Setup Asana ────────────────────────────────────────────────────────────

async function setupAsana(octokit, owner, repo) {
  banner("Setup Asana")

  console.log(`
Ce setup configure la synchronisation bidirectionnelle Asana ↔ GitHub.

  Asana → GitHub  (toutes les 30 min via GitHub Actions)
    · Tâches Asana     → Issues GitHub
    · Sections Phase X → Milestones GitHub
    · Tâches [lock]    → ignorées

  GitHub → Asana  (en temps réel via GitHub Actions)
    · PR ouverte / rouverte        → section "review/test"
    · PR : changes requested       → section "doing"
    · PR : approved                → section "review/test"
    · PR mergée                    → section "done"
    · PR fermée sans merge         → section "doing"
    · Issue rouverte               → section "doing"

  Prérequis Asana :
    · Sections dans ton projet : "to-do", "doing", "review/test", "done"
    · Token Asana : https://app.asana.com/0/my-profile-settings/apps
    · GID du projet : dans l'URL Asana → /0/{GID}/...
`)

  const asanaPat = (await ask("ASANA_PAT (token Asana) : ")).trim()
  const asanaGid = (await ask("ASANA_PROJECT_GID (GID du projet) : ")).trim()

  if (!asanaPat || !asanaGid) {
    err("Valeurs manquantes — setup Asana annulé")
    return
  }

  console.log("\n─────────────────────────────────────────────────────────")
  console.log("  Ajoute ces secrets dans GitHub :")
  console.log(`  https://github.com/${owner}/${repo}/settings/secrets/actions`)
  console.log("─────────────────────────────────────────────────────────")
  console.log(`\n  Nom                Valeur`)
  console.log(`  ASANA_PAT          ${asanaPat.slice(0, 8)}${"·".repeat(Math.max(0, asanaPat.length - 8))}`)
  console.log(`  ASANA_PROJECT_GID  ${asanaGid}`)
  console.log(`
  Une fois les secrets ajoutés, le workflow se déclenche automatiquement.
  Tu peux aussi le lancer manuellement :
  https://github.com/${owner}/${repo}/actions/workflows/asana-sync.yml
`)
  success("Instructions Asana affichées")
}

// ── Menu principal ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════════")
  console.log("              TechGuys — Dev Setup Wizard")
  console.log("══════════════════════════════════════════════════════════")

  if (!process.env.GITHUB_TOKEN) {
    console.log("\n  Note : GITHUB_TOKEN non défini → options GitHub/Asana indisponibles.")
    console.log("  → Pour les activer : https://github.com/settings/tokens (scopes : repo, admin:repo_hook)")
  }

  const hasGitHub = !!process.env.GITHUB_TOKEN
  let octokit = null, owner = null, repo = null

  if (hasGitHub) {
    const repoArg = await getRepo()
    ;[owner, repo] = repoArg.split("/")
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
  }

  const menu = [
    { label: "Scaffold project  (landing / frontend / backend — toute techno)", fn: () => scaffoldProject() },
    ...(hasGitHub ? [
      { label: "Setup GitHub      (labels + branch protection)", fn: () => setupGitHub(octokit, owner, repo) },
      { label: "Setup Asana       (tokens + secrets)",           fn: () => setupAsana(octokit, owner, repo) },
    ] : []),
  ]

  while (true) {
    console.log("\nQue veux-tu faire ?")
    menu.forEach((m, i) => console.log(`  ${i + 1}. ${m.label}`))
    console.log("  q. Quitter")

    const choice = (await ask("\nChoix : ")).trim().toLowerCase()
    if (choice === "q") break

    const selected = menu.filter((_, i) => choice.includes(String(i + 1)))
    if (selected.length === 0) { console.log("  Choix invalide."); continue }

    for (const m of selected) {
      try { await m.fn() } catch (e) { err(`Erreur : ${e.message}`) }
    }

    const again = await ask("\nAutre chose ? [o/N] ")
    if (again.toLowerCase() !== "o") break
  }

  rl.close()
  console.log("\nSetup terminé.\n")
}

main().catch((e) => { console.error(e); process.exit(1) })

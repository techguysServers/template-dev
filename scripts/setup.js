#!/usr/bin/env node
/**
 * Setup wizard — lance avec : node scripts/setup.js
 * Prérequis : GITHUB_TOKEN dans l'env (scope repo + admin:repo_hook)
 */

import readline from "readline"
import { execSync, spawnSync } from "child_process"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { Octokit } from "@octokit/rest"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((r) => rl.question(q, r))

function run(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: "utf8", ...opts }).trim() } catch { return null }
}

function runOrFail(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts })
  if (result.status !== 0) throw new Error(`Command failed: ${cmd}`)
}

function banner(title) {
  console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`)
}

function success(msg) { console.log(`  ✓ ${msg}`) }
function info(msg)    { console.log(`  · ${msg}`) }
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

// ── 1. Scaffold project ───────────────────────────────────────────────────────

async function scaffoldProject() {
  banner("Scaffold project")

  console.log(`
Ce wizard crée et configure la structure du projet selon ce que tu construis.
Il installe les dépendances et fait un commit initial sur dev.
`)

  console.log("Qu'est-ce que tu construis ?")
  console.log("  1. Landing page      (Astro ou Next.js + shadcn)")
  console.log("  2. Frontend app      (Next.js 15 App Router)")
  console.log("  3. Backend API       (Hono + Zod + Drizzle)")
  console.log("  4. Full-stack        (Frontend + Backend)")

  const domainChoice = (await ask("\nChoix : ")).trim()

  switch (domainChoice) {
    case "1": await scaffoldLanding(); break
    case "2": await scaffoldFrontend(); break
    case "3": await scaffoldBackend(); break
    case "4":
      await scaffoldFrontend()
      await scaffoldBackend()
      break
    default:
      err("Choix invalide.")
  }
}

// ── 1a. Landing page ──────────────────────────────────────────────────────────

async function scaffoldLanding() {
  banner("Scaffold — Landing page")

  console.log("\nFramework :")
  console.log("  1. Next.js  (déjà dans landing-page/ — interactivité, auth)")
  console.log("  2. Astro    (SEO pur, contenu statique, nouveau dossier)")

  const fw = (await ask("\nChoix [1/2] : ")).trim()

  if (fw === "1") {
    info("landing-page/ déjà configuré avec Next.js 16 + Tailwind + shadcn.")
    info("Lance : cd landing-page && npm install && npm run dev")
    return
  }

  if (fw === "2") {
    info("Scaffold Astro dans astro-landing/ ...")

    step(1, 3, "Créer le projet Astro")
    runOrFail("npm create astro@latest astro-landing -- --template minimal --typescript strict --no-install --git false")

    step(2, 3, "Installer les dépendances + Tailwind + shadcn")
    runOrFail("npm install", { cwd: "astro-landing" })
    runOrFail("npx astro add tailwind --yes", { cwd: "astro-landing" })

    const withShadcn = (await ask("\nAjouter shadcn/ui ? [O/n] ")).trim().toLowerCase()
    if (withShadcn !== "n") {
      info("shadcn/ui pour Astro nécessite React — ajout @astrojs/react...")
      runOrFail("npx astro add react --yes", { cwd: "astro-landing" })
      runOrFail("npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react", { cwd: "astro-landing" })
      success("shadcn/ui prêt — initialise avec : cd astro-landing && npx shadcn@latest init")
    }

    step(3, 3, "Commit initial sur dev")
    const onDev = run("git branch --show-current") === "dev"
    if (!onDev) {
      info("Basculer sur dev d'abord : git checkout dev && git pull")
    } else {
      run("git add astro-landing/")
      run('git commit -m "chore(scaffold): add Astro landing page base"')
      success("Commit fait sur dev")
    }

    success("Astro landing page prêt dans astro-landing/")
    info("Lance : cd astro-landing && npm run dev")
    return
  }

  err("Choix invalide.")
}

// ── 1b. Frontend app ──────────────────────────────────────────────────────────

async function scaffoldFrontend() {
  banner("Scaffold — Frontend app")

  console.log("\nFramework :")
  console.log("  1. Next.js 15 App Router  (défaut — SSR, SEO, API routes)")
  console.log("  2. React + Vite           (SPA pure, pas de SEO)")

  const fw = (await ask("\nChoix [1/2] : ")).trim()
  const dir = "frontend"

  if (existsSync(dir) && existsSync(join(dir, "package.json"))) {
    const overwrite = (await ask(`\nLe dossier ${dir}/ existe déjà. Écraser ? [o/N] `)).trim().toLowerCase()
    if (overwrite !== "o") { info("Scaffold annulé."); return }
  }

  const withAuth   = (await ask("Ajouter Clerk (auth) ? [O/n] ")).trim().toLowerCase() !== "n"
  const withDB     = (await ask("Ajouter Supabase + Drizzle (DB) ? [O/n] ")).trim().toLowerCase() !== "n"
  const withSentry = (await ask("Ajouter Sentry (observabilité) ? [O/n] ")).trim().toLowerCase() !== "n"

  if (fw === "1" || fw === "") {
    step(1, 4, "Créer le projet Next.js 15")
    runOrFail(`npx create-next-app@latest ${dir} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack`)

    step(2, 4, "Installer shadcn/ui")
    runOrFail("npx shadcn@latest init --yes --defaults", { cwd: dir })

    step(3, 4, "Installer les dépendances supplémentaires")
    const deps = ["zustand", "@tanstack/react-query", "react-hook-form", "zod", "@hookform/resolvers", "next-themes"]
    if (withAuth)   deps.push("@clerk/nextjs")
    if (withDB)     deps.push("@supabase/supabase-js", "drizzle-orm", "postgres")
    if (withSentry) deps.push("@sentry/nextjs")

    runOrFail(`npm install ${deps.join(" ")}`, { cwd: dir })

    const devDeps = ["drizzle-kit"]
    if (withDB) runOrFail(`npm install -D ${devDeps.join(" ")}`, { cwd: dir })

    step(4, 4, "Créer la structure de dossiers")
    createFrontendStructure(dir, { withAuth, withDB })

    writeEnvTemplate(dir, { withAuth, withDB, withSentry, framework: "nextjs" })

  } else if (fw === "2") {
    step(1, 3, "Créer le projet React + Vite")
    runOrFail(`npm create vite@latest ${dir} -- --template react-ts`)

    step(2, 3, "Installer les dépendances")
    runOrFail("npm install", { cwd: dir })
    const deps = ["zustand", "@tanstack/react-query", "react-hook-form", "zod", "@hookform/resolvers", "tailwindcss", "@tailwindcss/vite", "react-router-dom"]
    if (withAuth) deps.push("@clerk/react")
    runOrFail(`npm install ${deps.join(" ")}`, { cwd: dir })

    step(3, 3, "Créer la structure")
    createFrontendStructure(dir, { withAuth, withDB: false })
    writeEnvTemplate(dir, { withAuth, withDB: false, withSentry, framework: "vite" })

  } else {
    err("Choix invalide.")
    return
  }

  commitScaffold(dir, "frontend app")
  success(`Frontend prêt dans ${dir}/`)
  info(`Lance : cd ${dir} && npm run dev`)
}

// ── 1c. Backend API ───────────────────────────────────────────────────────────

async function scaffoldBackend() {
  banner("Scaffold — Backend API")

  console.log("\nFramework :")
  console.log("  1. Hono + Cloudflare Workers  (défaut — edge, global, gratuit)")
  console.log("  2. Hono + Node.js             (Railway — deps Node, long-running)")

  const fw = (await ask("\nChoix [1/2] : ")).trim()
  const dir = "backend"

  if (existsSync(dir) && existsSync(join(dir, "package.json"))) {
    const overwrite = (await ask(`\nLe dossier ${dir}/ existe déjà. Écraser ? [o/N] `)).trim().toLowerCase()
    if (overwrite !== "o") { info("Scaffold annulé."); return }
  }

  const withDB     = (await ask("Ajouter Supabase + Drizzle (DB) ? [O/n] ")).trim().toLowerCase() !== "n"
  const withAuth   = (await ask("Ajouter Clerk (auth middleware) ? [O/n] ")).trim().toLowerCase() !== "n"
  const withArcjet = (await ask("Ajouter Arcjet (rate limiting) ? [O/n] ")).trim().toLowerCase() !== "n"

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (fw === "1" || fw === "") {
    step(1, 4, "Créer le projet Hono pour Cloudflare Workers")
    runOrFail(`npm create hono@latest ${dir} -- --template cloudflare-workers`)

  } else if (fw === "2") {
    step(1, 4, "Créer le projet Hono pour Node.js")
    runOrFail(`npm create hono@latest ${dir} -- --template nodejs`)

  } else {
    err("Choix invalide.")
    return
  }

  step(2, 4, "Installer les dépendances")
  const deps = ["zod", "hono"]
  if (withDB)     deps.push("drizzle-orm", "postgres", "@supabase/supabase-js")
  if (withAuth)   deps.push("@clerk/backend")
  if (withArcjet) deps.push("@arcjet/node")

  const devDeps = ["@types/node", "tsx", "typescript", "vitest"]
  if (withDB) devDeps.push("drizzle-kit")

  const existingPkg = existsSync(join(dir, "package.json"))
  if (existingPkg) {
    runOrFail(`npm install ${deps.join(" ")}`, { cwd: dir })
    runOrFail(`npm install -D ${devDeps.join(" ")}`, { cwd: dir })
  }

  step(3, 4, "Créer la structure de dossiers")
  createBackendStructure(dir, { withDB, withAuth, withArcjet })
  writeEnvTemplate(dir, { withAuth, withDB, withSentry: false, framework: "hono" })

  step(4, 4, "Commit initial")
  commitScaffold(dir, "backend API")

  success(`Backend prêt dans ${dir}/`)
  info(`Lance : cd ${dir} && npm run dev`)
}

// ── Helpers : structure de dossiers ──────────────────────────────────────────

function createFrontendStructure(dir, { withAuth, withDB }) {
  const folders = [
    "src/app/(public)",
    "src/app/(auth)",
    "src/app/api",
    "src/components/ui",
    "src/components/features",
    "src/components/shared",
    "src/hooks",
    "src/lib/api",
    "src/types",
  ]
  if (withAuth) folders.push("src/lib/auth")
  if (withDB)   folders.push("src/lib/db", "drizzle/migrations")

  for (const f of folders) {
    mkdirSync(join(dir, f), { recursive: true })
  }

  if (withDB) {
    writeFileSync(join(dir, "src/lib/db/index.ts"), `import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client)
`)
    writeFileSync(join(dir, "src/lib/db/schema.ts"), `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
`)
  }

  success("Structure frontend créée")
}

function createBackendStructure(dir, { withDB, withAuth, withArcjet }) {
  const folders = [
    "src/routes/v1",
    "src/middleware",
    "src/lib",
    "src/types",
    "tests",
  ]
  if (withDB) folders.push("drizzle/migrations")

  for (const f of folders) {
    mkdirSync(join(dir, f), { recursive: true })
  }

  writeFileSync(join(dir, "src/index.ts"), `import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())

app.get("/health", (c) => c.json({ status: "ok" }))

export default app
`)

  if (withAuth) {
    writeFileSync(join(dir, "src/middleware/auth.ts"), `import { createClerkClient } from "@clerk/backend"
import type { Context, Next } from "hono"

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "")
  if (!token) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "No token" } }, 401)
  }
  try {
    const payload = await clerk.verifyToken(token)
    c.set("userId", payload.sub)
    await next()
  } catch {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401)
  }
}
`)
  }

  if (withArcjet) {
    writeFileSync(join(dir, "src/middleware/rateLimit.ts"), `import arcjet, { fixedWindow } from "@arcjet/node"
import type { Context, Next } from "hono"

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [fixedWindow({ mode: "LIVE", window: "1m", max: 60 })],
})

export async function rateLimitMiddleware(c: Context, next: Next) {
  const decision = await aj.protect(c.req.raw)
  if (decision.isDenied()) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests" } }, 429)
  }
  await next()
}
`)
  }

  if (withDB) {
    writeFileSync(join(dir, "src/lib/db.ts"), `import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
`)
    writeFileSync(join(dir, "src/lib/schema.ts"), `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
`)
  }

  writeFileSync(join(dir, "src/types/api.ts"), `export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}
`)

  success("Structure backend créée")
}

function writeEnvTemplate(dir, { withAuth, withDB, withSentry, framework }) {
  const lines = ["# Environment variables — copy to .env.local", ""]

  if (withDB)     lines.push("DATABASE_URL=postgresql://user:password@host:5432/dbname")
  if (withAuth) {
    if (framework === "nextjs") {
      lines.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx")
      lines.push("CLERK_SECRET_KEY=sk_test_xxx")
    } else if (framework === "hono") {
      lines.push("CLERK_SECRET_KEY=sk_test_xxx")
    } else {
      lines.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx")
      lines.push("CLERK_SECRET_KEY=sk_test_xxx")
    }
  }
  if (withSentry) lines.push("NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx")

  const arcjetNeeded = framework === "hono"
  if (arcjetNeeded) lines.push("ARCJET_KEY=ajkey_xxx")

  const envPath = join(dir, ".env.example")
  if (!existsSync(envPath)) {
    writeFileSync(envPath, lines.join("\n") + "\n")
    success(".env.example créé")
  }
}

function commitScaffold(dir, label) {
  const onDev = run("git branch --show-current") === "dev"
  if (!onDev) {
    info(`Pas sur dev — commit manuel nécessaire après : git checkout dev && git pull`)
    return
  }
  run(`git add ${dir}/`)
  const result = run(`git commit -m "chore(scaffold): add ${label} base"`)
  if (result) success(`Commit initial fait sur dev`)
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

  const needsGitHub = process.argv.includes("--github") || false

  // Pour scaffold, pas besoin de GITHUB_TOKEN
  const isScaffoldOnly = process.argv.includes("--scaffold")

  if (!isScaffoldOnly && !process.env.GITHUB_TOKEN) {
    console.log("\n  Note : GITHUB_TOKEN non défini.")
    console.log("  → Options GitHub/Asana seront indisponibles.")
    console.log("  → Pour les activer : https://github.com/settings/tokens (scopes : repo, admin:repo_hook)\n")
  }

  const hasGitHub = !!process.env.GITHUB_TOKEN
  let octokit = null
  let owner = null
  let repo = null

  if (hasGitHub) {
    const repoArg = await getRepo()
    const parts = repoArg.split("/")
    owner = parts[0]
    repo = parts[1]
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
  }

  const menu = [
    { label: "Scaffold project  (créer landing / frontend / backend)", fn: () => scaffoldProject() },
    ...(hasGitHub ? [
      { label: "Setup GitHub      (labels + branch protection)", fn: () => setupGitHub(octokit, owner, repo) },
      { label: "Setup Asana       (tokens + secrets)",           fn: () => setupAsana(octokit, owner, repo) },
    ] : []),
  ]

  while (true) {
    console.log("\nQue veux-tu faire ?")
    menu.forEach((m, i) => console.log(`  ${i + 1}. ${m.label}`))
    console.log("  a. Tout faire")
    console.log("  q. Quitter")

    const choice = (await ask("\nChoix : ")).trim().toLowerCase()

    if (choice === "q") break

    const selected = choice === "a"
      ? menu
      : menu.filter((_, i) => choice.includes(String(i + 1)))

    if (selected.length === 0) {
      console.log("  Choix invalide.")
      continue
    }

    for (const step of selected) {
      try {
        await step.fn()
      } catch (e) {
        err(`Erreur : ${e.message}`)
      }
    }

    const again = await ask("\nAutre chose ? [o/N] ")
    if (again.toLowerCase() !== "o") break
  }

  rl.close()
  console.log("\nSetup terminé.\n")
}

main().catch((e) => { console.error(e); process.exit(1) })

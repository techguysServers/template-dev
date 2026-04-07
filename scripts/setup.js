#!/usr/bin/env node
/**
 * Setup wizard — lance avec : node scripts/setup.js
 * Prérequis : GITHUB_TOKEN dans l'env (scope repo + admin:repo_hook)
 */

import readline from "readline"
import { execSync } from "child_process"
import { readFileSync, existsSync } from "fs"
import { Octokit } from "@octokit/rest"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((r) => rl.question(q, r))

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim() } catch { return null }
}

function banner(title) {
  console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`)
}

function success(msg) { console.log(`  ✓ ${msg}`) }
function info(msg)    { console.log(`  · ${msg}`) }
function err(msg)     { console.error(`  ✗ ${msg}`) }

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

// ── 1. Setup GitHub ───────────────────────────────────────────────────────────

async function setupGitHub(octokit, owner, repo) {
  banner("Setup GitHub")

  // 1a. Labels
  console.log("\n[1/2] Labels")
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
  console.log("\n[2/2] Protection des branches")
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

// ── 2. Setup Asana ────────────────────────────────────────────────────────────

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
      (noms approximatifs, la détection est flexible)
    · Token Asana : https://app.asana.com/0/my-profile-settings/apps
    · GID du projet : dans l'URL Asana → /0/{GID}/...
`)

  const asanaPat = (await ask("ASANA_PAT (token Asana) : ")).trim()
  const asanaGid = (await ask("ASANA_PROJECT_GID (GID du projet) : ")).trim()

  if (!asanaPat || !asanaGid) {
    err("Valeurs manquantes — setup Asana annulé")
    return
  }

  // GitHub Secrets API nécessite un chiffrement libsodium — on guide manuellement
  console.log("\n─────────────────────────────────────────────────────────")
  console.log("  Ajoute ces secrets dans GitHub :")
  console.log(`  https://github.com/${owner}/${repo}/settings/secrets/actions`)
  console.log("─────────────────────────────────────────────────────────")
  console.log(`\n  Nom              Valeur`)
  console.log(`  ASANA_PAT        ${asanaPat.slice(0, 8)}${"·".repeat(Math.max(0, asanaPat.length - 8))}`)
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
  console.log("              Template-dev — Setup wizard")
  console.log("══════════════════════════════════════════════════════════")

  if (!process.env.GITHUB_TOKEN) {
    console.error("\nERREUR : variable GITHUB_TOKEN manquante.")
    console.error("  → https://github.com/settings/tokens (scopes : repo, admin:repo_hook)\n")
    process.exit(1)
  }

  const repoArg = await getRepo()
  const [owner, repo] = repoArg.split("/")
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

  const menu = [
    { label: "Setup GitHub  (labels + branch protection)", fn: () => setupGitHub(octokit, owner, repo) },
    { label: "Setup Asana   (tokens + secrets)",           fn: () => setupAsana(octokit, owner, repo) },
  ]

  while (true) {
    console.log("\nQue veux-tu configurer ?")
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

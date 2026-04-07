#!/usr/bin/env node
/**
 * GitHub → Asana sync
 *
 * Moves Asana tasks to the correct section based on GitHub PR/issue events:
 *
 *   PR opened / reopened          → "review/test"
 *   PR review: changes_requested  → "doing"
 *   PR review: approved            → stays in "review/test" (wait for merge)
 *   PR merged                      → "done"
 *   PR closed (not merged)         → "doing"
 *   Issue reopened                 → "doing"
 *
 * Issues are linked to Asana tasks via the <!-- asana-gid:xxx --> marker
 * written by asana-sync.js. PRs find their linked issues via
 * "Closes #N" / "Fixes #N" in the PR body.
 *
 * Required env vars:
 *   ASANA_PAT            Asana personal access token
 *   ASANA_PROJECT_GID    GID of the Asana project
 *   GITHUB_TOKEN         GitHub token
 *   GITHUB_REPO          owner/repo
 *   GITHUB_EVENT_NAME    GitHub event name
 *   GITHUB_EVENT_PATH    Path to the GitHub event JSON payload
 */

import { readFileSync } from "fs"
import Asana from "asana"
import { Octokit } from "@octokit/rest"

// ── Clients ───────────────────────────────────────────────────────────────────

const asanaClient = Asana.ApiClient.instance
asanaClient.authentications["token"].accessToken = process.env.ASANA_PAT

const tasksApi = new Asana.TasksApi()
const sectionsApi = new Asana.SectionsApi()

const [owner, repo] = process.env.GITHUB_REPO.split("/")
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

// ── Section name → Asana section GID ─────────────────────────────────────────

// Canonical section names in Asana (case-insensitive match)
const SECTION_ALIASES = {
  "to-do":       ["to-do", "to do", "todo", "backlog"],
  "doing":       ["doing", "in progress", "in-progress", "wip"],
  "review/test": ["review/test", "review", "test", "qa", "review & test"],
  "done":        ["done", "completed", "closed"],
}

let sectionCache = null

async function getSections() {
  if (sectionCache) return sectionCache
  const result = await sectionsApi.getSectionsForProject(
    process.env.ASANA_PROJECT_GID,
    { opt_fields: "name,gid" }
  )
  sectionCache = result.data
  return sectionCache
}

async function findSectionGid(canonicalName) {
  const sections = await getSections()
  const aliases = SECTION_ALIASES[canonicalName] ?? [canonicalName]
  const section = sections.find((s) =>
    aliases.some((alias) => s.name.toLowerCase().includes(alias.toLowerCase()))
  )
  if (!section) throw new Error(`Section "${canonicalName}" not found in Asana project`)
  return section.gid
}

// ── Move task to section ──────────────────────────────────────────────────────

async function moveTaskToSection(taskGid, sectionName) {
  const sectionGid = await findSectionGid(sectionName)
  await sectionsApi.addTaskForSection(sectionGid, {
    body: { data: { task: taskGid } },
  })
  console.log(`  [asana] task ${taskGid} → "${sectionName}"`)
}

// ── Extract Asana GID from GitHub issue body ──────────────────────────────────

const ASANA_GID_MARKER = "<!-- asana-gid:"

function extractAsanaGid(body) {
  if (!body) return null
  const match = body.match(/<!--\s*asana-gid:(\d+)\s*-->/)
  return match ? match[1] : null
}

// ── Find GitHub issues linked to a PR ────────────────────────────────────────
// Parses "Closes #N", "Fixes #N", "Resolves #N" from PR body

function extractLinkedIssueNumbers(prBody) {
  if (!prBody) return []
  const pattern = /(?:closes?|fixes?|resolves?)\s+#(\d+)/gi
  const numbers = []
  let match
  while ((match = pattern.exec(prBody)) !== null) {
    numbers.push(parseInt(match[1], 10))
  }
  return [...new Set(numbers)]
}

async function getAsanaGidsForPR(prBody) {
  const issueNumbers = extractLinkedIssueNumbers(prBody)
  const gids = []

  for (const number of issueNumbers) {
    try {
      const { data } = await octokit.issues.get({ owner, repo, issue_number: number })
      const gid = extractAsanaGid(data.body)
      if (gid) gids.push(gid)
    } catch {
      console.warn(`  [warn] Could not fetch issue #${number}`)
    }
  }

  return gids
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handlePullRequest(payload) {
  const pr = payload.pull_request
  const action = payload.action
  const gids = await getAsanaGidsForPR(pr.body)

  if (gids.length === 0) {
    console.log("  No linked Asana tasks found in PR body.")
    return
  }

  let targetSection = null

  if (action === "opened" || action === "reopened") {
    targetSection = "review/test"
  } else if (action === "closed") {
    targetSection = pr.merged ? "done" : "doing"
  }

  if (!targetSection) return

  for (const gid of gids) {
    await moveTaskToSection(gid, targetSection)
  }
}

async function handlePullRequestReview(payload) {
  const pr = payload.pull_request
  const review = payload.review
  const gids = await getAsanaGidsForPR(pr.body)

  if (gids.length === 0) return

  let targetSection = null

  if (review.state === "changes_requested") {
    targetSection = "doing"
  } else if (review.state === "approved") {
    // Stay in review/test — will move to done on merge
    targetSection = "review/test"
  }

  if (!targetSection) return

  for (const gid of gids) {
    await moveTaskToSection(gid, targetSection)
  }
}

async function handleIssueReopened(payload) {
  const issue = payload.issue
  const gid = extractAsanaGid(issue.body)
  if (!gid) {
    console.log("  No Asana GID found in issue body.")
    return
  }
  await moveTaskToSection(gid, "doing")
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME
  const eventPath = process.env.GITHUB_EVENT_PATH
  const payload = JSON.parse(readFileSync(eventPath, "utf8"))

  console.log(`\nGitHub → Asana  (event: ${eventName})\n`)

  switch (eventName) {
    case "pull_request":
      await handlePullRequest(payload)
      break
    case "pull_request_review":
      await handlePullRequestReview(payload)
      break
    case "issues":
      if (payload.action === "reopened") await handleIssueReopened(payload)
      break
    default:
      console.log(`  Event "${eventName}" not handled.`)
  }

  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

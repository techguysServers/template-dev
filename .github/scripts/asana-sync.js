#!/usr/bin/env node
/**
 * Asana → GitHub sync
 *
 * What it does:
 *  - Reads all sections from the Asana project
 *  - Sections starting with "Phase" → GitHub Milestones + jalon:phase-N labels
 *  - Fetches all tasks, skips those with [lock] in the name
 *  - Creates/updates GitHub Issues linked to their Milestone
 *  - Assigns labels: asana-synced + jalon:backlog + jalon:phase-N
 *  - Auto-creates any missing labels before using them
 *
 * Required env vars:
 *   ASANA_PAT            Personal access token from Asana
 *   ASANA_PROJECT_GID    GID of the Asana project
 *   GITHUB_TOKEN         Token with issues:write
 *   GITHUB_REPO          owner/repo
 */

import Asana from "asana"
import { Octokit } from "@octokit/rest"

const LOCK_FLAG = "[lock]"
const ASANA_GID_MARKER = "<!-- asana-gid:"

// ── Asana client ──────────────────────────────────────────────────────────────
const asanaClient = Asana.ApiClient.instance
asanaClient.authentications["token"].accessToken = process.env.ASANA_PAT

const tasksApi = new Asana.TasksApi()
const sectionsApi = new Asana.SectionsApi()

// ── GitHub client ─────────────────────────────────────────────────────────────
const [owner, repo] = process.env.GITHUB_REPO.split("/")
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

// In-memory caches to avoid repeated API calls
const labelCache = new Set()
const milestoneCache = new Map() // sectionName → milestoneNumber

// ── Labels ────────────────────────────────────────────────────────────────────

async function loadExistingLabels() {
  const { data } = await octokit.issues.listLabelsForRepo({
    owner,
    repo,
    per_page: 100,
  })
  data.forEach((l) => labelCache.add(l.name))
}

async function ensureLabel(name, color = "ededed", description = "") {
  if (labelCache.has(name)) return
  try {
    await octokit.issues.createLabel({ owner, repo, name, color, description })
    console.log(`  [label] created: ${name}`)
  } catch {
    // Already exists (race condition) — ignore
  }
  labelCache.add(name)
}

// ── Milestones ────────────────────────────────────────────────────────────────

async function loadExistingMilestones() {
  const { data } = await octokit.issues.listMilestones({
    owner,
    repo,
    state: "open",
    per_page: 100,
  })
  data.forEach((m) => milestoneCache.set(m.title, m.number))
}

/**
 * Returns the milestone number for a Phase section.
 * Derives a jalon:phase-N label slug from the section name.
 */
async function getOrCreatePhaseMilestone(sectionName, description = "") {
  if (milestoneCache.has(sectionName)) return milestoneCache.get(sectionName)

  const { data } = await octokit.issues.createMilestone({
    owner,
    repo,
    title: sectionName,
    description,
  })
  milestoneCache.set(sectionName, data.number)
  console.log(`  [milestone] created: ${sectionName} (#${data.number})`)
  return data.number
}

/**
 * Converts "Phase 1 – Discovery" → "jalon:phase-1"
 * Falls back to "jalon:backlog" if no number found.
 */
function sectionToJalonLabel(sectionName) {
  const match = sectionName.match(/phase\s*(\d+)/i)
  return match ? `jalon:phase-${match[1]}` : "jalon:backlog"
}

// ── Asana data ────────────────────────────────────────────────────────────────

async function getProjectSections() {
  const result = await sectionsApi.getSectionsForProject(
    process.env.ASANA_PROJECT_GID,
    { opt_fields: "name,created_at" }
  )
  return result.data
}

async function getAsanaTasks() {
  const result = await tasksApi.getTasksForProject(
    process.env.ASANA_PROJECT_GID,
    {
      opt_fields:
        "name,notes,completed,due_on,memberships.section.name,memberships.section.gid,custom_fields,tags",
      limit: 100,
    }
  )
  return result.data.filter(
    (t) => !t.name.toLowerCase().includes(LOCK_FLAG.toLowerCase())
  )
}

// ── Issues ────────────────────────────────────────────────────────────────────

async function getExistingIssue(gid) {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `"${ASANA_GID_MARKER}${gid}" repo:${owner}/${repo} is:issue`,
  })
  return data.items[0] ?? null
}

async function upsertIssue(task, milestoneNumber, jalonLabel) {
  const title = task.name.trim()
  const body = `${task.notes ?? ""}\n\n${ASANA_GID_MARKER}${task.gid} -->`
  const labels = ["asana-synced", "jalon:backlog"]
  if (jalonLabel && jalonLabel !== "jalon:backlog") labels.push(jalonLabel)

  const existing = await getExistingIssue(task.gid)

  if (existing) {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: existing.number,
      title,
      body,
      milestone: milestoneNumber ?? null,
      state: task.completed ? "closed" : "open",
    })
    console.log(`  [issue] updated #${existing.number}: ${title}`)
  } else {
    if (task.completed) return
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      milestone: milestoneNumber ?? null,
    })
    console.log(`  [issue] created #${data.number}: ${title}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nAsana → GitHub sync  (${owner}/${repo})\n`)

  // Pre-load existing state to avoid redundant API calls
  await Promise.all([loadExistingLabels(), loadExistingMilestones()])

  // Ensure base labels exist
  await ensureLabel("asana-synced", "0075ca", "Issue synced from Asana")
  await ensureLabel("jalon:backlog", "ededed", "Backlog milestone")

  // Process sections — create Milestones + jalon labels for "Phase X" sections
  console.log("\nProcessing sections…")
  const sections = await getProjectSections()
  const sectionMilestoneMap = new Map() // sectionName → milestoneNumber

  for (const section of sections) {
    const name = section.name.trim()
    if (/^phase\s*\d+/i.test(name)) {
      const milestoneNumber = await getOrCreatePhaseMilestone(name)
      sectionMilestoneMap.set(name, milestoneNumber)

      // Ensure the matching jalon:phase-N label exists
      const jalonLabel = sectionToJalonLabel(name)
      await ensureLabel(jalonLabel, "1d76db", `${name} milestone`)
    }
  }

  // Process tasks
  console.log("\nProcessing tasks…")
  const tasks = await getAsanaTasks()
  console.log(`Found ${tasks.length} tasks (after [lock] filter)\n`)

  for (const task of tasks) {
    const sectionName = task.memberships?.[0]?.section?.name?.trim() ?? ""
    const milestoneNumber = sectionMilestoneMap.get(sectionName) ?? null
    const jalonLabel = sectionName ? sectionToJalonLabel(sectionName) : "jalon:backlog"

    await upsertIssue(task, milestoneNumber, jalonLabel)
  }

  console.log("\nSync complete.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

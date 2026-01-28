import { BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'

const execFileAsync = promisify(execFile)

export interface GitHubIssue {
  number: number
  title: string
  state: string
  body?: string
  labels: Array<{ name: string; color: string }>
  url: string
  createdAt: string
  updatedAt: string
  hasPlan?: boolean
}

interface GhIssueResponse {
  number: number
  title: string
  state: string
  body: string
  labels: Array<{ name: string; color: string }>
  url: string
  createdAt: string
  updatedAt: string
}

let mainWindow: BrowserWindow | null = null
let issueCache: Map<number, GitHubIssue> = new Map()
let lastFetchTime: number = 0
const CACHE_TTL_MS = 60000 // 1 minute cache

export function setGitHubWindow(window: BrowserWindow): void {
  mainWindow = window
}

/**
 * Check if gh CLI is available and authenticated
 */
export async function checkGhCli(): Promise<{ available: boolean; authenticated: boolean; error?: string }> {
  try {
    await execFileAsync('gh', ['--version'])
  } catch {
    return { available: false, authenticated: false, error: 'gh CLI not installed' }
  }

  try {
    await execFileAsync('gh', ['auth', 'status'])
    return { available: true, authenticated: true }
  } catch {
    return { available: true, authenticated: false, error: 'gh CLI not authenticated. Run: gh auth login' }
  }
}

/**
 * Check if an issue has a Tiki plan
 */
function checkHasPlan(issueNumber: number, cwd: string): boolean {
  const planPath = join(cwd, '.tiki', 'plans', `issue-${issueNumber}.json`)
  return existsSync(planPath)
}

/**
 * Fetch all open issues from the repository
 */
export async function getIssues(
  state: 'open' | 'closed' | 'all' = 'open',
  cwd?: string
): Promise<GitHubIssue[]> {
  const workDir = cwd || process.cwd()
  const now = Date.now()

  // Return cached data if still valid and same state filter
  if (issueCache.size > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    const cached = Array.from(issueCache.values())
    if (state === 'all') return cached
    return cached.filter((i) => (state === 'open' ? i.state === 'OPEN' : i.state === 'CLOSED'))
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'issue',
        'list',
        '--state',
        state,
        '--limit',
        '100',
        '--json',
        'number,title,state,body,labels,url,createdAt,updatedAt'
      ],
      { cwd: workDir, timeout: 10000 }
    )

    const issues: GhIssueResponse[] = JSON.parse(stdout)

    // Update cache and add plan status
    issueCache.clear()
    const result: GitHubIssue[] = issues.map((issue) => {
      const enriched: GitHubIssue = {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        body: issue.body,
        labels: issue.labels || [],
        url: issue.url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        hasPlan: checkHasPlan(issue.number, workDir)
      }
      issueCache.set(issue.number, enriched)
      return enriched
    })

    lastFetchTime = now

    // Notify renderer of updated issues
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('github:issues-updated', result)
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('github:error', { error: errorMessage })
    }
    throw new Error(`Failed to fetch issues: ${errorMessage}`)
  }
}

/**
 * Fetch a single issue by number
 */
export async function getIssue(number: number, cwd?: string): Promise<GitHubIssue> {
  const workDir = cwd || process.cwd()

  // Check cache first
  const cached = issueCache.get(number)
  if (cached && Date.now() - lastFetchTime < CACHE_TTL_MS) {
    return cached
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'issue',
        'view',
        String(number),
        '--json',
        'number,title,state,body,labels,url,createdAt,updatedAt'
      ],
      { cwd: workDir, timeout: 10000 }
    )

    const issue: GhIssueResponse = JSON.parse(stdout)

    const result: GitHubIssue = {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      body: issue.body,
      labels: issue.labels || [],
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      hasPlan: checkHasPlan(issue.number, workDir)
    }

    // Update cache
    issueCache.set(number, result)

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch issue #${number}: ${errorMessage}`)
  }
}

/**
 * Refresh issues and notify renderer
 */
export async function refreshIssues(cwd?: string): Promise<void> {
  // Clear cache to force fresh fetch
  issueCache.clear()
  lastFetchTime = 0
  await getIssues('open', cwd)
}

/**
 * Invalidate cache (call when plans change)
 */
export function invalidateCache(): void {
  issueCache.clear()
  lastFetchTime = 0
}

/**
 * Open issue in default browser
 */
export async function openIssueInBrowser(number: number, cwd?: string): Promise<void> {
  const workDir = cwd || process.cwd()
  await execFileAsync('gh', ['issue', 'view', String(number), '--web'], {
    cwd: workDir,
    timeout: 10000
  })
}

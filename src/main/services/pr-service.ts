import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface PullRequest {
  number: number
  title: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  headRefName: string
  baseRefName: string
  url: string
  mergeable: string
  reviewDecision: string | null
  statusCheckRollup: {
    state: string
    contexts: { name: string; state: string; conclusion: string }[]
  } | null
}

export interface CheckStatus {
  name: string
  state: string
  conclusion: string
}

/**
 * Get PR associated with an issue by searching for:
 * 1. PRs that reference this issue with closes/fixes/resolves keywords
 * 2. PRs with branch naming convention (issue-{number})
 */
export async function getPRForIssue(cwd: string, issueNumber: number): Promise<PullRequest | null> {
  try {
    // Search for PRs that reference this issue with closing keywords
    const { stdout } = await execFileAsync('gh', [
      'pr', 'list',
      '--search', `closes:#${issueNumber} OR fixes:#${issueNumber} OR resolves:#${issueNumber}`,
      '--json', 'number,title,state,isDraft,headRefName,baseRefName,url,mergeable,reviewDecision,statusCheckRollup',
      '--limit', '1'
    ], { cwd })

    const prs = JSON.parse(stdout)
    if (prs.length > 0) return prs[0]

    // Also check for branch naming convention (e.g., issue-123)
    const { stdout: branchPRs } = await execFileAsync('gh', [
      'pr', 'list',
      '--head', `issue-${issueNumber}`,
      '--json', 'number,title,state,isDraft,headRefName,baseRefName,url,mergeable,reviewDecision,statusCheckRollup',
      '--limit', '1'
    ], { cwd })

    const branchResults = JSON.parse(branchPRs)
    return branchResults.length > 0 ? branchResults[0] : null
  } catch (error) {
    console.error('Failed to get PR for issue:', error)
    return null
  }
}

/**
 * Get detailed check statuses for a PR
 */
export async function getPRChecks(cwd: string, prNumber: number): Promise<CheckStatus[]> {
  try {
    const { stdout } = await execFileAsync('gh', [
      'pr', 'checks', String(prNumber),
      '--json', 'name,state,conclusion'
    ], { cwd })
    return JSON.parse(stdout)
  } catch {
    return []
  }
}

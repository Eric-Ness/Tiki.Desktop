import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'

const execFileAsync = promisify(execFile)

export type TimePeriod = '7days' | '30days' | '90days' | 'all'

export interface FileModification {
  path: string
  count: number
  lastModified: string
}

export interface BugCommit {
  hash: string
  message: string
  date: string
  files: string[]
}

export interface GitAnalysis {
  modifications: FileModification[]
  bugCommits: BugCommit[]
  totalCommits: number
  period: TimePeriod
  analyzedAt: string
}

/**
 * Get period start date string for git log --since option
 */
function getPeriodStartDate(period: TimePeriod): string | undefined {
  switch (period) {
    case '7days':
      return '7 days ago'
    case '30days':
      return '30 days ago'
    case '90days':
      return '90 days ago'
    case 'all':
      return undefined // No date filter
  }
}

/**
 * Check if the directory is a git repository
 */
async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd, timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Get file modification counts from git log
 * Returns a list of files with their modification counts and last modified dates
 */
export async function getFileModificationHistory(
  cwd: string,
  period: TimePeriod
): Promise<FileModification[]> {
  if (!(await isGitRepo(cwd))) {
    return []
  }

  const periodStart = getPeriodStartDate(period)
  const args = ['log', '--name-only', '--format=%H|%ai', '--no-merges']

  if (periodStart) {
    args.push('--since', periodStart)
  }

  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: 60000 })

    if (!stdout.trim()) {
      return []
    }

    // Parse the output: alternating commit info and file lists
    const lines = stdout.trim().split('\n')
    const fileModifications: Map<string, { count: number; lastModified: string }> = new Map()

    let currentDate = ''
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Check if line contains commit info (hash|date)
      if (trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|')
        if (parts.length >= 2) {
          // Extract ISO date from the date string (format: YYYY-MM-DD HH:MM:SS +ZZZZ)
          currentDate = parts[1].trim()
        }
      } else {
        // This is a file path
        const filePath = trimmedLine
        const existing = fileModifications.get(filePath)
        if (existing) {
          existing.count++
        } else {
          fileModifications.set(filePath, { count: 1, lastModified: currentDate })
        }
      }
    }

    // Convert map to array and sort by count (descending)
    return Array.from(fileModifications.entries())
      .map(([path, data]) => ({
        path,
        count: data.count,
        lastModified: data.lastModified
      }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get file modification history: ${message}`)
  }
}

/**
 * Get bug-related commits (look for "fix", "bug", "issue #" in message)
 * Returns commits that likely represent bug fixes
 */
export async function getBugRelatedCommits(
  cwd: string,
  period: TimePeriod
): Promise<BugCommit[]> {
  if (!(await isGitRepo(cwd))) {
    return []
  }

  const periodStart = getPeriodStartDate(period)

  // Build grep patterns for bug-related commits
  // Use extended regex for multiple patterns
  const bugPatterns = ['fix', 'bug', 'issue', 'error', 'crash', 'patch', 'hotfix']

  const bugCommits: BugCommit[] = []

  for (const pattern of bugPatterns) {
    const args = [
      'log',
      '--grep',
      pattern,
      '-i', // case insensitive
      '--format=%H|%s|%ai',
      '--name-only',
      '--no-merges'
    ]

    if (periodStart) {
      args.push('--since', periodStart)
    }

    try {
      const { stdout } = await execFileAsync('git', args, { cwd, timeout: 60000 })

      if (!stdout.trim()) continue

      const lines = stdout.trim().split('\n')
      let currentCommit: BugCommit | null = null

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) {
          // Empty line separates commits
          if (currentCommit && currentCommit.files.length > 0) {
            // Only add if not already present (to avoid duplicates from multiple patterns)
            if (!bugCommits.some((c) => c.hash === currentCommit!.hash)) {
              bugCommits.push(currentCommit)
            }
          }
          currentCommit = null
          continue
        }

        // Check if line contains commit info (hash|message|date)
        if (trimmedLine.includes('|')) {
          // Save previous commit if it had files
          if (currentCommit && currentCommit.files.length > 0) {
            if (!bugCommits.some((c) => c.hash === currentCommit!.hash)) {
              bugCommits.push(currentCommit)
            }
          }

          const parts = trimmedLine.split('|')
          if (parts.length >= 3) {
            currentCommit = {
              hash: parts[0],
              message: parts[1],
              date: parts[2],
              files: []
            }
          }
        } else if (currentCommit) {
          // This is a file path
          currentCommit.files.push(trimmedLine)
        }
      }

      // Don't forget the last commit
      if (currentCommit && currentCommit.files.length > 0) {
        if (!bugCommits.some((c) => c.hash === currentCommit!.hash)) {
          bugCommits.push(currentCommit)
        }
      }
    } catch {
      // Continue with other patterns if one fails
      continue
    }
  }

  // Sort by date (newest first)
  return bugCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Get last modified date for a specific file
 * Returns the date of the most recent commit that touched this file
 */
export async function getFileLastModified(
  cwd: string,
  filePath: string
): Promise<string | null> {
  if (!(await isGitRepo(cwd))) {
    return null
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '-1', '--format=%ai', '--', filePath],
      { cwd, timeout: 10000 }
    )

    const date = stdout.trim()
    return date || null
  } catch {
    return null
  }
}

/**
 * Count lines of code in a file
 * Returns count of non-empty lines, 0 for binary files
 */
export async function countLinesOfCode(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')

    // Count non-empty lines
    const lines = content.split('\n')
    return lines.filter((line) => line.trim().length > 0).length
  } catch (error) {
    // Handle binary files or read errors
    if (error instanceof Error && error.message.includes('encoding')) {
      return 0 // Binary file
    }
    // File might be binary or unreadable
    return 0
  }
}

/**
 * Get total commit count for the period
 */
async function getTotalCommitCount(cwd: string, period: TimePeriod): Promise<number> {
  if (!(await isGitRepo(cwd))) {
    return 0
  }

  const periodStart = getPeriodStartDate(period)
  const args = ['rev-list', '--count', '--no-merges', 'HEAD']

  if (periodStart) {
    args.splice(2, 0, '--since', periodStart)
  }

  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30000 })
    return parseInt(stdout.trim()) || 0
  } catch {
    return 0
  }
}

/**
 * Run full git analysis for heat map
 * Combines file modifications, bug commits, and total commit count
 */
export async function analyzeGitHistory(
  cwd: string,
  period: TimePeriod
): Promise<GitAnalysis> {
  const [modifications, bugCommits, totalCommits] = await Promise.all([
    getFileModificationHistory(cwd, period),
    getBugRelatedCommits(cwd, period),
    getTotalCommitCount(cwd, period)
  ])

  return {
    modifications,
    bugCommits,
    totalCommits,
    period,
    analyzedAt: new Date().toISOString()
  }
}

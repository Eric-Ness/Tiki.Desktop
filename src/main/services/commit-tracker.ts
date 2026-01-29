import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'
import { join } from 'path'

const execFileAsync = promisify(execFile)

/**
 * Commit source type - indicates where the commit originated
 */
export type CommitSource = 'tiki' | 'external' | 'unknown'

/**
 * Commit tracking information
 */
export interface CommitTracking {
  commitHash: string
  issueNumber: number
  phaseNumber?: number
  timestamp: number
  message: string
  source: CommitSource
  parentHashes: string[]
  isMergeCommit: boolean
}

/**
 * Result of commit history validation
 */
export interface ValidationResult {
  valid: boolean
  missingCommits: string[]
}

/**
 * Result of merge commit detection
 */
export interface MergeDetectionResult {
  isMerge: boolean
  parentHashes: string[]
}

/**
 * CommitTrackerService - Tracks commits associated with Tiki issues and phases
 */
export class CommitTrackerService {
  private operationLock: Promise<unknown> = Promise.resolve()

  /**
   * Execute operation with mutex lock to prevent concurrent file operations
   */
  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previousLock = this.operationLock
    let resolve: () => void
    this.operationLock = new Promise<void>((r) => {
      resolve = r
    })

    try {
      await previousLock
      return await operation()
    } finally {
      resolve!()
    }
  }

  /**
   * Get the path to the commits file
   */
  private getCommitsPath(projectPath: string): string {
    return join(projectPath, '.tiki', 'commits.json')
  }

  /**
   * Get the path to the .tiki directory
   */
  private getTikiDir(projectPath: string): string {
    return join(projectPath, '.tiki')
  }

  /**
   * Check if a file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * Track a commit by saving it to commits.json
   */
  async trackCommit(projectPath: string, tracking: CommitTracking): Promise<void> {
    return this.withLock(async () => {
      const commits = await this.loadCommitsInternal(projectPath)
      commits.push(tracking)
      await this.saveCommitsInternal(projectPath, commits)
    })
  }

  /**
   * Get all commits for a specific issue
   */
  async getCommitsForIssue(projectPath: string, issueNumber: number): Promise<CommitTracking[]> {
    return this.withLock(async () => {
      const commits = await this.loadCommitsInternal(projectPath)
      return commits.filter(c => c.issueNumber === issueNumber)
    })
  }

  /**
   * Get commits for a specific phase of an issue
   */
  async getCommitsForPhase(projectPath: string, issueNumber: number, phaseNumber: number): Promise<CommitTracking[]> {
    return this.withLock(async () => {
      const commits = await this.loadCommitsInternal(projectPath)
      return commits.filter(c => c.issueNumber === issueNumber && c.phaseNumber === phaseNumber)
    })
  }

  /**
   * Validate that commits still exist in git (not rebased away)
   */
  async validateCommitHistory(projectPath: string, commits: CommitTracking[]): Promise<ValidationResult> {
    if (commits.length === 0) {
      return { valid: true, missingCommits: [] }
    }

    const missingCommits: string[] = []

    for (const commit of commits) {
      try {
        await execFileAsync('git', ['cat-file', '-t', commit.commitHash], {
          cwd: projectPath,
          timeout: 5000
        })
      } catch {
        missingCommits.push(commit.commitHash)
      }
    }

    return {
      valid: missingCommits.length === 0,
      missingCommits
    }
  }

  /**
   * Find commits between two refs that are not tracked by Tiki
   */
  async findExternalCommits(projectPath: string, fromHash: string, toHash: string): Promise<string[]> {
    // Get all commits in the range from git
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--format=%H', `${fromHash}..${toHash}`],
      { cwd: projectPath, timeout: 10000 }
    )

    const gitCommits = stdout.trim().split('\n').filter(Boolean)

    if (gitCommits.length === 0) {
      return []
    }

    // Get tracked commits
    const trackedCommits = await this.withLock(() => this.loadCommitsInternal(projectPath))
    const trackedHashes = new Set(trackedCommits.map(c => c.commitHash))

    // Return commits not in tracked set
    return gitCommits.filter(hash => !trackedHashes.has(hash))
  }

  /**
   * Detect if a commit is a merge commit (has multiple parents)
   */
  async detectMergeCommit(projectPath: string, commitHash: string): Promise<MergeDetectionResult> {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', `${commitHash}^@`],
      { cwd: projectPath, timeout: 5000 }
    )

    const parentHashes = stdout.trim().split(/\s+/).filter(Boolean)

    return {
      isMerge: parentHashes.length > 1,
      parentHashes
    }
  }

  /**
   * Load commits from file (public API)
   */
  async loadCommits(projectPath: string): Promise<CommitTracking[]> {
    return this.withLock(() => this.loadCommitsInternal(projectPath))
  }

  /**
   * Save commits to file (public API)
   */
  async saveCommits(projectPath: string, commits: CommitTracking[]): Promise<void> {
    return this.withLock(() => this.saveCommitsInternal(projectPath, commits))
  }

  /**
   * Internal load without lock
   */
  private async loadCommitsInternal(projectPath: string): Promise<CommitTracking[]> {
    const commitsPath = this.getCommitsPath(projectPath)

    if (!await this.fileExists(commitsPath)) {
      return []
    }

    const content = await readFile(commitsPath, 'utf-8')
    return JSON.parse(content) as CommitTracking[]
  }

  /**
   * Internal save without lock
   */
  private async saveCommitsInternal(projectPath: string, commits: CommitTracking[]): Promise<void> {
    const tikiDir = this.getTikiDir(projectPath)
    const commitsPath = this.getCommitsPath(projectPath)

    if (!await this.fileExists(tikiDir)) {
      await mkdir(tikiDir, { recursive: true })
    }

    await writeFile(commitsPath, JSON.stringify(commits, null, 2), 'utf-8')
  }
}

// Export singleton instance for convenience
export const commitTrackerService = new CommitTrackerService()

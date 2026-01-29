import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Git error codes for structured error handling
 */
export enum GitErrorCode {
  UNCOMMITTED_CHANGES = 'UNCOMMITTED_CHANGES',
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  BRANCH_EXISTS = 'BRANCH_EXISTS',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  UNMERGED_BRANCH = 'UNMERGED_BRANCH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Branch information with tracking details
 */
export interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

/**
 * Working tree status for dirty state detection
 */
export interface WorkingTreeStatus {
  isDirty: boolean
  hasUntracked: boolean
  hasStaged: boolean
  hasUnstaged: boolean
  files: Array<{ path: string; status: string }>
}

/**
 * Result of a git operation with success/failure and error info
 */
export interface GitOperationResult<T = void> {
  success: boolean
  data?: T
  error?: string
  errorCode?: GitErrorCode
  recoveryOptions?: string[]
}

/**
 * Options for creating a branch
 */
export interface CreateBranchOptions {
  name: string
  checkout?: boolean
  baseBranch?: string
}

/**
 * Options for switching branches
 */
export interface SwitchBranchOptions {
  stash?: boolean
  discard?: boolean
}

/**
 * Issue info for branch name generation
 */
export interface IssueInfo {
  number: number
  title: string
  type?: string
}

/**
 * BranchService - Manages git branch operations with concurrency safety
 */
export class BranchService {
  private operationLock: Promise<unknown> = Promise.resolve()

  /**
   * Execute operation with mutex lock to prevent concurrent git operations
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
   * Classify git errors into structured error codes
   */
  private classifyError(error: Error): GitErrorCode {
    const message = error.message.toLowerCase()

    if (
      message.includes('uncommitted changes') ||
      message.includes('local changes') ||
      message.includes('would be overwritten')
    ) {
      return GitErrorCode.UNCOMMITTED_CHANGES
    }

    if (
      message.includes('resolve your current index') ||
      message.includes('merge conflict') ||
      message.includes('unmerged files')
    ) {
      return GitErrorCode.MERGE_CONFLICT
    }

    if (message.includes('already exists')) {
      return GitErrorCode.BRANCH_EXISTS
    }

    if (message.includes('did not match') || message.includes('not found')) {
      return GitErrorCode.BRANCH_NOT_FOUND
    }

    if (message.includes('not fully merged')) {
      return GitErrorCode.UNMERGED_BRANCH
    }

    if (
      message.includes('could not resolve host') ||
      message.includes('unable to access') ||
      message.includes('network')
    ) {
      return GitErrorCode.NETWORK_ERROR
    }

    if (message.includes('authentication failed') || message.includes('permission denied')) {
      return GitErrorCode.PERMISSION_DENIED
    }

    return GitErrorCode.UNKNOWN_ERROR
  }

  /**
   * Extract issue number from branch name
   */
  private extractIssueNumber(branchName: string): number | undefined {
    // Match patterns like issue-42, issue/42, feature/issue-42, bugfix/issue-15
    const patterns = [
      /issue[-/](\d+)/i,
      /(\d+)[-/]/,
      /[-/](\d+)$/
    ]

    for (const pattern of patterns) {
      const match = branchName.match(pattern)
      if (match) {
        return parseInt(match[1], 10)
      }
    }

    return undefined
  }

  /**
   * List all branches with metadata
   */
  async listBranches(cwd: string): Promise<BranchInfo[]> {
    return this.withLock(async () => {
      try {
        const { stdout } = await execFileAsync('git', ['branch', '-vv'], {
          cwd,
          timeout: 10000
        })

        if (!stdout.trim()) {
          return []
        }

        return stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const isCurrent = line.startsWith('*')
            // Remove leading * and spaces
            const cleanLine = line.replace(/^\*?\s+/, '')

            // Parse: branchname commit [tracking info] message
            // e.g., "main abc1234 [origin/main] Initial commit"
            // e.g., "feature/x def5678 [origin/feature/x: ahead 2] Add feature"
            // e.g., "local-branch ghi9012 Some message" (no tracking)

            const parts = cleanLine.split(/\s+/)
            const name = parts[0]
            const lastCommit = parts[1]

            // Extract tracking info
            let remote: string | undefined
            let ahead = 0
            let behind = 0

            const trackingMatch = cleanLine.match(/\[([^\]]+)\]/)
            if (trackingMatch) {
              const trackingInfo = trackingMatch[1]
              // Extract remote name (before colon if present)
              const remoteParts = trackingInfo.split(':')
              remote = remoteParts[0].trim()

              if (remoteParts.length > 1) {
                const statusPart = remoteParts[1]
                const aheadMatch = statusPart.match(/ahead\s+(\d+)/)
                const behindMatch = statusPart.match(/behind\s+(\d+)/)
                if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
                if (behindMatch) behind = parseInt(behindMatch[1], 10)
              }
            }

            return {
              name,
              current: isCurrent,
              remote,
              ahead,
              behind,
              lastCommit,
              associatedIssue: this.extractIssueNumber(name)
            }
          })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to list branches: ${message}`)
      }
    })
  }

  /**
   * Get current branch with ahead/behind info
   */
  async getCurrentBranch(cwd: string): Promise<BranchInfo> {
    return this.withLock(async () => {
      try {
        const { stdout: branchName } = await execFileAsync(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          { cwd, timeout: 5000 }
        )

        const name = branchName.trim()

        // If detached HEAD, return basic info
        if (name === 'HEAD') {
          return {
            name: 'HEAD',
            current: true,
            remote: undefined,
            ahead: 0,
            behind: 0,
            lastCommit: undefined,
            associatedIssue: undefined
          }
        }

        // Get ahead/behind count from tracking branch
        let ahead = 0
        let behind = 0

        try {
          const { stdout: counts } = await execFileAsync(
            'git',
            ['rev-list', '--left-right', '--count', `@{upstream}...HEAD`],
            { cwd, timeout: 5000 }
          )

          // Format is: behind<tab>ahead (left is upstream commits, right is HEAD commits)
          const [behindStr, aheadStr] = counts.trim().split('\t')
          // For @{upstream}...HEAD: left-right gives us upstream-commits (behind) and head-commits (ahead)
          ahead = parseInt(aheadStr, 10) || 0
          behind = parseInt(behindStr, 10) || 0
        } catch {
          // No upstream tracking branch, that's fine
        }

        return {
          name,
          current: true,
          remote: undefined,
          ahead,
          behind,
          lastCommit: undefined,
          associatedIssue: this.extractIssueNumber(name)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to get current branch: ${message}`)
      }
    })
  }

  /**
   * Check working tree for uncommitted changes
   */
  async checkWorkingTree(cwd: string): Promise<WorkingTreeStatus> {
    return this.withLock(async () => {
      try {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
          cwd,
          timeout: 10000
        })

        // Don't trim - we need to preserve leading spaces for correct parsing
        // git status --porcelain format: "XY filename" where X is index status, Y is worktree status
        if (!stdout || stdout.trim() === '') {
          return {
            isDirty: false,
            hasUntracked: false,
            hasStaged: false,
            hasUnstaged: false,
            files: []
          }
        }

        const files: Array<{ path: string; status: string }> = []
        let hasUntracked = false
        let hasStaged = false
        let hasUnstaged = false

        // Split by newlines but don't trim - preserve leading spaces in each line
        stdout
          .split('\n')
          .filter((line) => line.length >= 3) // Need at least XY and space and filename
          .forEach((line) => {
            const indexStatus = line[0]
            const workTreeStatus = line[1]
            // git status --porcelain format: "XY filename" where X is index status, Y is worktree status
            // There's a space after XY, so path starts at index 3
            const path = line.substring(3)

            if (line.startsWith('??')) {
              hasUntracked = true
              files.push({ path, status: 'untracked' })
            } else {
              // Index (staged) status
              if (indexStatus !== ' ' && indexStatus !== '?') {
                hasStaged = true
                const statusMap: Record<string, string> = {
                  M: 'staged-modified',
                  A: 'staged-added',
                  D: 'staged-deleted',
                  R: 'staged-renamed',
                  C: 'staged-copied'
                }
                files.push({ path, status: statusMap[indexStatus] || 'staged' })
              }

              // Work tree (unstaged) status
              if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
                hasUnstaged = true
                const statusMap: Record<string, string> = {
                  M: 'unstaged-modified',
                  D: 'unstaged-deleted'
                }
                // Only add if not already added as staged
                if (indexStatus === ' ') {
                  files.push({ path, status: statusMap[workTreeStatus] || 'unstaged' })
                }
              }
            }
          })

        return {
          isDirty: hasUntracked || hasStaged || hasUnstaged,
          hasUntracked,
          hasStaged,
          hasUnstaged,
          files
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to check working tree: ${message}`)
      }
    })
  }

  /**
   * Create a new branch
   */
  async createBranch(cwd: string, options: CreateBranchOptions): Promise<GitOperationResult> {
    return this.withLock(async () => {
      try {
        const args: string[] = []

        if (options.checkout) {
          args.push('checkout', '-b', options.name)
          if (options.baseBranch) {
            args.push(options.baseBranch)
          }
        } else {
          args.push('branch', options.name)
          if (options.baseBranch) {
            args.push(options.baseBranch)
          }
        }

        await execFileAsync('git', args, { cwd, timeout: 10000 })

        return { success: true }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        return {
          success: false,
          error: errorObj.message,
          errorCode: this.classifyError(errorObj)
        }
      }
    })
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(
    cwd: string,
    branchName: string,
    options: SwitchBranchOptions = {}
  ): Promise<GitOperationResult> {
    return this.withLock(async () => {
      try {
        // Check working tree status first
        const { stdout: statusOutput } = await execFileAsync('git', ['status', '--porcelain'], {
          cwd,
          timeout: 10000
        })

        const isDirty = statusOutput.trim().length > 0

        if (isDirty && !options.stash && !options.discard) {
          return {
            success: false,
            error: 'Working tree has uncommitted changes',
            errorCode: GitErrorCode.UNCOMMITTED_CHANGES,
            recoveryOptions: ['stash', 'discard', 'commit']
          }
        }

        // Handle stash option
        if (isDirty && options.stash) {
          await execFileAsync(
            'git',
            ['stash', 'push', '-m', `auto-stash before switching to ${branchName}`],
            { cwd, timeout: 10000 }
          )
        }

        // Build checkout command
        const args = ['checkout']
        if (isDirty && options.discard) {
          args.push('--force')
        }
        args.push(branchName)

        await execFileAsync('git', args, { cwd, timeout: 10000 })

        return { success: true }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        return {
          success: false,
          error: errorObj.message,
          errorCode: this.classifyError(errorObj)
        }
      }
    })
  }

  /**
   * Delete a branch
   */
  async deleteBranch(cwd: string, branchName: string, force = false): Promise<GitOperationResult> {
    return this.withLock(async () => {
      try {
        const flag = force ? '-D' : '-d'
        await execFileAsync('git', ['branch', flag, branchName], { cwd, timeout: 10000 })

        return { success: true }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        return {
          success: false,
          error: errorObj.message,
          errorCode: this.classifyError(errorObj)
        }
      }
    })
  }

  /**
   * Push branch to remote
   */
  async pushBranch(cwd: string, branchName: string): Promise<GitOperationResult> {
    return this.withLock(async () => {
      try {
        await execFileAsync('git', ['push', '-u', 'origin', branchName], {
          cwd,
          timeout: 60000 // Longer timeout for network operations
        })

        return { success: true }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        return {
          success: false,
          error: errorObj.message,
          errorCode: this.classifyError(errorObj)
        }
      }
    })
  }

  /**
   * Generate a branch name from an issue using a pattern
   *
   * Pattern placeholders:
   * - {number}: Issue number
   * - {title}: Sanitized issue title
   * - {type}: Issue type (if provided)
   *
   * Default pattern: 'issue-{number}/{title}'
   */
  generateBranchName(issue: IssueInfo, pattern = 'issue-{number}/{title}'): string {
    // Sanitize title: lowercase, replace special chars with hyphens, collapse multiple hyphens
    const sanitizedTitle = issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    let branchName = pattern
      .replace('{number}', String(issue.number))
      .replace('{title}', sanitizedTitle)

    if (issue.type) {
      branchName = branchName.replace('{type}', issue.type)
    }

    // Truncate to max 60 characters to prevent excessively long branch names
    if (branchName.length > 60) {
      // Truncate at word boundary if possible
      branchName = branchName.substring(0, 60)
      const lastHyphen = branchName.lastIndexOf('-')
      if (lastHyphen > 40) {
        branchName = branchName.substring(0, lastHyphen)
      }
    }

    return branchName
  }
}

// Export singleton instance for convenience
export const branchService = new BranchService()

import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { commitTrackerService, type CommitTracking } from './commit-tracker'

const execFileAsync = promisify(execFile)

/**
 * Scope of the rollback operation
 */
export type RollbackScope = 'phase' | 'issue' | 'checkpoint'

/**
 * Target specification for rollback
 */
export interface RollbackTarget {
  issueNumber?: number
  phaseNumber?: number
  checkpointId?: string
}

/**
 * File change information for preview
 */
export interface FileChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  willBe: 'restored' | 'deleted' | 'modified'
  previewAvailable: boolean
}

/**
 * Warning about potential issues with rollback
 */
export interface RollbackWarning {
  type: 'pushed' | 'conflicts' | 'external_commits' | 'merge_commit' | 'dirty_working_tree'
  message: string
  severity: 'low' | 'medium' | 'high'
}

/**
 * Commit info for preview display
 */
export interface CommitInfo {
  hash: string
  message: string
  timestamp: number
  author?: string
}

/**
 * Preview of what will happen during rollback
 */
export interface RollbackPreview {
  scope: RollbackScope
  targetIssue?: number
  targetPhase?: number
  targetCheckpoint?: string
  commits: CommitInfo[]
  filesAffected: FileChange[]
  linesChanged: { added: number; removed: number }
  warnings: RollbackWarning[]
  canRollback: boolean
  blockingReasons: string[]
}

/**
 * Options for executing a rollback
 */
export interface RollbackOptions {
  method: 'revert' | 'reset'
  updateIssueStatus?: boolean
  pushAfter?: boolean
}

/**
 * Result of a rollback execution
 */
export interface RollbackResult {
  success: boolean
  revertCommits?: string[]
  backupBranch?: string
  error?: string
}

/**
 * Checkpoint data structure (public interface)
 */
export interface Checkpoint {
  id: string
  name: string
  commitHash: string
  issueNumber?: number
  createdAt: number
  description?: string
}

/**
 * Internal checkpoint storage format
 */
interface CheckpointsFile {
  checkpoints: Checkpoint[]
}

/**
 * RollbackService - Manages rollback operations with preview and safety features
 */
export class RollbackService {
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
   * Generate a preview of what rollback will do
   */
  async previewRollback(
    scope: RollbackScope,
    target: RollbackTarget,
    cwd: string
  ): Promise<RollbackPreview> {
    return this.withLock(async () => {
      const preview: RollbackPreview = {
        scope,
        targetIssue: target.issueNumber,
        targetPhase: target.phaseNumber,
        targetCheckpoint: target.checkpointId,
        commits: [],
        filesAffected: [],
        linesChanged: { added: 0, removed: 0 },
        warnings: [],
        canRollback: true,
        blockingReasons: []
      }

      // Get commits based on scope
      const commits = await this.getCommitsForScope(scope, target, cwd)

      if (commits.length === 0) {
        preview.canRollback = false
        preview.blockingReasons.push('No commits found for the specified scope')
        return preview
      }

      // Convert to CommitInfo for preview
      preview.commits = commits.map((c) => ({
        hash: c.commitHash,
        message: c.message,
        timestamp: c.timestamp
      }))

      // Get files affected
      preview.filesAffected = await this.getFilesAffected(commits, cwd)

      // Calculate lines changed
      preview.linesChanged = await this.getLinesChanged(commits, cwd)

      // Classify warnings
      preview.warnings = await this.classifyWarnings(commits, cwd)

      // Check for blocking issues
      if (preview.warnings.some((w) => w.type === 'dirty_working_tree')) {
        preview.canRollback = false
        preview.blockingReasons.push('Working tree has uncommitted changes')
      }

      return preview
    })
  }

  /**
   * Execute the rollback operation
   */
  async executeRollback(
    scope: RollbackScope,
    target: RollbackTarget,
    options: RollbackOptions,
    cwd: string
  ): Promise<RollbackResult> {
    return this.withLock(async () => {
      // Get commits to rollback
      const commits = await this.getCommitsForScope(scope, target, cwd)

      if (commits.length === 0) {
        return {
          success: false,
          error: 'No commits found to rollback'
        }
      }

      // Check if reset method is allowed
      if (options.method === 'reset') {
        const canReset = await this.canUseResetMethod(commits, cwd)
        if (!canReset) {
          return {
            success: false,
            error: 'Cannot use reset method: commits have been pushed to remote'
          }
        }
      }

      // Create backup branch before destructive operations
      let backupBranch: string | undefined
      if (options.method === 'reset') {
        backupBranch = await this.createBackupBranch(cwd)
      }

      try {
        if (options.method === 'revert') {
          const revertCommits = await this.revertCommits(commits, target.issueNumber || 0, cwd)
          return {
            success: true,
            revertCommits
          }
        } else {
          // Reset to parent of first commit
          const firstCommit = commits[commits.length - 1] // Oldest commit
          await this.resetToCommit(firstCommit.parentHashes[0] || 'HEAD~1', cwd)
          return {
            success: true,
            backupBranch
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Detect conflict errors
        if (errorMessage.toLowerCase().includes('conflict')) {
          // Abort any in-progress operation
          try {
            await execFileAsync('git', ['revert', '--abort'], { cwd, timeout: 5000 })
          } catch {
            // Ignore abort errors
          }

          return {
            success: false,
            error: `Rollback failed due to conflict: ${errorMessage}`,
            backupBranch
          }
        }

        return {
          success: false,
          error: errorMessage,
          backupBranch
        }
      }
    })
  }

  /**
   * Get commits for the specified scope
   */
  private async getCommitsForScope(
    scope: RollbackScope,
    target: RollbackTarget,
    cwd: string
  ): Promise<CommitTracking[]> {
    switch (scope) {
      case 'phase':
        if (!target.issueNumber || !target.phaseNumber) {
          return []
        }
        return commitTrackerService.getCommitsForPhase(cwd, target.issueNumber, target.phaseNumber)

      case 'issue':
        if (!target.issueNumber) {
          return []
        }
        return commitTrackerService.getCommitsForIssue(cwd, target.issueNumber)

      case 'checkpoint':
        if (!target.checkpointId) {
          return []
        }
        return this.getCommitsSinceCheckpoint(target.checkpointId, cwd)

      default:
        return []
    }
  }

  /**
   * Get commits since a checkpoint
   */
  private async getCommitsSinceCheckpoint(
    checkpointId: string,
    cwd: string
  ): Promise<CommitTracking[]> {
    // Load checkpoints file
    const checkpoints = await this.loadCheckpoints(cwd)
    const checkpoint = checkpoints.find((c) => c.id === checkpointId)

    if (!checkpoint) {
      return []
    }

    // Get commits after the checkpoint using git log
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--format=%H|%s|%at', `${checkpoint.commitHash}..HEAD`],
        { cwd, timeout: 10000 }
      )

      if (!stdout.trim()) {
        return []
      }

      // Parse commits and create CommitTracking objects
      const commits: CommitTracking[] = []
      const lines = stdout.trim().split('\n').filter(Boolean)

      for (const line of lines) {
        const [hash, message, timestamp] = line.split('|')
        commits.push({
          commitHash: hash,
          issueNumber: checkpoint.issueNumber || 0,
          timestamp: parseInt(timestamp, 10) * 1000,
          message,
          source: 'unknown',
          parentHashes: [],
          isMergeCommit: false
        })
      }

      return commits
    } catch {
      return []
    }
  }

  /**
   * Load checkpoints from .tiki/checkpoints.json
   */
  private async loadCheckpoints(cwd: string): Promise<Checkpoint[]> {
    const checkpointsPath = join(cwd, '.tiki', 'checkpoints.json')

    try {
      await access(checkpointsPath, constants.F_OK)
      const content = await readFile(checkpointsPath, 'utf-8')
      const data: CheckpointsFile = JSON.parse(content)
      return data.checkpoints || []
    } catch {
      return []
    }
  }

  /**
   * Save checkpoints to .tiki/checkpoints.json
   */
  private async saveCheckpoints(cwd: string, checkpoints: Checkpoint[]): Promise<void> {
    const tikiPath = join(cwd, '.tiki')
    const checkpointsPath = join(tikiPath, 'checkpoints.json')

    // Ensure .tiki directory exists
    try {
      await mkdir(tikiPath, { recursive: true })
    } catch {
      // Directory may already exist
    }

    const data: CheckpointsFile = { checkpoints }
    await writeFile(checkpointsPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Create a checkpoint at HEAD
   */
  async createCheckpoint(
    name: string,
    issueNumber: number | undefined,
    cwd: string,
    description?: string
  ): Promise<Checkpoint> {
    return this.withLock(async () => {
      // Get current HEAD commit hash
      const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
        cwd,
        timeout: 5000
      })

      const commitHash = stdout.trim()
      const checkpoint: Checkpoint = {
        id: randomUUID(),
        name,
        commitHash,
        issueNumber,
        createdAt: Date.now(),
        description
      }

      // Load existing checkpoints and add new one
      const checkpoints = await this.loadCheckpoints(cwd)
      checkpoints.push(checkpoint)
      await this.saveCheckpoints(cwd, checkpoints)

      return checkpoint
    })
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints(cwd: string): Promise<Checkpoint[]> {
    return this.loadCheckpoints(cwd)
  }

  /**
   * Delete a checkpoint by ID
   */
  async deleteCheckpoint(id: string, cwd: string): Promise<boolean> {
    return this.withLock(async () => {
      const checkpoints = await this.loadCheckpoints(cwd)
      const initialLength = checkpoints.length
      const filtered = checkpoints.filter((c) => c.id !== id)

      if (filtered.length === initialLength) {
        return false // Checkpoint not found
      }

      await this.saveCheckpoints(cwd, filtered)
      return true
    })
  }

  /**
   * Rollback to a checkpoint
   */
  async rollbackToCheckpoint(
    id: string,
    options: RollbackOptions,
    cwd: string
  ): Promise<RollbackResult> {
    return this.withLock(async () => {
      const checkpoints = await this.loadCheckpoints(cwd)
      const checkpoint = checkpoints.find((c) => c.id === id)

      if (!checkpoint) {
        return {
          success: false,
          error: 'Checkpoint not found'
        }
      }

      // Check if the checkpoint commit still exists
      try {
        await execFileAsync('git', ['cat-file', '-t', checkpoint.commitHash], {
          cwd,
          timeout: 5000
        })
      } catch {
        return {
          success: false,
          error: 'Checkpoint commit no longer exists in the repository'
        }
      }

      // Create backup branch before reset
      let backupBranch: string | undefined
      if (options.method === 'reset') {
        const canReset = await this.canResetToCheckpoint(checkpoint.commitHash, cwd)
        if (!canReset) {
          return {
            success: false,
            error: 'Cannot use reset method: commits after checkpoint have been pushed to remote'
          }
        }
        backupBranch = await this.createBackupBranch(cwd)
      }

      try {
        if (options.method === 'revert') {
          // Get commits since checkpoint and revert them
          const commits = await this.getCommitsSinceCheckpoint(id, cwd)
          if (commits.length === 0) {
            return {
              success: true,
              revertCommits: []
            }
          }
          const revertCommits = await this.revertCommits(commits, checkpoint.issueNumber || 0, cwd)
          return {
            success: true,
            revertCommits
          }
        } else {
          // Reset to checkpoint commit
          await this.resetToCommit(checkpoint.commitHash, cwd)
          return {
            success: true,
            backupBranch
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Detect conflict errors
        if (errorMessage.toLowerCase().includes('conflict')) {
          try {
            await execFileAsync('git', ['revert', '--abort'], { cwd, timeout: 5000 })
          } catch {
            // Ignore abort errors
          }

          return {
            success: false,
            error: `Rollback to checkpoint failed due to conflict: ${errorMessage}`,
            backupBranch
          }
        }

        return {
          success: false,
          error: errorMessage,
          backupBranch
        }
      }
    })
  }

  /**
   * Check if we can use reset method to rollback to a checkpoint
   */
  private async canResetToCheckpoint(checkpointHash: string, cwd: string): Promise<boolean> {
    try {
      // Check if any commits after the checkpoint are on a remote branch
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--format=%H', `${checkpointHash}..HEAD`],
        { cwd, timeout: 10000 }
      )

      const commitHashes = stdout.trim().split('\n').filter(Boolean)

      for (const hash of commitHashes) {
        const { stdout: remoteBranches } = await execFileAsync(
          'git',
          ['branch', '-r', '--contains', hash],
          { cwd, timeout: 10000 }
        )

        if (remoteBranches.trim()) {
          return false // Commit is on a remote branch
        }
      }

      return true
    } catch {
      return true // If we can't check, assume it's safe
    }
  }

  /**
   * Create revert commits for the given commits
   */
  private async revertCommits(
    commits: CommitTracking[],
    _issueNumber: number,
    cwd: string
  ): Promise<string[]> {
    const revertHashes: string[] = []

    // Revert in reverse order (newest first)
    const sortedCommits = [...commits].sort((a, b) => b.timestamp - a.timestamp)

    for (const commit of sortedCommits) {
      await execFileAsync(
        'git',
        ['revert', '--no-edit', commit.commitHash],
        { cwd, timeout: 30000 }
      )

      // Get the new revert commit hash
      const { stdout } = await execFileAsync(
        'git',
        ['rev-parse', 'HEAD'],
        { cwd, timeout: 5000 }
      )

      revertHashes.push(stdout.trim())
    }

    return revertHashes
  }

  /**
   * Hard reset to a specific commit
   */
  private async resetToCommit(hash: string, cwd: string): Promise<void> {
    await execFileAsync('git', ['reset', '--hard', hash], { cwd, timeout: 10000 })
  }

  /**
   * Check if commits can be rolled back with reset (not pushed)
   */
  private async canUseResetMethod(commits: CommitTracking[], cwd: string): Promise<boolean> {
    for (const commit of commits) {
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['branch', '-r', '--contains', commit.commitHash],
          { cwd, timeout: 10000 }
        )

        if (stdout.trim()) {
          return false // Commit is on a remote branch
        }
      } catch {
        // If the command fails, assume commit is not on remote
        continue
      }
    }

    return true
  }

  /**
   * Create a backup branch before destructive operations
   */
  private async createBackupBranch(cwd: string): Promise<string> {
    const timestamp = Date.now()
    const branchName = `backup/rollback-${timestamp}`

    await execFileAsync('git', ['branch', branchName], { cwd, timeout: 10000 })

    return branchName
  }

  /**
   * Get files affected by the commits
   */
  private async getFilesAffected(commits: CommitTracking[], cwd: string): Promise<FileChange[]> {
    if (commits.length === 0) {
      return []
    }

    const fileChanges: Map<string, FileChange> = new Map()

    for (const commit of commits) {
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['diff-tree', '--no-commit-id', '--name-status', '-r', commit.commitHash],
          { cwd, timeout: 10000 }
        )

        const lines = stdout.trim().split('\n').filter(Boolean)

        for (const line of lines) {
          const [statusCode, ...pathParts] = line.split('\t')
          const path = pathParts.join('\t') // Handle paths with tabs

          if (!path) continue

          const status = this.parseFileStatus(statusCode)
          const willBe = this.determineWillBe(status)

          fileChanges.set(path, {
            path,
            status,
            willBe,
            previewAvailable: status !== 'deleted'
          })
        }
      } catch {
        // Skip commits that fail
        continue
      }
    }

    return Array.from(fileChanges.values())
  }

  /**
   * Parse git status code to FileChange status
   */
  private parseFileStatus(code: string): FileChange['status'] {
    switch (code.charAt(0)) {
      case 'A':
        return 'added'
      case 'D':
        return 'deleted'
      case 'R':
        return 'renamed'
      case 'M':
      default:
        return 'modified'
    }
  }

  /**
   * Determine what will happen to a file after rollback
   */
  private determineWillBe(status: FileChange['status']): FileChange['willBe'] {
    switch (status) {
      case 'added':
        return 'deleted' // Rollback will delete added files
      case 'deleted':
        return 'restored' // Rollback will restore deleted files
      case 'modified':
      case 'renamed':
      default:
        return 'modified' // Rollback will modify the file back
    }
  }

  /**
   * Calculate lines changed by the commits
   */
  private async getLinesChanged(
    commits: CommitTracking[],
    cwd: string
  ): Promise<{ added: number; removed: number }> {
    let added = 0
    let removed = 0

    for (const commit of commits) {
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['diff-tree', '--no-commit-id', '--numstat', '-r', commit.commitHash],
          { cwd, timeout: 10000 }
        )

        const lines = stdout.trim().split('\n').filter(Boolean)

        for (const line of lines) {
          const [addedStr, removedStr] = line.split('\t')

          // Binary files show as '-'
          if (addedStr !== '-') {
            added += parseInt(addedStr, 10) || 0
          }
          if (removedStr !== '-') {
            removed += parseInt(removedStr, 10) || 0
          }
        }
      } catch {
        // Skip commits that fail
        continue
      }
    }

    return { added, removed }
  }

  /**
   * Classify warnings for the rollback
   */
  private async classifyWarnings(
    commits: CommitTracking[],
    cwd: string
  ): Promise<RollbackWarning[]> {
    const warnings: RollbackWarning[] = []

    // Check for pushed commits
    for (const commit of commits) {
      try {
        const { stdout } = await execFileAsync(
          'git',
          ['branch', '-r', '--contains', commit.commitHash],
          { cwd, timeout: 10000 }
        )

        if (stdout.trim()) {
          warnings.push({
            type: 'pushed',
            message: `Commit ${commit.commitHash.substring(0, 7)} has been pushed to remote. Rollback will require force push or revert.`,
            severity: 'high'
          })
          break // Only warn once for pushed commits
        }
      } catch {
        // Continue checking other commits
      }
    }

    // Check for merge commits
    for (const commit of commits) {
      if (commit.isMergeCommit) {
        warnings.push({
          type: 'merge_commit',
          message: `Commit ${commit.commitHash.substring(0, 7)} is a merge commit. Rollback may be complex.`,
          severity: 'medium'
        })
        break // Only warn once
      }
    }

    // Check for external commits interspersed
    if (commits.length > 0) {
      const externalCommits = await this.findExternalCommitsInRange(commits, cwd)
      if (externalCommits.length > 0) {
        warnings.push({
          type: 'external_commits',
          message: `${externalCommits.length} external commit(s) found between Tiki commits. Rollback may affect unrelated work.`,
          severity: 'medium'
        })
      }
    }

    // Check for conflicts (dry run)
    const hasConflicts = await this.checkForConflicts(commits, cwd)
    if (hasConflicts) {
      warnings.push({
        type: 'conflicts',
        message: 'Potential merge conflicts detected. Manual resolution may be required.',
        severity: 'medium'
      })
    }

    // Check for dirty working tree
    const isDirty = await this.isWorkingTreeDirty(cwd)
    if (isDirty) {
      warnings.push({
        type: 'dirty_working_tree',
        message: 'Working tree has uncommitted changes. Please commit or stash before rollback.',
        severity: 'high'
      })
    }

    return warnings
  }

  /**
   * Find external commits in the range of tracked commits
   */
  private async findExternalCommitsInRange(
    commits: CommitTracking[],
    cwd: string
  ): Promise<string[]> {
    if (commits.length < 2) {
      return []
    }

    // Get the range of commits
    const sortedCommits = [...commits].sort((a, b) => a.timestamp - b.timestamp)
    const oldestHash = sortedCommits[0].commitHash
    const newestHash = sortedCommits[sortedCommits.length - 1].commitHash

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--format=%H', `${oldestHash}^..${newestHash}`],
        { cwd, timeout: 10000 }
      )

      const allHashes = stdout.trim().split('\n').filter(Boolean)
      const trackedHashes = new Set(commits.map((c) => c.commitHash))

      // Also load all tracked commits to check against
      const allTracked = await commitTrackerService.loadCommits(cwd)
      const allTrackedHashes = new Set(allTracked.map((c) => c.commitHash))

      return allHashes.filter((hash) => !trackedHashes.has(hash) && !allTrackedHashes.has(hash))
    } catch {
      return []
    }
  }

  /**
   * Check for potential conflicts via dry-run
   */
  private async checkForConflicts(commits: CommitTracking[], cwd: string): Promise<boolean> {
    if (commits.length === 0) {
      return false
    }

    // Try a dry-run cherry-pick of the reverse changes
    const sortedCommits = [...commits].sort((a, b) => b.timestamp - a.timestamp)
    const newestCommit = sortedCommits[0]

    try {
      // Try to cherry-pick the revert without committing
      await execFileAsync(
        'git',
        ['cherry-pick', '--no-commit', '-n', '-m', '1', newestCommit.commitHash],
        { cwd, timeout: 10000 }
      )

      // Reset the cherry-pick state
      await execFileAsync('git', ['reset', '--hard', 'HEAD'], { cwd, timeout: 5000 })

      return false
    } catch (error) {
      // Reset any partial cherry-pick state
      try {
        await execFileAsync('git', ['cherry-pick', '--abort'], { cwd, timeout: 5000 })
      } catch {
        try {
          await execFileAsync('git', ['reset', '--hard', 'HEAD'], { cwd, timeout: 5000 })
        } catch {
          // Ignore
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      return errorMessage.toLowerCase().includes('conflict')
    }
  }

  /**
   * Check if working tree has uncommitted changes
   */
  private async isWorkingTreeDirty(cwd: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
        cwd,
        timeout: 10000
      })

      return stdout.trim().length > 0
    } catch {
      return false
    }
  }
}

// Export singleton instance for convenience
export const rollbackService = new RollbackService()

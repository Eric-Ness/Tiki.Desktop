/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process before importing the module
vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

// Mock util.promisify to return our mock
vi.mock('util', () => ({
  promisify: (fn: unknown) => fn
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  constants: { F_OK: 0 }
}))

// Mock commit-tracker service
vi.mock('../commit-tracker', () => ({
  commitTrackerService: {
    getCommitsForIssue: vi.fn(),
    getCommitsForPhase: vi.fn(),
    loadCommits: vi.fn(),
    trackCommit: vi.fn()
  }
}))

import { execFile } from 'child_process'
import { readFile, writeFile, access } from 'fs/promises'
import { commitTrackerService } from '../commit-tracker'

const mockExecFile = vi.mocked(execFile)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockAccess = vi.mocked(access)
const mockCommitTracker = vi.mocked(commitTrackerService)

describe('rollback-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('RollbackScope type', () => {
    it('should support phase, issue, and checkpoint scopes', async () => {
      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()
      expect(service).toBeDefined()
    })
  })

  describe('previewRollback', () => {
    it('should generate preview for phase scope with commits', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: phase 1 work',
          source: 'tiki' as const,
          parentHashes: ['parent1'],
          isMergeCommit: false
        },
        {
          commitHash: 'def456',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now() + 1000,
          message: 'feat: more phase 1 work',
          source: 'tiki' as const,
          parentHashes: ['abc123'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock git diff --stat for files affected
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--stat')) {
          return Promise.resolve({
            stdout: ' src/file1.ts | 10 ++++++++++\n src/file2.ts | 5 ++---\n 2 files changed, 12 insertions(+), 3 deletions(-)\n',
            stderr: ''
          })
        }
        if (args.includes('--numstat')) {
          return Promise.resolve({
            stdout: '10\t0\tsrc/file1.ts\n2\t3\tsrc/file2.ts\n',
            stderr: ''
          })
        }
        // Check if pushed - mock as not pushed
        if (args.includes('branch') && args.includes('-r')) {
          return Promise.resolve({ stdout: '', stderr: '' })
        }
        // Check remote contains
        if (args.includes('--contains')) {
          return Promise.reject(new Error('not found'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.scope).toBe('phase')
      expect(preview.targetIssue).toBe(42)
      expect(preview.targetPhase).toBe(1)
      expect(preview.commits).toHaveLength(2)
      expect(preview.canRollback).toBe(true)
    })

    it('should generate preview for issue scope', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: phase 1',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        },
        {
          commitHash: 'def456',
          issueNumber: 42,
          phaseNumber: 2,
          timestamp: Date.now() + 1000,
          message: 'feat: phase 2',
          source: 'tiki' as const,
          parentHashes: ['abc123'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForIssue.mockResolvedValue(commits)
      mockExecFile.mockImplementation((() =>
        Promise.resolve({ stdout: '', stderr: '' })
      ) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('issue', { issueNumber: 42 }, '/test/project')

      expect(preview.scope).toBe('issue')
      expect(preview.targetIssue).toBe(42)
      expect(preview.commits).toHaveLength(2)
    })

    it('should generate preview for checkpoint scope', async () => {
      // Mock checkpoint file exists
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        id: 'checkpoint-abc',
        issueNumber: 42,
        phaseNumber: 2,
        commitHash: 'checkpoint123',
        timestamp: Date.now(),
        description: 'Before risky refactor'
      }))

      // Mock commits since checkpoint
      const commits = [
        {
          commitHash: 'after1',
          issueNumber: 42,
          phaseNumber: 2,
          timestamp: Date.now() + 1000,
          message: 'feat: after checkpoint',
          source: 'tiki' as const,
          parentHashes: ['checkpoint123'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForIssue.mockResolvedValue(commits)
      mockExecFile.mockImplementation((() =>
        Promise.resolve({ stdout: '', stderr: '' })
      ) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('checkpoint', { checkpointId: 'checkpoint-abc' }, '/test/project')

      expect(preview.scope).toBe('checkpoint')
      expect(preview.targetCheckpoint).toBe('checkpoint-abc')
    })

    it('should detect pushed commits and add warning', async () => {
      const commits = [
        {
          commitHash: 'pushed123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: pushed commit',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock as pushed to remote
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--contains')) {
          return Promise.resolve({ stdout: 'origin/main\n', stderr: '' })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.warnings.some(w => w.type === 'pushed')).toBe(true)
    })

    it('should return blocking reason when no commits to rollback', async () => {
      mockCommitTracker.getCommitsForPhase.mockResolvedValue([])

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.canRollback).toBe(false)
      expect(preview.blockingReasons).toContain('No commits found for the specified scope')
    })

    it('should detect interleaved external commits and warn', async () => {
      const baseTimestamp = Date.now()
      const commits = [
        {
          commitHash: 'tiki1',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: baseTimestamp,
          message: 'feat: tiki commit 1',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        },
        {
          commitHash: 'tiki2',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: baseTimestamp + 2000,
          message: 'feat: tiki commit 2',
          source: 'tiki' as const,
          parentHashes: ['tiki1'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock git log to show external commits in between tiki1 and tiki2
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('log') && args.includes('--format=%H')) {
          // Return commits in range: tiki2, external1, tiki1
          return Promise.resolve({ stdout: 'tiki2\nexternal1\ntiki1\n', stderr: '' })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      // loadCommits returns the tracked commits (no external1)
      mockCommitTracker.loadCommits.mockResolvedValue(commits)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.warnings.some(w => w.type === 'external_commits')).toBe(true)
    })

    it('should calculate files affected and lines changed', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: changes',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--numstat')) {
          return Promise.resolve({
            stdout: '15\t5\tsrc/file1.ts\n8\t3\tsrc/file2.ts\n',
            stderr: ''
          })
        }
        if (args.includes('--name-status')) {
          return Promise.resolve({
            stdout: 'M\tsrc/file1.ts\nA\tsrc/file2.ts\n',
            stderr: ''
          })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.linesChanged.added).toBeGreaterThan(0)
      expect(preview.linesChanged.removed).toBeGreaterThan(0)
      expect(preview.filesAffected.length).toBeGreaterThan(0)
    })
  })

  describe('executeRollback', () => {
    it('should execute rollback using revert method', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: to revert',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock successful git operations
      mockExecFile.mockImplementation((() =>
        Promise.resolve({ stdout: '', stderr: '' })
      ) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const result = await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'revert' },
        '/test/project'
      )

      expect(result.success).toBe(true)
      expect(result.revertCommits).toBeDefined()
    })

    it('should execute rollback using reset method with backup branch', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: to reset',
          source: 'tiki' as const,
          parentHashes: ['parent1'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock successful git operations
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--contains')) {
          // Not pushed
          return Promise.reject(new Error('not found'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const result = await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'reset' },
        '/test/project'
      )

      expect(result.success).toBe(true)
    })

    it('should block reset method if commits are pushed', async () => {
      const commits = [
        {
          commitHash: 'pushed123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: pushed',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock as pushed to remote
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--contains')) {
          return Promise.resolve({ stdout: 'origin/main\n', stderr: '' })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const result = await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'reset' },
        '/test/project'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('pushed')
    })

    it('should return error when no commits to rollback', async () => {
      mockCommitTracker.getCommitsForPhase.mockResolvedValue([])

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const result = await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'revert' },
        '/test/project'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('No commits')
    })

    it('should handle git revert failure with conflict', async () => {
      const commits = [
        {
          commitHash: 'conflict123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: will conflict',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock git revert failure
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('revert')) {
          return Promise.reject(new Error('CONFLICT (content): Merge conflict in file.ts'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const result = await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'revert' },
        '/test/project'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('conflict')
    })
  })

  describe('createBackupBranch', () => {
    it('should create a backup branch before destructive operations', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: test',
          source: 'tiki' as const,
          parentHashes: ['parent1'],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      let backupBranchCreated = false
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('branch') && args.some(a => a.includes('backup'))) {
          backupBranchCreated = true
        }
        if (args.includes('--contains')) {
          return Promise.reject(new Error('not found'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      await service.executeRollback(
        'phase',
        { issueNumber: 42, phaseNumber: 1 },
        { method: 'reset' },
        '/test/project'
      )

      expect(backupBranchCreated).toBe(true)
    })
  })

  describe('checkForConflicts', () => {
    it('should detect potential conflicts via dry-run', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: test',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      // Mock conflict detection
      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('cherry-pick') && args.includes('--no-commit')) {
          return Promise.reject(new Error('CONFLICT'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.warnings.some(w => w.type === 'conflicts')).toBe(true)
    })
  })

  describe('FileChange interface', () => {
    it('should include path, status, willBe, and previewAvailable', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: changes',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--name-status')) {
          return Promise.resolve({
            stdout: 'M\tsrc/modified.ts\nA\tsrc/added.ts\nD\tsrc/deleted.ts\n',
            stderr: ''
          })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      expect(preview.filesAffected.length).toBeGreaterThan(0)

      const modifiedFile = preview.filesAffected.find(f => f.path.includes('modified'))
      if (modifiedFile) {
        expect(modifiedFile.status).toBeDefined()
        expect(modifiedFile.willBe).toBeDefined()
      }
    })
  })

  describe('RollbackWarning severity', () => {
    it('should classify pushed commits as high severity', async () => {
      const commits = [
        {
          commitHash: 'pushed123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: pushed',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('--contains')) {
          return Promise.resolve({ stdout: 'origin/main\n', stderr: '' })
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      const pushedWarning = preview.warnings.find(w => w.type === 'pushed')
      expect(pushedWarning?.severity).toBe('high')
    })

    it('should classify potential conflicts as medium severity', async () => {
      const commits = [
        {
          commitHash: 'abc123',
          issueNumber: 42,
          phaseNumber: 1,
          timestamp: Date.now(),
          message: 'feat: test',
          source: 'tiki' as const,
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      mockCommitTracker.getCommitsForPhase.mockResolvedValue(commits)

      mockExecFile.mockImplementation(((cmd: string, args: string[]) => {
        if (args.includes('cherry-pick') && args.includes('--no-commit')) {
          return Promise.reject(new Error('CONFLICT'))
        }
        return Promise.resolve({ stdout: '', stderr: '' })
      }) as typeof execFile)

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const preview = await service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')

      const conflictWarning = preview.warnings.find(w => w.type === 'conflicts')
      expect(conflictWarning?.severity).toBe('medium')
    })
  })

  describe('mutex lock', () => {
    it('should queue concurrent operations', async () => {
      const calls: number[] = []
      let callCount = 0

      mockCommitTracker.getCommitsForPhase.mockImplementation(async () => {
        const thisCall = ++callCount
        calls.push(thisCall)
        await new Promise(resolve => setTimeout(resolve, thisCall === 1 ? 50 : 10))
        return []
      })

      const { RollbackService } = await import('../rollback-service')
      const service = new RollbackService()

      const op1 = service.previewRollback('phase', { issueNumber: 42, phaseNumber: 1 }, '/test/project')
      const op2 = service.previewRollback('phase', { issueNumber: 43, phaseNumber: 1 }, '/test/project')

      await Promise.all([op1, op2])

      // Operations should be queued properly
      expect(calls[0]).toBe(1)
      expect(calls[1]).toBe(2)
    })
  })

  describe('singleton export', () => {
    it('should export rollbackService singleton', async () => {
      const { rollbackService } = await import('../rollback-service')
      expect(rollbackService).toBeDefined()
      expect(typeof rollbackService.previewRollback).toBe('function')
      expect(typeof rollbackService.executeRollback).toBe('function')
    })
  })
})

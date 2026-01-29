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

import { execFile } from 'child_process'

const mockExecFile = vi.mocked(execFile)

describe('branch-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('listBranches', () => {
    it('should parse git branch -vv output correctly', async () => {
      const branchOutput = `* main                     abc1234 [origin/main] Initial commit
  feature/issue-42         def5678 [origin/feature/issue-42: ahead 2] Add feature
  bugfix/issue-15          ghi9012 Fix bug
  old-branch               jkl3456 [origin/old-branch: behind 3] Old changes
`
      mockExecFile.mockResolvedValue({ stdout: branchOutput, stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.listBranches('/test/cwd')

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        name: 'main',
        current: true,
        remote: 'origin/main',
        ahead: 0,
        behind: 0,
        lastCommit: 'abc1234',
        associatedIssue: undefined
      })
      expect(result[1]).toEqual({
        name: 'feature/issue-42',
        current: false,
        remote: 'origin/feature/issue-42',
        ahead: 2,
        behind: 0,
        lastCommit: 'def5678',
        associatedIssue: 42
      })
      expect(result[2]).toEqual({
        name: 'bugfix/issue-15',
        current: false,
        remote: undefined,
        ahead: 0,
        behind: 0,
        lastCommit: 'ghi9012',
        associatedIssue: 15
      })
      expect(result[3]).toEqual({
        name: 'old-branch',
        current: false,
        remote: 'origin/old-branch',
        ahead: 0,
        behind: 3,
        lastCommit: 'jkl3456',
        associatedIssue: undefined
      })
    })

    it('should handle empty branch list', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.listBranches('/test/cwd')

      expect(result).toHaveLength(0)
    })

    it('should handle git error', async () => {
      mockExecFile.mockRejectedValue(new Error('not a git repository'))

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      await expect(service.listBranches('/test/cwd')).rejects.toThrow('Failed to list branches')
    })

    it('should parse branches with ahead and behind tracking', async () => {
      const branchOutput = `* develop                  abc1234 [origin/develop: ahead 5, behind 2] Work in progress
`
      mockExecFile.mockResolvedValue({ stdout: branchOutput, stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.listBranches('/test/cwd')

      expect(result[0]).toMatchObject({
        name: 'develop',
        ahead: 5,
        behind: 2
      })
    })
  })

  describe('getCurrentBranch', () => {
    it('should return current branch info', async () => {
      // First call for rev-parse --abbrev-ref HEAD
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'feature/issue-10\n', stderr: '' } as never)
        // Second call for rev-list --left-right --count @{upstream}...HEAD
        // Format is: <upstream-commits>\t<HEAD-commits> = <behind>\t<ahead>
        .mockResolvedValueOnce({ stdout: '1\t3\n', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.getCurrentBranch('/test/cwd')

      expect(result).toEqual({
        name: 'feature/issue-10',
        current: true,
        remote: undefined,
        ahead: 3,
        behind: 1,
        lastCommit: undefined,
        associatedIssue: 10
      })
    })

    it('should handle detached HEAD state', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: 'HEAD\n', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.getCurrentBranch('/test/cwd')

      expect(result).toEqual({
        name: 'HEAD',
        current: true,
        remote: undefined,
        ahead: 0,
        behind: 0,
        lastCommit: undefined,
        associatedIssue: undefined
      })
    })
  })

  describe('checkWorkingTree', () => {
    it('should detect clean working tree', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.checkWorkingTree('/test/cwd')

      expect(result).toEqual({
        isDirty: false,
        hasUntracked: false,
        hasStaged: false,
        hasUnstaged: false,
        files: []
      })
    })

    it('should detect staged changes', async () => {
      const statusOutput = `M  src/main/index.ts
A  src/new-file.ts
`
      mockExecFile.mockResolvedValue({ stdout: statusOutput, stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.checkWorkingTree('/test/cwd')

      expect(result.isDirty).toBe(true)
      expect(result.hasStaged).toBe(true)
      expect(result.files).toContainEqual({ path: 'src/main/index.ts', status: 'staged-modified' })
      expect(result.files).toContainEqual({ path: 'src/new-file.ts', status: 'staged-added' })
    })

    it('should detect unstaged changes', async () => {
      const statusOutput = ` M src/main/index.ts
 D src/deleted.ts
`
      mockExecFile.mockResolvedValue({ stdout: statusOutput, stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.checkWorkingTree('/test/cwd')

      expect(result.isDirty).toBe(true)
      expect(result.hasUnstaged).toBe(true)
      expect(result.files).toContainEqual({ path: 'src/main/index.ts', status: 'unstaged-modified' })
      expect(result.files).toContainEqual({ path: 'src/deleted.ts', status: 'unstaged-deleted' })
    })

    it('should detect untracked files', async () => {
      const statusOutput = `?? new-file.ts
?? another-file.ts
`
      mockExecFile.mockResolvedValue({ stdout: statusOutput, stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.checkWorkingTree('/test/cwd')

      expect(result.isDirty).toBe(true)
      expect(result.hasUntracked).toBe(true)
      expect(result.files).toContainEqual({ path: 'new-file.ts', status: 'untracked' })
    })
  })

  describe('createBranch', () => {
    it('should create a new branch without checkout', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.createBranch('/test/cwd', {
        name: 'feature/new-branch',
        checkout: false
      })

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['branch', 'feature/new-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should create and checkout a new branch', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.createBranch('/test/cwd', {
        name: 'feature/new-branch',
        checkout: true
      })

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'feature/new-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should create branch from specific base', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      await service.createBranch('/test/cwd', {
        name: 'feature/new-branch',
        baseBranch: 'develop',
        checkout: true
      })

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'feature/new-branch', 'develop'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should return error when branch already exists', async () => {
      const error = new Error("fatal: a branch named 'feature/existing' already exists")
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.createBranch('/test/cwd', {
        name: 'feature/existing',
        checkout: true
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(GitErrorCode.BRANCH_EXISTS)
    })
  })

  describe('switchBranch', () => {
    it('should switch to an existing branch', async () => {
      // First call checks working tree (clean)
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as never)
        // Second call switches branch
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'feature/other-branch')

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        ['checkout', 'feature/other-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should fail when working tree is dirty without force option', async () => {
      // Working tree has uncommitted changes
      mockExecFile.mockResolvedValueOnce({ stdout: ' M dirty-file.ts\n', stderr: '' } as never)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'other-branch')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(GitErrorCode.UNCOMMITTED_CHANGES)
    })

    it('should stash changes when stash option is provided', async () => {
      // Working tree has uncommitted changes
      mockExecFile
        .mockResolvedValueOnce({ stdout: ' M dirty-file.ts\n', stderr: '' } as never)
        // Stash push
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as never)
        // Checkout
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'other-branch', { stash: true })

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['stash', 'push', '-m', expect.stringContaining('auto-stash')],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should discard changes when discard option is provided', async () => {
      // Working tree has uncommitted changes
      mockExecFile
        .mockResolvedValueOnce({ stdout: ' M dirty-file.ts\n', stderr: '' } as never)
        // Checkout with --force
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'other-branch', { discard: true })

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        ['checkout', '--force', 'other-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })
  })

  describe('deleteBranch', () => {
    it('should delete a merged branch', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.deleteBranch('/test/cwd', 'old-branch')

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['branch', '-d', 'old-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should force delete an unmerged branch', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.deleteBranch('/test/cwd', 'unmerged-branch', true)

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['branch', '-D', 'unmerged-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should return error for unmerged branch without force', async () => {
      const error = new Error("error: the branch 'unmerged' is not fully merged")
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.deleteBranch('/test/cwd', 'unmerged')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(GitErrorCode.UNMERGED_BRANCH)
    })
  })

  describe('pushBranch', () => {
    it('should push branch to remote', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.pushBranch('/test/cwd', 'feature/my-branch')

      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['push', '-u', 'origin', 'feature/my-branch'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should handle network error', async () => {
      const error = new Error('fatal: unable to access remote: Could not resolve host')
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.pushBranch('/test/cwd', 'feature/my-branch')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(GitErrorCode.NETWORK_ERROR)
    })

    it('should handle permission denied error', async () => {
      const error = new Error('fatal: Authentication failed for')
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.pushBranch('/test/cwd', 'feature/my-branch')

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(GitErrorCode.PERMISSION_DENIED)
    })
  })

  describe('generateBranchName', () => {
    it('should generate branch name from default pattern', async () => {
      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      const issue = { number: 42, title: 'Add New Feature' }
      const result = service.generateBranchName(issue)

      expect(result).toBe('issue-42/add-new-feature')
    })

    it('should generate branch name from custom pattern', async () => {
      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      const issue = { number: 15, title: 'Fix Login Bug' }
      const result = service.generateBranchName(issue, 'feature/{number}-{title}')

      expect(result).toBe('feature/15-fix-login-bug')
    })

    it('should sanitize special characters in title', async () => {
      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      const issue = { number: 99, title: 'Fix: Handle @special & "chars"!' }
      const result = service.generateBranchName(issue)

      expect(result).toBe('issue-99/fix-handle-special-chars')
    })

    it('should truncate long titles', async () => {
      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      const issue = {
        number: 1,
        title: 'This is a very long title that should be truncated to prevent excessively long branch names'
      }
      const result = service.generateBranchName(issue)

      expect(result.length).toBeLessThanOrEqual(60)
      expect(result).toMatch(/^issue-1\/this-is-a-very-long/)
    })

    it('should handle pattern with type placeholder', async () => {
      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      const issue = { number: 5, title: 'Add tests', type: 'feat' }
      const result = service.generateBranchName(issue, '{type}/{number}-{title}')

      expect(result).toBe('feat/5-add-tests')
    })
  })

  describe('operation mutex', () => {
    it('should queue concurrent operations', async () => {
      const calls: number[] = []
      let callCount = 0

      // First call takes longer
      mockExecFile.mockImplementation(() => {
        const thisCall = ++callCount
        calls.push(thisCall)
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ stdout: `call-${thisCall}\n`, stderr: '' })
          }, thisCall === 1 ? 50 : 10)
        })
      })

      const { BranchService } = await import('../branch-service')
      const service = new BranchService()

      // Start two operations concurrently
      const op1 = service.getCurrentBranch('/test/cwd')
      const op2 = service.getCurrentBranch('/test/cwd')

      await Promise.all([op1, op2])

      // Operations should complete in order despite timing
      expect(calls[0]).toBe(1)
      expect(calls[1]).toBe(2)
    })
  })

  describe('error classification', () => {
    it('should classify merge conflict error', async () => {
      const error = new Error('error: you need to resolve your current index first')
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'some-branch', { discard: true })

      expect(result.errorCode).toBe(GitErrorCode.MERGE_CONFLICT)
    })

    it('should classify branch not found error', async () => {
      const error = new Error("error: pathspec 'nonexistent' did not match any file(s) known to git")
      mockExecFile.mockRejectedValue(error)

      const { BranchService, GitErrorCode } = await import('../branch-service')
      const service = new BranchService()
      const result = await service.switchBranch('/test/cwd', 'nonexistent', { discard: true })

      expect(result.errorCode).toBe(GitErrorCode.BRANCH_NOT_FOUND)
    })
  })
})

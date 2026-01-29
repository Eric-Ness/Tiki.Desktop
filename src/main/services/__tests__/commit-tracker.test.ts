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

import { execFile } from 'child_process'
import { readFile, writeFile, mkdir, access } from 'fs/promises'

const mockExecFile = vi.mocked(execFile)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockMkdir = vi.mocked(mkdir)
const mockAccess = vi.mocked(access)

describe('commit-tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('CommitTracking interface', () => {
    it('should define the correct tracking structure', async () => {
      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      // Verify service exists - interface structure will be tested through methods
      expect(service).toBeDefined()
    })
  })

  describe('trackCommit', () => {
    it('should save a commit to commits.json', async () => {
      // Mock file doesn't exist
      mockAccess.mockRejectedValue(new Error('ENOENT'))
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const tracking = {
        commitHash: 'abc123',
        issueNumber: 42,
        phaseNumber: 1,
        timestamp: Date.now(),
        message: 'feat: add feature',
        source: 'tiki' as const,
        parentHashes: ['def456'],
        isMergeCommit: false
      }

      await service.trackCommit('/test/project', tracking)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('commits.json'),
        expect.any(String),
        'utf-8'
      )

      // Verify the written content includes our commit
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent).toHaveLength(1)
      expect(writtenContent[0]).toMatchObject({
        commitHash: 'abc123',
        issueNumber: 42,
        phaseNumber: 1,
        source: 'tiki'
      })
    })

    it('should append to existing commits', async () => {
      const existingCommits = [
        {
          commitHash: 'existing123',
          issueNumber: 40,
          timestamp: Date.now() - 10000,
          message: 'previous commit',
          source: 'tiki',
          parentHashes: [],
          isMergeCommit: false
        }
      ]

      // Mock file exists
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(existingCommits))
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const newTracking = {
        commitHash: 'new456',
        issueNumber: 42,
        timestamp: Date.now(),
        message: 'feat: new feature',
        source: 'tiki' as const,
        parentHashes: ['existing123'],
        isMergeCommit: false
      }

      await service.trackCommit('/test/project', newTracking)

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent).toHaveLength(2)
      expect(writtenContent[1].commitHash).toBe('new456')
    })

    it('should track commits without phase number', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const tracking = {
        commitHash: 'abc123',
        issueNumber: 42,
        timestamp: Date.now(),
        message: 'fix: quick patch',
        source: 'tiki' as const,
        parentHashes: [],
        isMergeCommit: false
      }

      await service.trackCommit('/test/project', tracking)

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent[0].phaseNumber).toBeUndefined()
    })
  })

  describe('getCommitsForIssue', () => {
    it('should return all commits for a given issue number', async () => {
      const commits = [
        { commitHash: 'a1', issueNumber: 42, timestamp: 1000, message: 'feat 1', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'b2', issueNumber: 43, timestamp: 2000, message: 'feat 2', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'c3', issueNumber: 42, timestamp: 3000, message: 'feat 3', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'd4', issueNumber: 42, phaseNumber: 2, timestamp: 4000, message: 'feat 4', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(commits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.getCommitsForIssue('/test/project', 42)

      expect(result).toHaveLength(3)
      expect(result.every(c => c.issueNumber === 42)).toBe(true)
    })

    it('should return empty array for non-existent issue', async () => {
      const commits = [
        { commitHash: 'a1', issueNumber: 42, timestamp: 1000, message: 'feat', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(commits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.getCommitsForIssue('/test/project', 999)

      expect(result).toHaveLength(0)
    })

    it('should return empty array when commits file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.getCommitsForIssue('/test/project', 42)

      expect(result).toHaveLength(0)
    })
  })

  describe('getCommitsForPhase', () => {
    it('should return commits for a specific phase', async () => {
      const commits = [
        { commitHash: 'a1', issueNumber: 42, phaseNumber: 1, timestamp: 1000, message: 'phase 1', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'b2', issueNumber: 42, phaseNumber: 2, timestamp: 2000, message: 'phase 2', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'c3', issueNumber: 42, phaseNumber: 1, timestamp: 3000, message: 'phase 1 again', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'd4', issueNumber: 42, timestamp: 4000, message: 'no phase', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(commits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.getCommitsForPhase('/test/project', 42, 1)

      expect(result).toHaveLength(2)
      expect(result.every(c => c.issueNumber === 42 && c.phaseNumber === 1)).toBe(true)
    })

    it('should return empty array when no commits match phase', async () => {
      const commits = [
        { commitHash: 'a1', issueNumber: 42, phaseNumber: 1, timestamp: 1000, message: 'phase 1', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(commits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.getCommitsForPhase('/test/project', 42, 5)

      expect(result).toHaveLength(0)
    })
  })

  describe('validateCommitHistory', () => {
    it('should return valid for commits that exist in git', async () => {
      // Mock git cat-file to return success for each commit
      mockExecFile.mockResolvedValue({ stdout: 'commit', stderr: '' } as never)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const commits = [
        { commitHash: 'abc123', issueNumber: 42, timestamp: 1000, message: 'feat', source: 'tiki' as const, parentHashes: [], isMergeCommit: false },
        { commitHash: 'def456', issueNumber: 42, timestamp: 2000, message: 'feat 2', source: 'tiki' as const, parentHashes: [], isMergeCommit: false }
      ]

      const result = await service.validateCommitHistory('/test/project', commits)

      expect(result.valid).toBe(true)
      expect(result.missingCommits).toHaveLength(0)
    })

    it('should detect missing commits (rebased away)', async () => {
      // First commit exists, second doesn't
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'commit', stderr: '' } as never)
        .mockRejectedValueOnce(new Error('fatal: bad object def456'))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const commits = [
        { commitHash: 'abc123', issueNumber: 42, timestamp: 1000, message: 'feat', source: 'tiki' as const, parentHashes: [], isMergeCommit: false },
        { commitHash: 'def456', issueNumber: 42, timestamp: 2000, message: 'feat 2', source: 'tiki' as const, parentHashes: [], isMergeCommit: false }
      ]

      const result = await service.validateCommitHistory('/test/project', commits)

      expect(result.valid).toBe(false)
      expect(result.missingCommits).toContain('def456')
    })

    it('should return valid for empty commit list', async () => {
      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.validateCommitHistory('/test/project', [])

      expect(result.valid).toBe(true)
      expect(result.missingCommits).toHaveLength(0)
    })
  })

  describe('findExternalCommits', () => {
    it('should find commits not tracked by Tiki', async () => {
      // Mock git log to return commits between two refs
      const gitLogOutput = 'abc123\ndef456\nghi789\n'
      mockExecFile.mockResolvedValue({ stdout: gitLogOutput, stderr: '' } as never)

      // Mock tracked commits file - only has abc123
      const trackedCommits = [
        { commitHash: 'abc123', issueNumber: 42, timestamp: 1000, message: 'tracked', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(trackedCommits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.findExternalCommits('/test/project', 'HEAD~10', 'HEAD')

      expect(result).toHaveLength(2)
      expect(result).toContain('def456')
      expect(result).toContain('ghi789')
      expect(result).not.toContain('abc123')
    })

    it('should return empty array when all commits are tracked', async () => {
      const gitLogOutput = 'abc123\ndef456\n'
      mockExecFile.mockResolvedValue({ stdout: gitLogOutput, stderr: '' } as never)

      const trackedCommits = [
        { commitHash: 'abc123', issueNumber: 42, timestamp: 1000, message: 't1', source: 'tiki', parentHashes: [], isMergeCommit: false },
        { commitHash: 'def456', issueNumber: 42, timestamp: 2000, message: 't2', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(trackedCommits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.findExternalCommits('/test/project', 'HEAD~2', 'HEAD')

      expect(result).toHaveLength(0)
    })

    it('should handle git log errors gracefully', async () => {
      mockExecFile.mockRejectedValue(new Error('fatal: bad revision'))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      await expect(service.findExternalCommits('/test/project', 'invalid', 'HEAD'))
        .rejects.toThrow()
    })
  })

  describe('detectMergeCommit', () => {
    it('should detect merge commits (multiple parents)', async () => {
      // Merge commit has two parent hashes
      mockExecFile.mockResolvedValue({ stdout: 'parent1 parent2\n', stderr: '' } as never)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.detectMergeCommit('/test/project', 'abc123')

      expect(result.isMerge).toBe(true)
      expect(result.parentHashes).toEqual(['parent1', 'parent2'])
    })

    it('should detect non-merge commits (single parent)', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'parent1\n', stderr: '' } as never)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.detectMergeCommit('/test/project', 'def456')

      expect(result.isMerge).toBe(false)
      expect(result.parentHashes).toEqual(['parent1'])
    })

    it('should handle root commits (no parents)', async () => {
      mockExecFile.mockResolvedValue({ stdout: '\n', stderr: '' } as never)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.detectMergeCommit('/test/project', 'root123')

      expect(result.isMerge).toBe(false)
      expect(result.parentHashes).toEqual([])
    })

    it('should handle invalid commit hash', async () => {
      mockExecFile.mockRejectedValue(new Error('fatal: bad object invalid'))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      await expect(service.detectMergeCommit('/test/project', 'invalid'))
        .rejects.toThrow()
    })
  })

  describe('loadCommits', () => {
    it('should load commits from file', async () => {
      const commits = [
        { commitHash: 'a1', issueNumber: 42, timestamp: 1000, message: 'feat', source: 'tiki', parentHashes: [], isMergeCommit: false }
      ]
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify(commits))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.loadCommits('/test/project')

      expect(result).toHaveLength(1)
      expect(result[0].commitHash).toBe('a1')
    })

    it('should return empty array when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const result = await service.loadCommits('/test/project')

      expect(result).toHaveLength(0)
    })

    it('should handle corrupted JSON gracefully', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('invalid json {{{')

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      await expect(service.loadCommits('/test/project')).rejects.toThrow()
    })
  })

  describe('saveCommits', () => {
    it('should save commits to file', async () => {
      mockAccess.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const commits = [
        { commitHash: 'a1', issueNumber: 42, timestamp: 1000, message: 'feat', source: 'tiki' as const, parentHashes: [], isMergeCommit: false }
      ]

      await service.saveCommits('/test/project', commits)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('commits.json'),
        JSON.stringify(commits, null, 2),
        'utf-8'
      )
    })

    it('should create .tiki directory if it does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      await service.saveCommits('/test/project', [])

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('.tiki'),
        { recursive: true }
      )
    })
  })

  describe('source detection', () => {
    it('should track external commits with source "external"', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const tracking = {
        commitHash: 'ext123',
        issueNumber: 42,
        timestamp: Date.now(),
        message: 'external commit',
        source: 'external' as const,
        parentHashes: [],
        isMergeCommit: false
      }

      await service.trackCommit('/test/project', tracking)

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent[0].source).toBe('external')
    })

    it('should track unknown source commits', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const tracking = {
        commitHash: 'unk123',
        issueNumber: 42,
        timestamp: Date.now(),
        message: 'unknown source commit',
        source: 'unknown' as const,
        parentHashes: [],
        isMergeCommit: false
      }

      await service.trackCommit('/test/project', tracking)

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent[0].source).toBe('unknown')
    })
  })

  describe('mutex lock', () => {
    it('should queue concurrent operations', async () => {
      const calls: number[] = []
      let callCount = 0

      // Track file reads/writes with delays
      mockAccess.mockImplementation(async () => {
        const thisCall = ++callCount
        calls.push(thisCall)
        await new Promise(resolve => setTimeout(resolve, thisCall === 1 ? 50 : 10))
        throw new Error('ENOENT')
      })
      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { CommitTrackerService } = await import('../commit-tracker')
      const service = new CommitTrackerService()

      const tracking1 = {
        commitHash: 'a1',
        issueNumber: 42,
        timestamp: 1000,
        message: 'first',
        source: 'tiki' as const,
        parentHashes: [],
        isMergeCommit: false
      }

      const tracking2 = {
        commitHash: 'b2',
        issueNumber: 43,
        timestamp: 2000,
        message: 'second',
        source: 'tiki' as const,
        parentHashes: [],
        isMergeCommit: false
      }

      // Start two operations concurrently
      const op1 = service.trackCommit('/test/project', tracking1)
      const op2 = service.trackCommit('/test/project', tracking2)

      await Promise.all([op1, op2])

      // Operations should be queued properly
      expect(calls[0]).toBe(1)
      expect(calls[1]).toBe(2)
    })
  })
})

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create a mock function using vi.hoisted so it's available before vi.mock
const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn()
}))

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

// Mock util.promisify to return our mock
vi.mock('util', () => ({
  promisify: () => mockExecFile
}))

// Import after mocking
import {
  getBranch,
  invalidateBranchCache,
  clearBranchCache
} from '../../services/git-branch-service'

describe('git-branch-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBranchCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getBranch', () => {
    it('should return the current branch name on success', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })

      const result = await getBranch('/test/project')

      expect(result).toBe('main')
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          cwd: '/test/project',
          timeout: 500
        })
      )
    })

    it('should trim whitespace from branch name', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: '  feature/test  \n', stderr: '' })

      const result = await getBranch('/test/project')

      expect(result).toBe('feature/test')
    })

    it('should return null on git errors', async () => {
      mockExecFile.mockRejectedValueOnce(new Error('fatal: not a git repository'))

      const result = await getBranch('/test/project')

      expect(result).toBeNull()
    })

    it('should return null on timeout', async () => {
      const timeoutError = new Error('Command timed out')
      timeoutError.name = 'AbortError'
      mockExecFile.mockRejectedValueOnce(timeoutError)

      const result = await getBranch('/test/project')

      expect(result).toBeNull()
    })

    it('should return null when git command returns empty output', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: '', stderr: '' })

      const result = await getBranch('/test/project')

      expect(result).toBeNull()
    })
  })

  describe('caching behavior', () => {
    it('should use cached value on second call within 30s', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'main\n', stderr: '' })

      // First call
      const result1 = await getBranch('/test/project')
      expect(result1).toBe('main')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const result2 = await getBranch('/test/project')
      expect(result2).toBe('main')
      expect(mockExecFile).toHaveBeenCalledTimes(1) // Still 1, no new call
    })

    it('should cache different projects separately', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'develop\n', stderr: '' })

      const result1 = await getBranch('/project1')
      const result2 = await getBranch('/project2')

      expect(result1).toBe('main')
      expect(result2).toBe('develop')
      expect(mockExecFile).toHaveBeenCalledTimes(2)

      // Both should be cached now
      const result1Again = await getBranch('/project1')
      const result2Again = await getBranch('/project2')

      expect(result1Again).toBe('main')
      expect(result2Again).toBe('develop')
      expect(mockExecFile).toHaveBeenCalledTimes(2) // No new calls
    })

    it('should expire cache after 30 seconds', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'develop\n', stderr: '' })

      // First call
      const result1 = await getBranch('/test/project')
      expect(result1).toBe('main')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance time by 31 seconds
      vi.advanceTimersByTime(31000)

      // Second call - cache should be expired
      const result2 = await getBranch('/test/project')
      expect(result2).toBe('develop')
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })

    it('should not expire cache before 30 seconds', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'main\n', stderr: '' })

      // First call
      await getBranch('/test/project')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance time by 29 seconds
      vi.advanceTimersByTime(29000)

      // Second call - cache should still be valid
      await getBranch('/test/project')
      expect(mockExecFile).toHaveBeenCalledTimes(1) // Still 1
    })
  })

  describe('invalidateBranchCache', () => {
    it('should invalidate cache for specific project', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'feature\n', stderr: '' })

      // First call - populates cache
      const result1 = await getBranch('/test/project')
      expect(result1).toBe('main')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Invalidate cache
      invalidateBranchCache('/test/project')

      // Second call - should fetch again
      const result2 = await getBranch('/test/project')
      expect(result2).toBe('feature')
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })

    it('should not affect other projects when invalidating', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'develop\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'feature\n', stderr: '' })

      // Cache two projects
      await getBranch('/project1')
      await getBranch('/project2')
      expect(mockExecFile).toHaveBeenCalledTimes(2)

      // Invalidate only project1
      invalidateBranchCache('/project1')

      // project2 should still be cached
      await getBranch('/project2')
      expect(mockExecFile).toHaveBeenCalledTimes(2) // No new call

      // project1 should fetch again
      await getBranch('/project1')
      expect(mockExecFile).toHaveBeenCalledTimes(3)
    })
  })

  describe('clearBranchCache', () => {
    it('should clear all cached values', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'develop\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'main2\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'develop2\n', stderr: '' })

      // Cache two projects
      await getBranch('/project1')
      await getBranch('/project2')
      expect(mockExecFile).toHaveBeenCalledTimes(2)

      // Clear all cache
      clearBranchCache()

      // Both should fetch again
      await getBranch('/project1')
      await getBranch('/project2')
      expect(mockExecFile).toHaveBeenCalledTimes(4)
    })
  })
})

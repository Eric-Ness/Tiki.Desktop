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

// Mock electron shell
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn()
  }
}))

import { execFile } from 'child_process'
import { shell } from 'electron'

const mockExecFile = vi.mocked(execFile)
const mockOpenExternal = vi.mocked(shell.openExternal)

describe('workflow-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Reset time mocks
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getWorkflows', () => {
    it('should return parsed workflow list from gh workflow list', async () => {
      const mockWorkflows = [
        { id: 12345, name: 'CI', state: 'active' },
        { id: 67890, name: 'Release', state: 'active' }
      ]

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockWorkflows), stderr: '' } as never)

      const { getWorkflows } = await import('../workflow-service')
      const result = await getWorkflows('/test/cwd')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 12345, name: 'CI', state: 'active' })
      expect(result[1]).toEqual({ id: 67890, name: 'Release', state: 'active' })
    })

    it('should call gh workflow list with correct arguments', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' } as never)

      const { getWorkflows } = await import('../workflow-service')
      await getWorkflows('/test/cwd')

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['workflow', 'list', '--json', 'id,name,state'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should handle empty workflow list', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' } as never)

      const { getWorkflows } = await import('../workflow-service')
      const result = await getWorkflows('/test/cwd')

      expect(result).toHaveLength(0)
    })

    it('should throw error on gh CLI failure', async () => {
      mockExecFile.mockRejectedValue(new Error('gh error'))

      const { getWorkflows } = await import('../workflow-service')
      await expect(getWorkflows('/test/cwd')).rejects.toThrow('Failed to fetch workflows')
    })
  })

  describe('getWorkflowRuns', () => {
    it('should return runs for a specific workflow', async () => {
      const mockRuns = [
        {
          databaseId: 111,
          displayTitle: 'Test run',
          status: 'completed',
          conclusion: 'success',
          event: 'push',
          headSha: 'abc123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:01:00Z',
          url: 'https://github.com/owner/repo/actions/runs/111'
        }
      ]

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockRuns), stderr: '' } as never)

      const { getWorkflowRuns } = await import('../workflow-service')
      const result = await getWorkflowRuns(12345, '/test/cwd')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 111,
        name: 'Test run',
        status: 'completed',
        conclusion: 'success',
        event: 'push',
        headSha: 'abc123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        url: 'https://github.com/owner/repo/actions/runs/111'
      })
    })

    it('should call gh run list with workflow ID', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' } as never)

      const { getWorkflowRuns } = await import('../workflow-service')
      await getWorkflowRuns(12345, '/test/cwd')

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        [
          'run',
          'list',
          '--workflow',
          '12345',
          '--json',
          'databaseId,displayTitle,status,conclusion,event,headSha,createdAt,updatedAt,url'
        ],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should handle empty runs list', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' } as never)

      const { getWorkflowRuns } = await import('../workflow-service')
      const result = await getWorkflowRuns(12345, '/test/cwd')

      expect(result).toHaveLength(0)
    })

    it('should throw error on gh CLI failure', async () => {
      mockExecFile.mockRejectedValue(new Error('gh error'))

      const { getWorkflowRuns } = await import('../workflow-service')
      await expect(getWorkflowRuns(12345, '/test/cwd')).rejects.toThrow('Failed to fetch workflow runs')
    })
  })

  describe('getRunDetails', () => {
    it('should return full run details including jobs', async () => {
      const mockDetails = {
        databaseId: 111,
        displayTitle: 'Test run',
        status: 'completed',
        conclusion: 'success',
        event: 'push',
        headSha: 'abc123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        url: 'https://github.com/owner/repo/actions/runs/111',
        jobs: [
          { name: 'build', status: 'completed', conclusion: 'success' },
          { name: 'test', status: 'completed', conclusion: 'success' }
        ]
      }

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockDetails), stderr: '' } as never)

      const { getRunDetails } = await import('../workflow-service')
      const result = await getRunDetails(111, '/test/cwd')

      expect(result).toEqual({
        id: 111,
        name: 'Test run',
        status: 'completed',
        conclusion: 'success',
        event: 'push',
        headSha: 'abc123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        url: 'https://github.com/owner/repo/actions/runs/111',
        jobs: [
          { name: 'build', status: 'completed', conclusion: 'success' },
          { name: 'test', status: 'completed', conclusion: 'success' }
        ],
        logsUrl: 'https://github.com/owner/repo/actions/runs/111/logs'
      })
    })

    it('should call gh run view with correct arguments', async () => {
      const mockDetails = {
        databaseId: 111,
        displayTitle: 'Test',
        status: 'completed',
        conclusion: 'success',
        event: 'push',
        headSha: 'abc',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/owner/repo/actions/runs/111',
        jobs: []
      }

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockDetails), stderr: '' } as never)

      const { getRunDetails } = await import('../workflow-service')
      await getRunDetails(111, '/test/cwd')

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        [
          'run',
          'view',
          '111',
          '--json',
          'databaseId,displayTitle,status,conclusion,event,headSha,createdAt,updatedAt,url,jobs'
        ],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should throw error on gh CLI failure', async () => {
      mockExecFile.mockRejectedValue(new Error('gh error'))

      const { getRunDetails } = await import('../workflow-service')
      await expect(getRunDetails(111, '/test/cwd')).rejects.toThrow('Failed to fetch run details')
    })
  })

  describe('caching', () => {
    it('should return cached workflows within TTL', async () => {
      const mockWorkflows = [{ id: 12345, name: 'CI', state: 'active' }]

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockWorkflows), stderr: '' } as never)

      const { getWorkflows, clearWorkflowCache } = await import('../workflow-service')

      // Clear any existing cache
      clearWorkflowCache()

      // First call should hit gh CLI
      await getWorkflows('/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Second call should return cached data
      await getWorkflows('/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)
    })

    it('should return cached workflow runs within TTL', async () => {
      const mockRuns = [
        {
          databaseId: 111,
          displayTitle: 'Test',
          status: 'completed',
          conclusion: 'success',
          event: 'push',
          headSha: 'abc',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://github.com/owner/repo/actions/runs/111'
        }
      ]

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockRuns), stderr: '' } as never)

      const { getWorkflowRuns, clearWorkflowCache } = await import('../workflow-service')

      // Clear any existing cache
      clearWorkflowCache()

      // First call should hit gh CLI
      await getWorkflowRuns(12345, '/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Second call should return cached data
      await getWorkflowRuns(12345, '/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)
    })

    it('should fetch fresh data after cache expires', async () => {
      vi.useFakeTimers()

      const mockWorkflows = [{ id: 12345, name: 'CI', state: 'active' }]

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockWorkflows), stderr: '' } as never)

      const { getWorkflows, clearWorkflowCache, CACHE_TTL_MS } = await import('../workflow-service')

      // Clear any existing cache
      clearWorkflowCache()

      // First call
      await getWorkflows('/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance time past TTL
      vi.advanceTimersByTime(CACHE_TTL_MS + 1000)

      // Should fetch fresh data
      await getWorkflows('/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })

    it('should use 30-second polling interval for in-progress runs', async () => {
      vi.useFakeTimers()

      const inProgressRun = {
        databaseId: 111,
        displayTitle: 'Test',
        status: 'in_progress',
        conclusion: null,
        event: 'push',
        headSha: 'abc',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        url: 'https://github.com/owner/repo/actions/runs/111',
        jobs: []
      }

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(inProgressRun), stderr: '' } as never)

      const { getRunDetails, clearWorkflowCache, POLLING_INTERVAL_MS } = await import('../workflow-service')

      // Clear any existing cache
      clearWorkflowCache()

      // First call
      await getRunDetails(111, '/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance time to just before polling interval
      vi.advanceTimersByTime(POLLING_INTERVAL_MS - 1000)

      // Should still return cached
      await getRunDetails(111, '/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance past polling interval
      vi.advanceTimersByTime(2000)

      // Should fetch fresh data for in-progress run
      await getRunDetails(111, '/test/cwd')
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })
  })

  describe('openRunInBrowser', () => {
    it('should call shell.openExternal with run URL', async () => {
      mockOpenExternal.mockResolvedValue(undefined)

      const { openRunInBrowser } = await import('../workflow-service')
      await openRunInBrowser('https://github.com/owner/repo/actions/runs/111')

      expect(mockOpenExternal).toHaveBeenCalledWith('https://github.com/owner/repo/actions/runs/111')
    })

    it('should throw error if openExternal fails', async () => {
      mockOpenExternal.mockRejectedValue(new Error('Failed to open'))

      const { openRunInBrowser } = await import('../workflow-service')
      await expect(openRunInBrowser('https://github.com/owner/repo/actions/runs/111')).rejects.toThrow(
        'Failed to open run in browser'
      )
    })
  })

  describe('interface types', () => {
    it('should export correct TypeScript interfaces', async () => {
      const { getWorkflows, getWorkflowRuns, getRunDetails } = await import('../workflow-service')

      // These tests verify the function signatures exist
      // The actual type checking is done by TypeScript at compile time
      expect(typeof getWorkflows).toBe('function')
      expect(typeof getWorkflowRuns).toBe('function')
      expect(typeof getRunDetails).toBe('function')
    })
  })
})

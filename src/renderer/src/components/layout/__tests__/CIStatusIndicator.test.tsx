import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CIStatusIndicator } from '../CIStatusIndicator'

// Mock workflow data
const mockWorkflows = [
  { id: 1, name: 'CI', state: 'active' },
  { id: 2, name: 'Deploy', state: 'active' },
  { id: 3, name: 'Test', state: 'active' }
]

const createMockRuns = (config: {
  workflow1?: 'success' | 'failure' | 'in_progress' | 'none'
  workflow2?: 'success' | 'failure' | 'in_progress' | 'none'
  workflow3?: 'success' | 'failure' | 'in_progress' | 'none'
}) => {
  const runs: Record<number, unknown[]> = { 1: [], 2: [], 3: [] }

  const createRun = (id: number, _workflowId: number, status: string) => {
    const isCompleted = status === 'success' || status === 'failure'
    return {
      id,
      name: `Workflow #${id}`,
      status: isCompleted ? 'completed' : status,
      conclusion: isCompleted ? status : null,
      event: 'push',
      headSha: 'abc1234567890',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: `https://github.com/owner/repo/actions/runs/${id}`
    }
  }

  if (config.workflow1 && config.workflow1 !== 'none') {
    runs[1] = [createRun(101, 1, config.workflow1)]
  }
  if (config.workflow2 && config.workflow2 !== 'none') {
    runs[2] = [createRun(201, 2, config.workflow2)]
  }
  if (config.workflow3 && config.workflow3 !== 'none') {
    runs[3] = [createRun(301, 3, config.workflow3)]
  }

  return runs
}

// Store subscriptions
let runsUpdateCallback: ((data: unknown) => void) | null = null

// Mock window.tikiDesktop.workflow
const mockWorkflowApi = {
  list: vi.fn(),
  runs: vi.fn(),
  runDetails: vi.fn(),
  openInBrowser: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  onRunsUpdate: vi.fn()
}

beforeEach(() => {
  runsUpdateCallback = null

  mockWorkflowApi.list.mockResolvedValue(mockWorkflows)
  mockWorkflowApi.runs.mockImplementation((_workflowId: number) => {
    return Promise.resolve([])
  })
  mockWorkflowApi.subscribe.mockImplementation((workflowId: number) => {
    return Promise.resolve({ subscribed: true, workflowId, cwd: '/test/path' })
  })
  mockWorkflowApi.unsubscribe.mockImplementation((workflowId: number) => {
    return Promise.resolve({ unsubscribed: true, workflowId, cwd: '/test/path' })
  })
  mockWorkflowApi.onRunsUpdate.mockImplementation((callback: (data: unknown) => void) => {
    runsUpdateCallback = callback
    return () => {
      runsUpdateCallback = null
    }
  })

  // Setup global mock
  window.tikiDesktop = {
    ...window.tikiDesktop,
    workflow: mockWorkflowApi
  } as typeof window.tikiDesktop
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('CIStatusIndicator', () => {
  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockWorkflowApi.list.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<CIStatusIndicator cwd="/test/path" />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should show loading tooltip text while loading', () => {
      mockWorkflowApi.list.mockImplementation(() => new Promise(() => {}))

      render(<CIStatusIndicator cwd="/test/path" />)

      const button = screen.getByTestId('ci-status-button')
      expect(button).toHaveAttribute('title', 'Loading CI status...')
    })
  })

  describe('Health Status - Green (All Passing)', () => {
    it('should show green/success icon when all workflows pass', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'success',
        workflow3: 'success'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      })
    })

    it('should show correct tooltip for all passing', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'success'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        const button = screen.getByTestId('ci-status-button')
        expect(button).toHaveAttribute('title', '2 passing')
      })
    })
  })

  describe('Health Status - Yellow (In Progress)', () => {
    it('should show yellow/in-progress icon when any workflow is running', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'in_progress'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('in-progress-icon')).toBeInTheDocument()
      })
    })

    it('should show correct tooltip when in-progress', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'in_progress',
        workflow3: 'success'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        const button = screen.getByTestId('ci-status-button')
        expect(button).toHaveAttribute('title', '2 passing, 1 in-progress')
      })
    })

    it('should subscribe to workflows with in-progress runs', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'in_progress'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(mockWorkflowApi.subscribe).toHaveBeenCalledWith(2, '/test/path')
      })
    })
  })

  describe('Health Status - Red (Failing)', () => {
    it('should show red/failure icon when any workflow fails', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'failure'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('failure-icon')).toBeInTheDocument()
      })
    })

    it('should prioritize red over yellow (failure over in-progress)', async () => {
      const runs = createMockRuns({
        workflow1: 'in_progress',
        workflow2: 'failure'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('failure-icon')).toBeInTheDocument()
      })
    })

    it('should show correct tooltip when failing', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'failure',
        workflow3: 'in_progress'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        const button = screen.getByTestId('ci-status-button')
        expect(button).toHaveAttribute('title', '1 passing, 1 failing, 1 in-progress')
      })
    })
  })

  describe('Health Status - None (No Runs)', () => {
    it('should show neutral icon when no workflow runs exist', async () => {
      mockWorkflowApi.runs.mockResolvedValue([])

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('no-runs-icon')).toBeInTheDocument()
      })
    })

    it('should show no workflows tooltip when empty', async () => {
      mockWorkflowApi.list.mockResolvedValue([])

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        const button = screen.getByTestId('ci-status-button')
        expect(button).toHaveAttribute('title', 'No workflow runs')
      })
    })
  })

  describe('Error State', () => {
    it('should show error icon when API fails', async () => {
      mockWorkflowApi.list.mockRejectedValue(new Error('Network error'))

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('error-icon')).toBeInTheDocument()
      })
    })

    it('should show error message in tooltip', async () => {
      mockWorkflowApi.list.mockRejectedValue(new Error('Network error'))

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        const button = screen.getByTestId('ci-status-button')
        expect(button).toHaveAttribute('title', 'CI status error: Network error')
      })
    })
  })

  describe('Click Handler', () => {
    it('should call onOpenDashboard when clicked', async () => {
      const handleOpenDashboard = vi.fn()
      mockWorkflowApi.runs.mockResolvedValue([])

      render(<CIStatusIndicator cwd="/test/path" onOpenDashboard={handleOpenDashboard} />)

      await waitFor(() => {
        expect(screen.getByTestId('ci-status-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('ci-status-button'))

      expect(handleOpenDashboard).toHaveBeenCalledTimes(1)
    })

    it('should not error when onOpenDashboard is not provided', async () => {
      mockWorkflowApi.runs.mockResolvedValue([])

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('ci-status-button')).toBeInTheDocument()
      })

      // Should not throw
      fireEvent.click(screen.getByTestId('ci-status-button'))
    })
  })

  describe('Tooltip', () => {
    it('should show tooltip on hover', async () => {
      const runs = createMockRuns({ workflow1: 'success' })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      })

      fireEvent.mouseEnter(screen.getByTestId('ci-status-button'))

      await waitFor(() => {
        expect(screen.getByTestId('ci-tooltip')).toBeInTheDocument()
      })
    })

    it('should hide tooltip on mouse leave', async () => {
      const runs = createMockRuns({ workflow1: 'success' })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      })

      fireEvent.mouseEnter(screen.getByTestId('ci-status-button'))
      await waitFor(() => {
        expect(screen.getByTestId('ci-tooltip')).toBeInTheDocument()
      })

      fireEvent.mouseLeave(screen.getByTestId('ci-status-button'))
      await waitFor(() => {
        expect(screen.queryByTestId('ci-tooltip')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should update status when receiving real-time update', async () => {
      const runs = createMockRuns({
        workflow1: 'success',
        workflow2: 'in_progress'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('in-progress-icon')).toBeInTheDocument()
      })

      // Simulate the workflow completing successfully
      if (runsUpdateCallback) {
        runsUpdateCallback({
          workflowId: 2,
          cwd: '/test/path',
          runs: [
            {
              id: 201,
              name: 'Deploy #201',
              status: 'completed',
              conclusion: 'success',
              event: 'push',
              headSha: 'abc1234567890',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              url: 'https://github.com/owner/repo/actions/runs/201'
            }
          ]
        })
      }

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      })
    })

    it('should unsubscribe when run completes', async () => {
      const runs = createMockRuns({
        workflow1: 'in_progress'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(mockWorkflowApi.subscribe).toHaveBeenCalledWith(1, '/test/path')
      })

      // Simulate the workflow completing
      if (runsUpdateCallback) {
        runsUpdateCallback({
          workflowId: 1,
          cwd: '/test/path',
          runs: [
            {
              id: 101,
              name: 'CI #101',
              status: 'completed',
              conclusion: 'success',
              event: 'push',
              headSha: 'abc1234567890',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              url: 'https://github.com/owner/repo/actions/runs/101'
            }
          ]
        })
      }

      await waitFor(() => {
        expect(mockWorkflowApi.unsubscribe).toHaveBeenCalledWith(1, '/test/path')
      })
    })

    it('should ignore updates from different cwd', async () => {
      const runs = createMockRuns({
        workflow1: 'success'
      })
      mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
        return Promise.resolve(runs[workflowId] || [])
      })

      render(<CIStatusIndicator cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      })

      // Simulate update from different cwd (should be ignored)
      if (runsUpdateCallback) {
        runsUpdateCallback({
          workflowId: 1,
          cwd: '/different/path',
          runs: [
            {
              id: 101,
              name: 'CI #101',
              status: 'completed',
              conclusion: 'failure',
              event: 'push',
              headSha: 'abc1234567890',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              url: 'https://github.com/owner/repo/actions/runs/101'
            }
          ]
        })
      }

      // Should still show success (update was ignored)
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { WorkflowDashboard } from '../WorkflowDashboard'

// Mock workflow data
const mockWorkflows = [
  { id: 1, name: 'CI', state: 'active' },
  { id: 2, name: 'Deploy', state: 'active' }
]

const mockRuns = {
  1: [
    {
      id: 101,
      name: 'CI #101',
      status: 'completed',
      conclusion: 'success',
      event: 'push',
      headSha: 'abc1234567890',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      url: 'https://github.com/owner/repo/actions/runs/101'
    },
    {
      id: 102,
      name: 'CI #102',
      status: 'completed',
      conclusion: 'failure',
      event: 'pull_request',
      headSha: 'def7890123456',
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      url: 'https://github.com/owner/repo/actions/runs/102'
    }
  ],
  2: [
    {
      id: 201,
      name: 'Deploy #201',
      status: 'in_progress',
      conclusion: null,
      event: 'workflow_dispatch',
      headSha: 'ghi4567890123',
      createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      updatedAt: new Date().toISOString(),
      url: 'https://github.com/owner/repo/actions/runs/201'
    }
  ]
}

// Store subscriptions
let subscriptions: number[] = []
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
  subscriptions = []
  runsUpdateCallback = null

  mockWorkflowApi.list.mockResolvedValue(mockWorkflows)
  mockWorkflowApi.runs.mockImplementation((workflowId: number) => {
    return Promise.resolve(mockRuns[workflowId as keyof typeof mockRuns] || [])
  })
  mockWorkflowApi.runDetails.mockResolvedValue({
    ...mockRuns[1][0],
    jobs: [],
    logsUrl: 'https://example.com/logs'
  })
  mockWorkflowApi.openInBrowser.mockResolvedValue(undefined)
  mockWorkflowApi.subscribe.mockImplementation((workflowId: number) => {
    subscriptions.push(workflowId)
    return Promise.resolve({ subscribed: true, workflowId, cwd: '/test/path' })
  })
  mockWorkflowApi.unsubscribe.mockImplementation((workflowId: number) => {
    subscriptions = subscriptions.filter((id) => id !== workflowId)
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

describe('WorkflowDashboard', () => {
  it('should render the dashboard header', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    expect(screen.getByText('CI/CD Status')).toBeInTheDocument()
  })

  it('should show loading state initially', async () => {
    mockWorkflowApi.list.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<WorkflowDashboard cwd="/test/path" />)

    expect(screen.getByText(/Loading workflows/i)).toBeInTheDocument()
  })

  it('should render workflows after loading', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI')).toBeInTheDocument()
    })

    expect(screen.getByText('Deploy')).toBeInTheDocument()
  })

  it('should show error state when API fails', async () => {
    mockWorkflowApi.list.mockRejectedValue(new Error('Network error'))

    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load workflows/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('should show retry button on error', async () => {
    mockWorkflowApi.list.mockRejectedValue(new Error('Network error'))

    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('should show no workflows message when empty', async () => {
    mockWorkflowApi.list.mockResolvedValue([])

    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByTestId('no-workflows')).toBeInTheDocument()
    })
  })

  it('should display workflow runs when expanded', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI')).toBeInTheDocument()
    })

    // First workflow should be expanded by default
    await waitFor(() => {
      expect(screen.getByText('CI #101')).toBeInTheDocument()
    })
  })

  it('should display success status icon for successful runs', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI #101')).toBeInTheDocument()
    })

    const statusIcons = screen.getAllByTestId('run-status-icon')
    expect(statusIcons.length).toBeGreaterThan(0)
  })

  it('should display failure status for failed runs', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI #102')).toBeInTheDocument()
    })

    expect(screen.getByText('failure')).toBeInTheDocument()
  })

  it('should show elapsed time for in-progress runs', async () => {
    // Expand the Deploy workflow to see in-progress run
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('Deploy')).toBeInTheDocument()
    })

    // Click to expand Deploy workflow
    fireEvent.click(screen.getByText('Deploy'))

    await waitFor(() => {
      expect(screen.getByTestId('elapsed-time')).toBeInTheDocument()
    })

    expect(screen.getByText(/Running for/i)).toBeInTheDocument()
  })

  it('should subscribe to workflows with in-progress runs', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('Deploy')).toBeInTheDocument()
    })

    // Wait for runs to be fetched and subscription to happen
    await waitFor(() => {
      expect(mockWorkflowApi.subscribe).toHaveBeenCalledWith(2, '/test/path')
    })
  })

  it('should open run in browser when clicked', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI #101')).toBeInTheDocument()
    })

    const runItem = screen.getByText('CI #101').closest('button')
    expect(runItem).toBeInTheDocument()

    if (runItem) {
      fireEvent.click(runItem)
    }

    await waitFor(() => {
      expect(mockWorkflowApi.openInBrowser).toHaveBeenCalledWith(
        'https://github.com/owner/repo/actions/runs/101'
      )
    })
  })

  it('should show expand button for failed runs', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI #102')).toBeInTheDocument()
    })

    // Find the expand button for the failed run
    const expandButtons = screen.getAllByTestId('expand-button')
    expect(expandButtons.length).toBeGreaterThan(0)
  })

  it('should toggle failure details when expand button clicked', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI #102')).toBeInTheDocument()
    })

    const expandButton = screen.getAllByTestId('expand-button')[0]
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByTestId('failure-details')).toBeInTheDocument()
    })
  })

  it('should display truncated commit SHA', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('abc1234')).toBeInTheDocument()
    })
  })

  it('should display event trigger type', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('push')).toBeInTheDocument()
    })
  })

  it('should update runs when receiving real-time update', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI')).toBeInTheDocument()
    })

    // Simulate a real-time update
    if (runsUpdateCallback) {
      runsUpdateCallback({
        workflowId: 1,
        cwd: '/test/path',
        runs: [
          {
            id: 103,
            name: 'CI #103',
            status: 'completed',
            conclusion: 'success',
            event: 'push',
            headSha: 'xyz1234567890',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            url: 'https://github.com/owner/repo/actions/runs/103'
          }
        ]
      })
    }

    await waitFor(() => {
      expect(screen.getByText('CI #103')).toBeInTheDocument()
    })
  })

  it('should toggle workflow expansion on click', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI')).toBeInTheDocument()
    })

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('CI #101')).toBeInTheDocument()
    })

    // Click to collapse
    fireEvent.click(screen.getByText('CI'))

    await waitFor(() => {
      expect(screen.queryByText('CI #101')).not.toBeInTheDocument()
    })

    // Click to expand again
    fireEvent.click(screen.getByText('CI'))

    await waitFor(() => {
      expect(screen.getByText('CI #101')).toBeInTheDocument()
    })
  })

  it('should show run count for each workflow', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('2 runs')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('1 runs')).toBeInTheDocument()
    })
  })

  it('should have a refresh button', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByTitle('Refresh workflows')).toBeInTheDocument()
    })
  })

  it('should refresh workflows when refresh button clicked', async () => {
    render(<WorkflowDashboard cwd="/test/path" />)

    await waitFor(() => {
      expect(screen.getByText('CI')).toBeInTheDocument()
    })

    // Clear previous calls
    mockWorkflowApi.list.mockClear()

    // Click refresh
    fireEvent.click(screen.getByTitle('Refresh workflows'))

    await waitFor(() => {
      expect(mockWorkflowApi.list).toHaveBeenCalledWith('/test/path')
    })
  })
})

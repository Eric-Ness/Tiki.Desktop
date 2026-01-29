import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MainContent } from '../components/layout/MainContent'

// Mock child components
vi.mock('../components/terminal/TerminalTabs', () => ({
  TerminalTabs: () => <div data-testid="terminal-tabs">Terminal</div>
}))

vi.mock('../components/workflow/WorkflowCanvas', () => ({
  WorkflowCanvas: () => <div data-testid="workflow-canvas">Workflow</div>
}))

vi.mock('../components/timeline', () => ({
  TimelineView: () => <div data-testid="timeline-view">Timeline</div>
}))

vi.mock('../components/config', () => ({
  ConfigEditor: () => <div data-testid="config-editor">Config</div>
}))

vi.mock('../components/activity', () => ({
  ActivityLog: () => <div data-testid="activity-log">Activity</div>
}))

vi.mock('../components/dependencies', () => ({
  DependencyView: ({ onIssueSelect }: { onIssueSelect?: (n: number) => void }) => (
    <div data-testid="dependency-view" onClick={() => onIssueSelect?.(1)}>
      Dependencies
    </div>
  )
}))

// Mock stores
vi.mock('../stores/activity-store', () => ({
  useActivityStore: vi.fn(() => ({ events: [] }))
}))

vi.mock('../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      currentPlan: null,
      tikiState: null,
      issues: [
        { number: 1, title: 'Test', state: 'OPEN', body: '', labels: [], url: '', createdAt: '', updatedAt: '' }
      ],
      releases: [],
      setSelectedIssue: vi.fn(),
      setSelectedNode: vi.fn()
    }
    return selector(state)
  })
}))

// Mock timeline utils
vi.mock('../lib/timeline-utils', () => ({
  extractTimeline: vi.fn(() => ({ phases: [], events: [] }))
}))

describe('MainContent - Dependencies Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Dependencies tab button', () => {
    render(<MainContent cwd="/test/path" />)

    expect(screen.getByRole('button', { name: /dependencies/i })).toBeInTheDocument()
  })

  it('should not show DependencyView by default (terminal is default)', () => {
    render(<MainContent cwd="/test/path" />)

    expect(screen.queryByTestId('dependency-view')).not.toBeInTheDocument()
    expect(screen.getByTestId('terminal-tabs')).toBeInTheDocument()
  })

  it('should show DependencyView when Dependencies tab is clicked', () => {
    render(<MainContent cwd="/test/path" />)

    const dependenciesTab = screen.getByRole('button', { name: /dependencies/i })
    fireEvent.click(dependenciesTab)

    expect(screen.getByTestId('dependency-view')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-tabs')).not.toBeInTheDocument()
  })

  it('should highlight Dependencies tab when active', () => {
    render(<MainContent cwd="/test/path" />)

    const dependenciesTab = screen.getByRole('button', { name: /dependencies/i })
    fireEvent.click(dependenciesTab)

    // Active tab should have white text and bg-background classes
    expect(dependenciesTab).toHaveClass('text-white')
  })

  it('should switch between tabs correctly', () => {
    render(<MainContent cwd="/test/path" />)

    // Click Dependencies
    fireEvent.click(screen.getByRole('button', { name: /dependencies/i }))
    expect(screen.getByTestId('dependency-view')).toBeInTheDocument()

    // Click Workflow
    fireEvent.click(screen.getByRole('button', { name: /workflow/i }))
    expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('dependency-view')).not.toBeInTheDocument()

    // Click back to Dependencies
    fireEvent.click(screen.getByRole('button', { name: /dependencies/i }))
    expect(screen.getByTestId('dependency-view')).toBeInTheDocument()
  })
})

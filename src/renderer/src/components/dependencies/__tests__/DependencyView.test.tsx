import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DependencyView } from '../DependencyView'
import type { GitHubIssue, Release } from '../../../stores/tiki-store'

// Mock child components
vi.mock('../DependencyGraph', () => ({
  DependencyGraph: ({ issues, releaseFilter, onIssueSelect }: {
    issues: GitHubIssue[]
    releaseFilter?: string
    onIssueSelect?: (n: number) => void
  }) => (
    <div
      data-testid="dependency-graph"
      data-issue-count={issues.length}
      data-release-filter={releaseFilter ?? 'none'}
      onClick={() => onIssueSelect?.(1)}
    >
      Graph
    </div>
  )
}))

vi.mock('../DependencyFilters', () => ({
  DependencyFilters: ({
    selectedRelease,
    onReleaseChange,
    showOrphans,
    onShowOrphansChange,
    totalIssueCount
  }: {
    selectedRelease: string | null
    onReleaseChange: (r: string | null) => void
    showOrphans: boolean
    onShowOrphansChange: (v: boolean) => void
    totalIssueCount: number
  }) => (
    <div data-testid="dependency-filters" data-release={selectedRelease ?? 'none'}>
      <button data-testid="select-v1" onClick={() => onReleaseChange('v1.0.0')}>
        Select v1.0.0
      </button>
      <button data-testid="clear-filter" onClick={() => onReleaseChange(null)}>
        Clear
      </button>
      <button data-testid="toggle-orphans" onClick={() => onShowOrphansChange(!showOrphans)}>
        Toggle Orphans ({showOrphans ? 'on' : 'off'})
      </button>
      <span data-testid="total-count">{totalIssueCount}</span>
    </div>
  )
}))

describe('DependencyView', () => {
  const mockIssues: GitHubIssue[] = [
    {
      number: 1,
      title: 'Issue 1',
      state: 'OPEN',
      body: '',
      labels: [],
      url: '',
      createdAt: '',
      updatedAt: ''
    },
    {
      number: 2,
      title: 'Issue 2',
      state: 'OPEN',
      body: 'Depends on #1',
      labels: [],
      url: '',
      createdAt: '',
      updatedAt: ''
    }
  ]

  const mockReleases: Release[] = [
    {
      version: 'v1.0.0',
      status: 'active',
      issues: [
        { number: 1, title: 'Issue 1', status: 'open', currentPhase: null, totalPhases: null, completedAt: null }
      ]
    }
  ]

  const defaultProps = {
    issues: mockIssues,
    releases: mockReleases,
    onIssueSelect: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render DependencyFilters', () => {
    render(<DependencyView {...defaultProps} />)

    expect(screen.getByTestId('dependency-filters')).toBeInTheDocument()
  })

  it('should render DependencyGraph', () => {
    render(<DependencyView {...defaultProps} />)

    expect(screen.getByTestId('dependency-graph')).toBeInTheDocument()
  })

  it('should pass issues to graph', () => {
    render(<DependencyView {...defaultProps} />)

    const graph = screen.getByTestId('dependency-graph')
    expect(graph.getAttribute('data-issue-count')).toBe('2')
  })

  it('should pass total issue count to filters', () => {
    render(<DependencyView {...defaultProps} />)

    expect(screen.getByTestId('total-count').textContent).toBe('2')
  })

  it('should update release filter when changed', () => {
    render(<DependencyView {...defaultProps} />)

    // Initial state - no filter
    expect(screen.getByTestId('dependency-graph').getAttribute('data-release-filter')).toBe('none')

    // Select release
    fireEvent.click(screen.getByTestId('select-v1'))

    expect(screen.getByTestId('dependency-graph').getAttribute('data-release-filter')).toBe('v1.0.0')
  })

  it('should clear release filter', () => {
    render(<DependencyView {...defaultProps} />)

    // Select then clear
    fireEvent.click(screen.getByTestId('select-v1'))
    fireEvent.click(screen.getByTestId('clear-filter'))

    expect(screen.getByTestId('dependency-graph').getAttribute('data-release-filter')).toBe('none')
  })

  it('should propagate issue selection to parent', () => {
    render(<DependencyView {...defaultProps} />)

    fireEvent.click(screen.getByTestId('dependency-graph'))

    expect(defaultProps.onIssueSelect).toHaveBeenCalledWith(1)
  })
})

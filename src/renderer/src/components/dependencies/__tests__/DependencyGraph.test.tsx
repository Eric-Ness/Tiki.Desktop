import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DependencyGraph } from '../DependencyGraph'
import type { GitHubIssue } from '../../../stores/tiki-store'

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, onNodeClick, children }: {
    nodes: unknown[]
    edges: unknown[]
    onNodeClick?: (event: unknown, node: { id: string }) => void
    children?: React.ReactNode
  }) => (
    <div data-testid="react-flow">
      <div data-testid="nodes-count">{nodes.length}</div>
      <div data-testid="edges-count">{edges.length}</div>
      {(nodes as Array<{ id: string; data: { number: number; title: string; hasCircularDep?: boolean } }>).map((node) => (
        <div
          key={node.id}
          data-testid={`node-${node.id}`}
          data-circular={node.data.hasCircularDep}
          onClick={(e) => onNodeClick?.(e, node)}
        >
          #{node.data.number} - {node.data.title}
        </div>
      ))}
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  BackgroundVariant: { Dots: 'dots' },
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' }
}))

// Mock dagre with proper class implementation
vi.mock('dagre', () => {
  const MockGraph = function() {
    return {
      setGraph: vi.fn(),
      setDefaultEdgeLabel: vi.fn(),
      setNode: vi.fn(),
      setEdge: vi.fn(),
      node: vi.fn().mockReturnValue({ x: 100, y: 100 })
    }
  }
  return {
    default: {
      graphlib: {
        Graph: MockGraph
      },
      layout: vi.fn()
    }
  }
})

describe('DependencyGraph', () => {
  const mockIssues: GitHubIssue[] = [
    {
      number: 1,
      title: 'First issue',
      state: 'OPEN',
      body: '',
      labels: [],
      url: 'https://github.com/test/repo/issues/1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    {
      number: 2,
      title: 'Second issue',
      state: 'OPEN',
      body: 'Depends on #1',
      labels: [],
      url: 'https://github.com/test/repo/issues/2',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    {
      number: 3,
      title: 'Third issue',
      state: 'CLOSED',
      body: 'After #2',
      labels: [],
      url: 'https://github.com/test/repo/issues/3',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render ReactFlow container', () => {
    render(<DependencyGraph issues={mockIssues} />)

    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('should render Background, Controls, and MiniMap', () => {
    render(<DependencyGraph issues={mockIssues} />)

    expect(screen.getByTestId('background')).toBeInTheDocument()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
    expect(screen.getByTestId('minimap')).toBeInTheDocument()
  })

  it('should create nodes for each issue', () => {
    render(<DependencyGraph issues={mockIssues} />)

    expect(screen.getByTestId('nodes-count').textContent).toBe('3')
  })

  it('should create edges for dependencies', () => {
    render(<DependencyGraph issues={mockIssues} />)

    // Issue 2 depends on 1, Issue 3 depends on 2 = 2 edges
    expect(screen.getByTestId('edges-count').textContent).toBe('2')
  })

  it('should display issue number and title in nodes', () => {
    render(<DependencyGraph issues={mockIssues} />)

    expect(screen.getByText('#1 - First issue')).toBeInTheDocument()
    expect(screen.getByText('#2 - Second issue')).toBeInTheDocument()
    expect(screen.getByText('#3 - Third issue')).toBeInTheDocument()
  })

  it('should call onIssueSelect when node is clicked', () => {
    const onIssueSelect = vi.fn()
    render(<DependencyGraph issues={mockIssues} onIssueSelect={onIssueSelect} />)

    fireEvent.click(screen.getByTestId('node-issue-2'))

    expect(onIssueSelect).toHaveBeenCalledWith(2)
  })

  it('should render empty state when no issues', () => {
    render(<DependencyGraph issues={[]} />)

    expect(screen.getByTestId('nodes-count').textContent).toBe('0')
    expect(screen.getByTestId('edges-count').textContent).toBe('0')
  })

  it('should render issues without dependencies', () => {
    const issuesNoDeps: GitHubIssue[] = [
      {
        number: 1,
        title: 'Independent issue',
        state: 'OPEN',
        body: 'No dependencies here',
        labels: [],
        url: 'https://github.com/test/repo/issues/1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ]

    render(<DependencyGraph issues={issuesNoDeps} />)

    expect(screen.getByTestId('nodes-count').textContent).toBe('1')
    expect(screen.getByTestId('edges-count').textContent).toBe('0')
  })

  describe('circular dependency detection', () => {
    it('should mark nodes with circular dependencies', () => {
      const circularIssues: GitHubIssue[] = [
        {
          number: 1,
          title: 'Issue A',
          state: 'OPEN',
          body: 'Depends on #2',
          labels: [],
          url: 'https://github.com/test/repo/issues/1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          number: 2,
          title: 'Issue B',
          state: 'OPEN',
          body: 'Depends on #1',
          labels: [],
          url: 'https://github.com/test/repo/issues/2',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]

      render(<DependencyGraph issues={circularIssues} />)

      const node1 = screen.getByTestId('node-issue-1')
      const node2 = screen.getByTestId('node-issue-2')

      expect(node1.getAttribute('data-circular')).toBe('true')
      expect(node2.getAttribute('data-circular')).toBe('true')
    })

    it('should not mark nodes without circular dependencies', () => {
      render(<DependencyGraph issues={mockIssues} />)

      const node1 = screen.getByTestId('node-issue-1')
      const node2 = screen.getByTestId('node-issue-2')
      const node3 = screen.getByTestId('node-issue-3')

      expect(node1.getAttribute('data-circular')).toBe('false')
      expect(node2.getAttribute('data-circular')).toBe('false')
      expect(node3.getAttribute('data-circular')).toBe('false')
    })
  })

  describe('filtering', () => {
    it('should filter issues by release when releaseFilter is provided', () => {
      const issuesWithRelease: GitHubIssue[] = [
        {
          number: 1,
          title: 'v1.0 issue',
          state: 'OPEN',
          body: '',
          labels: [{ name: 'release:v1.0', color: '000000' }],
          url: 'https://github.com/test/repo/issues/1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          number: 2,
          title: 'v2.0 issue',
          state: 'OPEN',
          body: '',
          labels: [{ name: 'release:v2.0', color: '000000' }],
          url: 'https://github.com/test/repo/issues/2',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]

      render(<DependencyGraph issues={issuesWithRelease} releaseFilter="v1.0" />)

      // Should only show 1 issue matching v1.0
      expect(screen.getByTestId('nodes-count').textContent).toBe('1')
    })

    it('should filter by issueNumbers when provided', () => {
      render(<DependencyGraph issues={mockIssues} issueNumbers={new Set([1, 2])} />)

      // Should only show 2 issues
      expect(screen.getByTestId('nodes-count').textContent).toBe('2')
    })
  })
})

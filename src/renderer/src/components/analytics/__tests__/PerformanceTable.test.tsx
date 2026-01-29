import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PerformanceTable } from '../PerformanceTable'

describe('PerformanceTable', () => {
  const mockExecutions = [
    {
      issueNumber: 42,
      issueTitle: 'Add user authentication',
      issueType: 'feature',
      status: 'completed' as const,
      phases: [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' }
      ],
      totalTokens: 125000,
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T12:30:00Z'
    },
    {
      issueNumber: 43,
      issueTitle: 'Fix login bug',
      issueType: 'bug',
      status: 'failed' as const,
      phases: [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' }
      ],
      totalTokens: 45000,
      startedAt: '2024-01-16T09:00:00Z',
      completedAt: '2024-01-16T09:45:00Z'
    },
    {
      issueNumber: 44,
      issueTitle: 'Implement search feature',
      issueType: 'feature',
      status: 'in_progress' as const,
      phases: [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'in_progress' },
        { status: 'pending' }
      ],
      totalTokens: 78500,
      startedAt: '2024-01-17T14:00:00Z'
    }
  ]

  describe('Basic Rendering', () => {
    it('should render table container', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByTestId('performance-table')).toBeInTheDocument()
    })

    it('should render table headers', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('Issue')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Phases')).toBeInTheDocument()
      expect(screen.getByText('Tokens')).toBeInTheDocument()
      expect(screen.getByText('Duration')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('should render all execution rows', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('#42')).toBeInTheDocument()
      expect(screen.getByText('#43')).toBeInTheDocument()
      expect(screen.getByText('#44')).toBeInTheDocument()
    })

    it('should render issue titles', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('Add user authentication')).toBeInTheDocument()
      expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    })
  })

  describe('Table Columns', () => {
    it('should display issue type', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getAllByText('feature').length).toBe(2)
      expect(screen.getByText('bug')).toBeInTheDocument()
    })

    it('should display phases as progress indicator', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('5/5')).toBeInTheDocument()
      expect(screen.getByText('2/3')).toBeInTheDocument()
      expect(screen.getByText('2/4')).toBeInTheDocument()
    })

    it('should format token count with K suffix', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('125K')).toBeInTheDocument()
      expect(screen.getByText('45K')).toBeInTheDocument()
      expect(screen.getByText('78.5K')).toBeInTheDocument()
    })

    it('should calculate duration correctly', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      // First execution: 2.5 hours
      expect(screen.getByText('2h 30m')).toBeInTheDocument()
      // Second execution: 45 minutes
      expect(screen.getByText('45m')).toBeInTheDocument()
    })

    it('should show ongoing duration for in_progress executions', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      // The in_progress execution should show "In progress" or similar
      expect(screen.getByTestId('duration-in-progress-44')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show green badge for completed status', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      const completedBadge = screen.getByTestId('status-badge-42')
      expect(completedBadge).toHaveClass('bg-green-500/20')
      expect(completedBadge).toHaveClass('text-green-400')
    })

    it('should show red badge for failed status', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      const failedBadge = screen.getByTestId('status-badge-43')
      expect(failedBadge).toHaveClass('bg-red-500/20')
      expect(failedBadge).toHaveClass('text-red-400')
    })

    it('should show amber badge for in_progress status', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      const inProgressBadge = screen.getByTestId('status-badge-44')
      expect(inProgressBadge).toHaveClass('bg-amber-500/20')
      expect(inProgressBadge).toHaveClass('text-amber-400')
    })

    it('should display correct status text', () => {
      render(<PerformanceTable executions={mockExecutions} />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })
  })

  describe('Clickable Issue Number', () => {
    it('should call onIssueClick when issue number is clicked', () => {
      const handleClick = vi.fn()
      render(<PerformanceTable executions={mockExecutions} onIssueClick={handleClick} />)

      const issueLink = screen.getByText('#42')
      fireEvent.click(issueLink)

      expect(handleClick).toHaveBeenCalledWith(42)
    })

    it('should call onIssueClick with correct issue number', () => {
      const handleClick = vi.fn()
      render(<PerformanceTable executions={mockExecutions} onIssueClick={handleClick} />)

      const issueLink = screen.getByText('#43')
      fireEvent.click(issueLink)

      expect(handleClick).toHaveBeenCalledWith(43)
    })

    it('should have correct styling for clickable issue', () => {
      const handleClick = vi.fn()
      render(<PerformanceTable executions={mockExecutions} onIssueClick={handleClick} />)

      const issueLink = screen.getByText('#42')
      expect(issueLink).toHaveClass('text-amber-400')
      expect(issueLink).toHaveClass('hover:underline')
      expect(issueLink).toHaveClass('cursor-pointer')
    })

    it('should not be clickable when no handler provided', () => {
      render(<PerformanceTable executions={mockExecutions} />)

      const issueNumber = screen.getByText('#42')
      // Should still render but without click handler styling
      expect(issueNumber).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<PerformanceTable executions={[]} loading={true} />)
      expect(screen.getByTestId('performance-table-loading')).toBeInTheDocument()
    })

    it('should not show table rows when loading', () => {
      render(<PerformanceTable executions={mockExecutions} loading={true} />)
      expect(screen.queryByText('#42')).not.toBeInTheDocument()
    })

    it('should show skeleton rows when loading', () => {
      render(<PerformanceTable executions={[]} loading={true} />)
      const skeletons = screen.getAllByTestId('table-skeleton-row')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when executions array is empty', () => {
      render(<PerformanceTable executions={[]} />)
      expect(screen.getByTestId('performance-table-empty')).toBeInTheDocument()
    })

    it('should show helpful message in empty state', () => {
      render(<PerformanceTable executions={[]} />)
      expect(screen.getByText('No executions found')).toBeInTheDocument()
    })

    it('should still show table headers in empty state', () => {
      render(<PerformanceTable executions={[]} />)
      expect(screen.getByText('Issue')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct table header styling', () => {
      render(<PerformanceTable executions={mockExecutions} />)

      const headerRow = screen.getByTestId('table-header')
      expect(headerRow).toHaveClass('bg-slate-800')
    })

    it('should have correct header cell styling', () => {
      render(<PerformanceTable executions={mockExecutions} />)

      const headerCell = screen.getByText('Issue')
      expect(headerCell).toHaveClass('text-xs')
      expect(headerCell).toHaveClass('text-slate-400')
      expect(headerCell).toHaveClass('uppercase')
    })

    it('should have correct row styling', () => {
      render(<PerformanceTable executions={mockExecutions} />)

      const row = screen.getByTestId('table-row-42')
      expect(row).toHaveClass('border-b')
      expect(row).toHaveClass('border-slate-700')
      expect(row).toHaveClass('hover:bg-slate-800/50')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single execution', () => {
      const singleExecution = [mockExecutions[0]]
      render(<PerformanceTable executions={singleExecution} />)

      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('should handle execution with zero tokens', () => {
      const zeroTokens = [{
        ...mockExecutions[0],
        totalTokens: 0
      }]
      render(<PerformanceTable executions={zeroTokens} />)

      expect(screen.getByText('0K')).toBeInTheDocument()
    })

    it('should handle execution with very large token count', () => {
      const largeTokens = [{
        ...mockExecutions[0],
        totalTokens: 1500000
      }]
      render(<PerformanceTable executions={largeTokens} />)

      expect(screen.getByText('1500K')).toBeInTheDocument()
    })

    it('should handle very long issue title', () => {
      const longTitle = [{
        ...mockExecutions[0],
        issueTitle: 'This is a very long issue title that should be handled gracefully by the component'
      }]
      render(<PerformanceTable executions={longTitle} />)

      expect(screen.getByText(longTitle[0].issueTitle)).toBeInTheDocument()
    })

    it('should handle execution with no phases', () => {
      const noPhases = [{
        ...mockExecutions[0],
        phases: []
      }]
      render(<PerformanceTable executions={noPhases} />)

      expect(screen.getByText('0/0')).toBeInTheDocument()
    })

    it('should handle very short duration', () => {
      const shortDuration = [{
        ...mockExecutions[0],
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:01:00Z'
      }]
      render(<PerformanceTable executions={shortDuration} />)

      expect(screen.getByText('1m')).toBeInTheDocument()
    })

    it('should handle duration over 24 hours', () => {
      const longDuration = [{
        ...mockExecutions[0],
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-17T12:00:00Z'
      }]
      render(<PerformanceTable executions={longDuration} />)

      // 50 hours -> should show in hours
      expect(screen.getByText('50h 0m')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IssueList } from '../IssueList'
import type { GitHubIssue } from '../../../stores/tiki-store'

// Mock the tiki store
const mockIssues: GitHubIssue[] = []
const mockSetSelectedIssue = vi.fn()
const mockSetSelectedNode = vi.fn()
const mockSetSelectedRelease = vi.fn()
const mockSetSelectedKnowledge = vi.fn()

vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      issues: mockIssues,
      githubLoading: false,
      githubError: null,
      selectedIssue: null,
      setSelectedIssue: mockSetSelectedIssue,
      setSelectedNode: mockSetSelectedNode,
      setSelectedRelease: mockSetSelectedRelease,
      setSelectedKnowledge: mockSetSelectedKnowledge,
      tikiState: null,
      branchAssociations: {},
      currentBranch: null,
      predictions: {}
    }
    return selector(state)
  })
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn
}))

// Helper to create mock issues
function createMockIssues(count: number): GitHubIssue[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    title: `Issue ${i + 1}`,
    state: 'OPEN' as const,
    body: '',
    labels: [],
    hasPlan: false
  }))
}

describe('IssueList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIssues.length = 0
  })

  describe('pagination', () => {
    it('should show pagination controls when more than 10 issues', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Should show pagination
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should not show pagination controls when 10 or fewer issues', () => {
      mockIssues.push(...createMockIssues(10))

      render(<IssueList />)

      // Should not show pagination
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument()
    })

    it('should show only 10 issues per page', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Should show issues 1-10 on first page
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#10')).toBeInTheDocument()
      expect(screen.queryByText('#11')).not.toBeInTheDocument()
    })

    it('should navigate to next page', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Click next page
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Should show issues 11-15 on second page
      expect(screen.queryByText('#10')).not.toBeInTheDocument()
      expect(screen.getByText('#11')).toBeInTheDocument()
      expect(screen.getByText('#15')).toBeInTheDocument()
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument()
    })

    it('should navigate to previous page', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Go to page 2
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument()

      // Go back to page 1
      fireEvent.click(screen.getByRole('button', { name: /previous/i }))
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button on last page', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Go to last page
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should reset to page 1 when filter changes', () => {
      mockIssues.push(...createMockIssues(15))

      render(<IssueList />)

      // Go to page 2
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument()

      // Change filter to Closed (which has 0 items, so no pagination)
      fireEvent.click(screen.getByText('Closed'))

      // Then change back to Open
      fireEvent.click(screen.getByText('Open'))

      // Should be back on page 1
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument()
    })
  })
})

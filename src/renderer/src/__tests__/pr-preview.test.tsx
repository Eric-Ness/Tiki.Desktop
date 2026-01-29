import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PRPreview } from '../components/detail/PRPreview'
import type { PullRequest } from '../components/detail/PRPreview'

// Mock window.tikiDesktop
const mockGetPRForIssue = vi.fn()
const mockOpenExternal = vi.fn()

// Setup window.tikiDesktop mock - extends existing mock from setup.ts
beforeEach(() => {
  vi.clearAllMocks()

  // Extend the existing mock from setup.ts
  const existingMock = window.tikiDesktop || {}
  Object.defineProperty(window, 'tikiDesktop', {
    value: {
      ...existingMock,
      github: {
        ...existingMock.github,
        getPRForIssue: mockGetPRForIssue
      },
      shell: {
        openExternal: mockOpenExternal
      }
    },
    writable: true,
    configurable: true
  })
})

describe('PRPreview', () => {
  const mockPR: PullRequest = {
    number: 42,
    title: 'Fix the bug',
    state: 'OPEN',
    isDraft: false,
    headRefName: 'fix-bug',
    baseRefName: 'main',
    url: 'https://github.com/owner/repo/pull/42',
    mergeable: 'MERGEABLE',
    reviewDecision: 'APPROVED',
    statusCheckRollup: {
      state: 'SUCCESS',
      contexts: [
        { name: 'build', state: 'COMPLETED', conclusion: 'SUCCESS' },
        { name: 'test', state: 'COMPLETED', conclusion: 'SUCCESS' }
      ]
    }
  }

  describe('Loading state', () => {
    it('shows loading indicator while fetching PR', async () => {
      mockGetPRForIssue.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<PRPreview issueNumber={123} />)

      expect(screen.getByText(/Loading PR/i)).toBeInTheDocument()
    })
  })

  describe('No PR linked', () => {
    it('renders nothing when no PR is linked to the issue', async () => {
      mockGetPRForIssue.mockResolvedValue(null)

      const { container } = render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(mockGetPRForIssue).toHaveBeenCalledWith(123)
      })

      // Component should render nothing (null)
      await waitFor(() => {
        expect(container.querySelector('.pr-preview')).not.toBeInTheDocument()
      })
    })
  })

  describe('PR display', () => {
    it('displays PR number and title', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByText(/Pull Request #42/i)).toBeInTheDocument()
      })
    })

    it('displays branch information', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByText(/fix-bug/)).toBeInTheDocument()
        expect(screen.getByText(/main/)).toBeInTheDocument()
      })
    })

    it('displays open status badge', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('pr-status-badge')).toHaveTextContent('Open')
      })
    })

    it('displays merged status badge', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, state: 'MERGED' })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('pr-status-badge')).toHaveTextContent('Merged')
      })
    })

    it('displays closed status badge', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, state: 'CLOSED' })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('pr-status-badge')).toHaveTextContent('Closed')
      })
    })

    it('displays draft badge when PR is a draft', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, isDraft: true })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('pr-draft-badge')).toBeInTheDocument()
      })
    })
  })

  describe('Check status', () => {
    it('displays passing checks with success icon', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('check-status-success')).toBeInTheDocument()
      })
    })

    it('displays failing checks with failure icon', async () => {
      const prWithFailingChecks: PullRequest = {
        ...mockPR,
        statusCheckRollup: {
          state: 'FAILURE',
          contexts: [
            { name: 'build', state: 'COMPLETED', conclusion: 'FAILURE' }
          ]
        }
      }
      mockGetPRForIssue.mockResolvedValue(prWithFailingChecks)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('check-status-failure')).toBeInTheDocument()
      })
    })

    it('displays pending checks with pending icon', async () => {
      const prWithPendingChecks: PullRequest = {
        ...mockPR,
        statusCheckRollup: {
          state: 'PENDING',
          contexts: [
            { name: 'build', state: 'IN_PROGRESS', conclusion: '' }
          ]
        }
      }
      mockGetPRForIssue.mockResolvedValue(prWithPendingChecks)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('check-status-pending')).toBeInTheDocument()
      })
    })

    it('handles PR with no status checks', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, statusCheckRollup: null })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByText(/Pull Request #42/i)).toBeInTheDocument()
      })

      // Should not crash, no check status shown
      expect(screen.queryByTestId('check-status-success')).not.toBeInTheDocument()
      expect(screen.queryByTestId('check-status-failure')).not.toBeInTheDocument()
    })
  })

  describe('Review status', () => {
    it('displays approved review status', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('review-status')).toHaveTextContent('Approved')
      })
    })

    it('displays changes requested review status', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, reviewDecision: 'CHANGES_REQUESTED' })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('review-status')).toHaveTextContent('Changes Requested')
      })
    })

    it('displays pending review status', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, reviewDecision: 'REVIEW_REQUIRED' })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByTestId('review-status')).toHaveTextContent('Review Required')
      })
    })

    it('handles PR with no review decision', async () => {
      mockGetPRForIssue.mockResolvedValue({ ...mockPR, reviewDecision: null })

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByText(/Pull Request #42/i)).toBeInTheDocument()
      })

      // Should show no review or pending
      expect(screen.queryByTestId('review-status')).toBeNull()
    })
  })

  describe('View PR button', () => {
    it('opens PR in browser when clicked', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(screen.getByText(/View PR/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/View PR/i))

      expect(mockOpenExternal).toHaveBeenCalledWith(mockPR.url)
    })
  })

  describe('Refresh on issue change', () => {
    it('fetches PR when issue number changes', async () => {
      mockGetPRForIssue.mockResolvedValue(mockPR)

      const { rerender } = render(<PRPreview issueNumber={123} />)

      await waitFor(() => {
        expect(mockGetPRForIssue).toHaveBeenCalledWith(123)
      })

      mockGetPRForIssue.mockClear()

      rerender(<PRPreview issueNumber={456} />)

      await waitFor(() => {
        expect(mockGetPRForIssue).toHaveBeenCalledWith(456)
      })
    })
  })
})

describe('CheckStatus', () => {
  it('displays individual check names', async () => {
    mockGetPRForIssue.mockResolvedValue({
      number: 42,
      title: 'Test PR',
      state: 'OPEN',
      isDraft: false,
      headRefName: 'feature-branch',
      baseRefName: 'main',
      url: 'https://github.com/test',
      mergeable: 'MERGEABLE',
      reviewDecision: null,
      statusCheckRollup: {
        state: 'SUCCESS',
        contexts: [
          { name: 'ci-build', state: 'COMPLETED', conclusion: 'SUCCESS' },
          { name: 'ci-test', state: 'COMPLETED', conclusion: 'SUCCESS' },
          { name: 'ci-lint', state: 'COMPLETED', conclusion: 'FAILURE' }
        ]
      }
    })

    render(<PRPreview issueNumber={123} />)

    await waitFor(() => {
      expect(screen.getByText('ci-build')).toBeInTheDocument()
      expect(screen.getByText('ci-test')).toBeInTheDocument()
      expect(screen.getByText('ci-lint')).toBeInTheDocument()
    })
  })
})

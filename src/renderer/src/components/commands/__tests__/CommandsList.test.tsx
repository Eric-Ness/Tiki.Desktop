import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandsList } from '../CommandsList'

// Mock the tikiDesktop API
const mockCommands = [
  { name: 'tiki:yolo', path: '/path/tiki/yolo.md', relativePath: 'yolo.md', namespace: 'tiki', source: 'tiki' as const },
  { name: 'tiki:ship', path: '/path/tiki/ship.md', relativePath: 'ship.md', namespace: 'tiki', source: 'tiki' as const },
  { name: 'commit', path: '/path/claude/commit.md', relativePath: 'commit.md', source: 'claude' as const },
  { name: 'review', path: '/path/claude/review.md', relativePath: 'review.md', source: 'claude' as const }
]

vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      activeProject: { path: '/test/project' },
      selectedCommand: null,
      setSelectedCommand: vi.fn(),
      setSelectedNode: vi.fn(),
      setSelectedIssue: vi.fn(),
      setSelectedRelease: vi.fn(),
      setSelectedKnowledge: vi.fn(),
      setSelectedHook: vi.fn()
    }
    return selector(state)
  })
}))

// Setup window.tikiDesktop mock
beforeEach(() => {
  window.tikiDesktop = {
    commands: {
      list: vi.fn().mockResolvedValue(mockCommands),
      delete: vi.fn().mockResolvedValue(undefined)
    }
  } as unknown as typeof window.tikiDesktop
})

describe('CommandsList', () => {
  describe('collapsible source sections', () => {
    it('renders source section headers with collapse toggle', async () => {
      render(<CommandsList />)

      // Wait for commands to load
      await screen.findByText('.tiki/commands')

      // Both source headers should be visible
      expect(screen.getByText('.tiki/commands')).toBeInTheDocument()
      expect(screen.getByText('.claude/commands')).toBeInTheDocument()
    })

    it('collapses source section when header is clicked', async () => {
      render(<CommandsList />)

      await screen.findByText('.tiki/commands')

      // Commands should be visible initially
      expect(screen.getByText('/tiki:yolo')).toBeInTheDocument()

      // Click the tiki source header to collapse
      const tikiHeader = screen.getByText('.tiki/commands').closest('button')
      if (tikiHeader) {
        fireEvent.click(tikiHeader)
      }

      // Tiki commands should be hidden after collapse
      // The section content should be hidden via CSS (height: 0)
      const tikiSection = screen.getByTestId('source-section-tiki')
      expect(tikiSection).toHaveAttribute('data-collapsed', 'true')
    })

    it('expands collapsed section when clicked again', async () => {
      render(<CommandsList />)

      await screen.findByText('.tiki/commands')

      const tikiHeader = screen.getByText('.tiki/commands').closest('button')
      if (tikiHeader) {
        // Collapse
        fireEvent.click(tikiHeader)
        // Expand
        fireEvent.click(tikiHeader)
      }

      const tikiSection = screen.getByTestId('source-section-tiki')
      expect(tikiSection).toHaveAttribute('data-collapsed', 'false')
    })
  })

  describe('collapsible namespace subsections', () => {
    it('renders namespace headers with collapse toggle', async () => {
      render(<CommandsList />)

      await screen.findByText('.tiki/commands')

      // Namespace header should be visible (use testid to be specific)
      expect(screen.getByTestId('namespace-header-tiki-tiki')).toBeInTheDocument()
    })

    it('collapses namespace section when header is clicked', async () => {
      render(<CommandsList />)

      await screen.findByText('.tiki/commands')

      // Find the namespace header
      const namespaceHeader = screen.getByTestId('namespace-header-tiki-tiki')
      fireEvent.click(namespaceHeader)

      // Namespace section should be collapsed
      const namespaceSection = screen.getByTestId('namespace-section-tiki-tiki')
      expect(namespaceSection).toHaveAttribute('data-collapsed', 'true')
    })
  })

  describe('pagination', () => {
    it('shows pagination controls when commands exceed page size', async () => {
      // Create many commands to trigger pagination
      const manyCommands = Array.from({ length: 20 }, (_, i) => ({
        name: `cmd-${i}`,
        path: `/path/cmd-${i}.md`,
        relativePath: `cmd-${i}.md`,
        source: 'claude' as const
      }))

      window.tikiDesktop.commands.list = vi.fn().mockResolvedValue(manyCommands)

      render(<CommandsList />)

      await screen.findByText('.claude/commands')

      // Pagination controls should be visible
      expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument()
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Next page')).toBeInTheDocument()
    })

    it('does not show pagination when commands fit on one page', async () => {
      render(<CommandsList />)

      await screen.findByText('.tiki/commands')

      // Pagination should not be visible with only 4 commands
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument()
    })

    it('navigates to next page when next button is clicked', async () => {
      const manyCommands = Array.from({ length: 20 }, (_, i) => ({
        name: `cmd-${i}`,
        path: `/path/cmd-${i}.md`,
        relativePath: `cmd-${i}.md`,
        source: 'claude' as const
      }))

      window.tikiDesktop.commands.list = vi.fn().mockResolvedValue(manyCommands)

      render(<CommandsList />)

      await screen.findByText('.claude/commands')

      // Should show page 1
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

      // Click next
      fireEvent.click(screen.getByLabelText('Next page'))

      // Should show page 2
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    })
  })
})

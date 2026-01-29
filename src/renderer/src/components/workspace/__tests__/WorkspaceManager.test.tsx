import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceManager } from '../WorkspaceManager'

describe('WorkspaceManager', () => {
  const mockOnClose = vi.fn()
  const mockOnRestore = vi.fn()
  const mockOnRename = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultSnapshots = [
    {
      id: '1',
      name: 'Auth Feature Work',
      description: 'Working on authentication feature',
      activeIssue: 42,
      terminals: [{ name: 'Terminal 1' }, { name: 'Terminal 2' }, { name: 'Terminal 3' }],
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      size: 1024 * 50 // 50KB
    },
    {
      id: '2',
      name: 'Bug Investigation',
      description: 'Investigating bug in login flow',
      activeIssue: 38,
      terminals: [{ name: 'Debug' }, { name: 'Main' }],
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      size: 1024 * 30 // 30KB
    },
    {
      id: '3',
      name: 'Documentation Update',
      terminals: [{ name: 'Editor' }],
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      size: 1024 * 20 // 20KB
    }
  ]

  const defaultStorageInfo = {
    used: 100 * 1024, // 100KB
    limit: 1024 * 1024, // 1MB
    snapshots: 3
  }

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    snapshots: defaultSnapshots,
    storageInfo: defaultStorageInfo,
    onRestore: mockOnRestore,
    onRename: mockOnRename,
    onDelete: mockOnDelete
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText('Manage Workspaces')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<WorkspaceManager {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Manage Workspaces')).not.toBeInTheDocument()
    })
  })

  describe('Search and filter', () => {
    it('should render search input', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByPlaceholderText(/search workspaces/i)).toBeInTheDocument()
    })

    it('should filter workspaces by name when searching', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'Auth')

      expect(screen.getByText('Auth Feature Work')).toBeInTheDocument()
      expect(screen.queryByText('Bug Investigation')).not.toBeInTheDocument()
      expect(screen.queryByText('Documentation Update')).not.toBeInTheDocument()
    })

    it('should filter workspaces by description when searching', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'login')

      expect(screen.queryByText('Auth Feature Work')).not.toBeInTheDocument()
      expect(screen.getByText('Bug Investigation')).toBeInTheDocument()
      expect(screen.queryByText('Documentation Update')).not.toBeInTheDocument()
    })

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText(/no workspaces found/i)).toBeInTheDocument()
    })

    it('should be case insensitive when searching', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/search workspaces/i)
      await user.type(searchInput, 'auth')

      expect(screen.getByText('Auth Feature Work')).toBeInTheDocument()
    })
  })

  describe('Workspace list', () => {
    it('should display workspace names', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText('Auth Feature Work')).toBeInTheDocument()
      expect(screen.getByText('Bug Investigation')).toBeInTheDocument()
      expect(screen.getByText('Documentation Update')).toBeInTheDocument()
    })

    it('should display issue number when present', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/Issue #42/)).toBeInTheDocument()
      expect(screen.getByText(/Issue #38/)).toBeInTheDocument()
    })

    it('should display terminal count for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/3 terminals/)).toBeInTheDocument()
      expect(screen.getByText(/2 terminals/)).toBeInTheDocument()
      expect(screen.getByText(/1 terminal(?!s)/)).toBeInTheDocument()
    })

    it('should display size for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/50 KB/)).toBeInTheDocument()
      expect(screen.getByText(/30 KB/)).toBeInTheDocument()
      expect(screen.getByText(/20 KB/)).toBeInTheDocument()
    })

    it('should display relative time for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument()
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument()
      expect(screen.getByText(/3 days ago/i)).toBeInTheDocument()
    })
  })

  describe('Actions - Restore', () => {
    it('should render restore button for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
      expect(restoreButtons).toHaveLength(3)
    })

    it('should call onRestore with workspace id when restore is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
      await user.click(restoreButtons[0])

      expect(mockOnRestore).toHaveBeenCalledWith('1')
    })
  })

  describe('Actions - Rename', () => {
    it('should render rename button for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const renameButtons = screen.getAllByRole('button', { name: /rename/i })
      expect(renameButtons).toHaveLength(3)
    })

    it('should show rename input when rename button is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const renameButtons = screen.getAllByRole('button', { name: /rename/i })
      await user.click(renameButtons[0])

      expect(screen.getByDisplayValue('Auth Feature Work')).toBeInTheDocument()
    })

    it('should call onRename with new name when submitted', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const renameButtons = screen.getAllByRole('button', { name: /rename/i })
      await user.click(renameButtons[0])

      const input = screen.getByDisplayValue('Auth Feature Work')
      await user.clear(input)
      await user.type(input, 'New Name{Enter}')

      expect(mockOnRename).toHaveBeenCalledWith('1', 'New Name')
    })

    it('should cancel rename when Escape is pressed', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const renameButtons = screen.getAllByRole('button', { name: /rename/i })
      await user.click(renameButtons[0])

      const input = screen.getByDisplayValue('Auth Feature Work')
      await user.clear(input)
      await user.type(input, 'New Name')
      await user.keyboard('{Escape}')

      expect(mockOnRename).not.toHaveBeenCalled()
      // Should show the original name again
      expect(screen.getByText('Auth Feature Work')).toBeInTheDocument()
    })
  })

  describe('Actions - Delete', () => {
    it('should render delete button for each workspace', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons).toHaveLength(3)
    })

    it('should show confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      // The name appears in the strong tag within the paragraph
      expect(screen.getByRole('heading', { name: /delete workspace/i })).toBeInTheDocument()
    })

    it('should call onDelete when delete is confirmed', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      // The confirm dialog has a Delete button - get all delete buttons and click the last one (confirm)
      const allDeleteButtons = screen.getAllByRole('button', { name: /delete/i })
      const confirmButton = allDeleteButtons[allDeleteButtons.length - 1]
      await user.click(confirmButton)

      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })

    it('should not call onDelete when delete is cancelled', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Storage usage', () => {
    it('should display storage usage bar', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByTestId('storage-usage-bar')).toBeInTheDocument()
    })

    it('should display storage usage text', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/100 KB/)).toBeInTheDocument()
      expect(screen.getByText(/1 MB/)).toBeInTheDocument()
    })

    it('should display snapshot count', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByText(/3 snapshots/i)).toBeInTheDocument()
    })

    it('should show correct fill percentage in progress bar', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const progressBar = screen.getByTestId('storage-usage-fill')
      // 100KB / 1MB = 10%
      expect(progressBar).toHaveStyle({ width: '9.765625%' })
    })

    it('should show warning color when storage is nearly full', () => {
      const nearFullStorage = {
        used: 900 * 1024, // 900KB
        limit: 1024 * 1024, // 1MB
        snapshots: 10
      }

      render(<WorkspaceManager {...defaultProps} storageInfo={nearFullStorage} />)

      const progressBar = screen.getByTestId('storage-usage-fill')
      expect(progressBar).toHaveClass('bg-amber-500')
    })

    it('should show danger color when storage is very full', () => {
      const veryFullStorage = {
        used: 980 * 1024, // 980KB
        limit: 1024 * 1024, // 1MB
        snapshots: 15
      }

      render(<WorkspaceManager {...defaultProps} storageInfo={veryFullStorage} />)

      const progressBar = screen.getByTestId('storage-usage-fill')
      expect(progressBar).toHaveClass('bg-red-500')
    })
  })

  describe('Loading state', () => {
    it('should show loading indicator when loading is true', () => {
      render(<WorkspaceManager {...defaultProps} loading={true} />)

      expect(screen.getByTestId('workspace-manager-loading')).toBeInTheDocument()
    })

    it('should disable action buttons when loading', () => {
      render(<WorkspaceManager {...defaultProps} loading={true} />)

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
      restoreButtons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Close behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      const backdrop = screen.getByTestId('workspace-manager-backdrop')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()

      render(<WorkspaceManager {...defaultProps} />)

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no snapshots', () => {
      render(<WorkspaceManager {...defaultProps} snapshots={[]} storageInfo={{ used: 0, limit: 1024 * 1024, snapshots: 0 }} />)

      expect(screen.getByText(/no saved workspaces/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper role for the dialog', () => {
      render(<WorkspaceManager {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have proper aria label for close button', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have dark theme styling on the modal', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const modal = screen.getByTestId('workspace-manager-modal')
      expect(modal).toHaveClass('bg-slate-800')
    })

    it('should have proper header styling', () => {
      render(<WorkspaceManager {...defaultProps} />)

      const header = screen.getByText('Manage Workspaces')
      expect(header).toHaveClass('text-slate-100')
    })
  })
})

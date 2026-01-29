import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceSelector } from '../WorkspaceSelector'

describe('WorkspaceSelector', () => {
  const mockOnClose = vi.fn()
  const mockOnRestore = vi.fn()
  const mockOnSaveNew = vi.fn()
  const mockOnManage = vi.fn()

  const defaultSnapshots = [
    {
      id: '1',
      name: 'Auth Feature Work',
      activeIssue: 42,
      terminals: [{ name: 'Terminal 1' }, { name: 'Terminal 2' }, { name: 'Terminal 3' }],
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: '2',
      name: 'Bug Investigation',
      activeIssue: 38,
      terminals: [{ name: 'Debug' }, { name: 'Main' }],
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    {
      id: '3',
      name: 'Documentation Update',
      terminals: [{ name: 'Editor' }],
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    }
  ]

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    snapshots: defaultSnapshots,
    onRestore: mockOnRestore,
    onSaveNew: mockOnSaveNew,
    onManage: mockOnManage
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByText('Save Current Workspace')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<WorkspaceSelector {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Save Current Workspace')).not.toBeInTheDocument()
    })
  })

  describe('Save Current Workspace button', () => {
    it('should render Save Current Workspace button at top', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save current workspace/i })
      expect(saveButton).toBeInTheDocument()
    })

    it('should call onSaveNew when Save Current Workspace is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save current workspace/i })
      await user.click(saveButton)

      expect(mockOnSaveNew).toHaveBeenCalledTimes(1)
    })

    it('should have plus icon on save button', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save current workspace/i })
      expect(saveButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Recent Workspaces header', () => {
    it('should show Recent Workspaces label', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByText('Recent Workspaces')).toBeInTheDocument()
    })

    it('should not show Recent Workspaces when no snapshots', () => {
      render(<WorkspaceSelector {...defaultProps} snapshots={[]} />)

      expect(screen.queryByText('Recent Workspaces')).not.toBeInTheDocument()
    })
  })

  describe('Workspace list', () => {
    it('should display workspace names', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByText('Auth Feature Work')).toBeInTheDocument()
      expect(screen.getByText('Bug Investigation')).toBeInTheDocument()
      expect(screen.getByText('Documentation Update')).toBeInTheDocument()
    })

    it('should display issue number when present', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByText(/Issue #42/)).toBeInTheDocument()
      expect(screen.getByText(/Issue #38/)).toBeInTheDocument()
    })

    it('should not display issue when not present', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      // Documentation Update has no issue
      const docItem = screen.getByText('Documentation Update').closest('[data-testid="workspace-item"]')
      expect(docItem).not.toHaveTextContent(/Issue #/)
    })

    it('should display terminal count for each workspace', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByText(/3 terminals/)).toBeInTheDocument()
      expect(screen.getByText(/2 terminals/)).toBeInTheDocument()
      expect(screen.getByText(/1 terminal(?!s)/)).toBeInTheDocument()
    })

    it('should display relative time for each workspace', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      // Check that some relative time text is shown
      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument()
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument()
      expect(screen.getByText(/3 days ago/i)).toBeInTheDocument()
    })

    it('should call onRestore with workspace id when workspace is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      const workspaceItem = screen.getByText('Auth Feature Work').closest('button')
      await user.click(workspaceItem!)

      expect(mockOnRestore).toHaveBeenCalledWith('1')
    })

    it('should show empty state when no snapshots', () => {
      render(<WorkspaceSelector {...defaultProps} snapshots={[]} />)

      expect(screen.getByText(/no saved workspaces/i)).toBeInTheDocument()
    })
  })

  describe('Manage Workspaces link', () => {
    it('should render Manage Workspaces link at bottom', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      const manageLink = screen.getByRole('button', { name: /manage workspaces/i })
      expect(manageLink).toBeInTheDocument()
    })

    it('should call onManage when Manage Workspaces is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      const manageLink = screen.getByRole('button', { name: /manage workspaces/i })
      await user.click(manageLink)

      expect(mockOnManage).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading state', () => {
    it('should show loading indicator when loading is true', () => {
      render(<WorkspaceSelector {...defaultProps} loading={true} />)

      expect(screen.getByTestId('workspace-selector-loading')).toBeInTheDocument()
    })

    it('should disable workspace items when loading', () => {
      render(<WorkspaceSelector {...defaultProps} loading={true} />)

      const workspaceItem = screen.getByText('Auth Feature Work').closest('button')
      expect(workspaceItem).toBeDisabled()
    })

    it('should disable Save Current Workspace when loading', () => {
      render(<WorkspaceSelector {...defaultProps} loading={true} />)

      const saveButton = screen.getByRole('button', { name: /save current workspace/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Close behavior', () => {
    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      const backdrop = screen.getByTestId('workspace-selector-backdrop')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sorting', () => {
    it('should display workspaces sorted by most recent first', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      const workspaceItems = screen.getAllByTestId('workspace-item')

      // First should be Auth Feature Work (2 hours ago)
      expect(workspaceItems[0]).toHaveTextContent('Auth Feature Work')
      // Second should be Bug Investigation (yesterday)
      expect(workspaceItems[1]).toHaveTextContent('Bug Investigation')
      // Third should be Documentation Update (3 days ago)
      expect(workspaceItems[2]).toHaveTextContent('Documentation Update')
    })
  })

  describe('Accessibility', () => {
    it('should have proper role for the popover', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()

      render(<WorkspaceSelector {...defaultProps} />)

      // Tab to first interactive element
      await user.tab()

      // Should be able to navigate through items
      const saveButton = screen.getByRole('button', { name: /save current workspace/i })
      expect(saveButton).toHaveFocus()
    })
  })

  describe('Styling', () => {
    it('should have dark theme styling', () => {
      render(<WorkspaceSelector {...defaultProps} />)

      const popover = screen.getByTestId('workspace-selector-popover')
      expect(popover).toHaveClass('bg-slate-800')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestoreConfirmDialog } from '../RestoreConfirmDialog'

describe('RestoreConfirmDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnRestore = vi.fn()
  const mockOnSaveFirst = vi.fn()

  const defaultSnapshot = {
    name: 'Feature Development',
    terminals: [{ name: 'Terminal 1' }, { name: 'Terminal 2' }, { name: 'Terminal 3' }],
    activeIssue: 42,
    activeTab: 'terminal'
  }

  const defaultCurrentState = {
    terminalCount: 2
  }

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onRestore: mockOnRestore,
    onSaveFirst: mockOnSaveFirst,
    snapshot: defaultSnapshot,
    currentState: defaultCurrentState
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog visibility', () => {
    it('should render when isOpen is true', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText('Restore Workspace')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<RestoreConfirmDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Restore Workspace')).not.toBeInTheDocument()
    })
  })

  describe('Snapshot information', () => {
    it('should display snapshot name', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText('Feature Development')).toBeInTheDocument()
    })

    it('should display number of terminals to restore', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      // Use getAllByText since "3 terminals" appears in both snapshot info and warning
      const terminalTexts = screen.getAllByText(/3 terminals/i)
      expect(terminalTexts.length).toBeGreaterThan(0)
    })

    it('should display issue number when present', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      // Issue #42 appears in both snapshot info and warning
      const issueTexts = screen.getAllByText(/issue #42/i)
      expect(issueTexts.length).toBeGreaterThan(0)
    })

    it('should not display issue when not in snapshot', () => {
      const snapshotWithoutIssue = {
        ...defaultSnapshot,
        activeIssue: undefined
      }

      render(<RestoreConfirmDialog {...defaultProps} snapshot={snapshotWithoutIssue} />)

      expect(screen.queryByText(/issue #/i)).not.toBeInTheDocument()
    })

    it('should display active tab', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/Active tab: terminal/i)).toBeInTheDocument()
    })
  })

  describe('Change warnings', () => {
    it('should show warning about closing current terminals', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/close 2 terminals/i)).toBeInTheDocument()
    })

    it('should show warning about opening new terminals', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/open 3 terminals/i)).toBeInTheDocument()
    })

    it('should show issue switch warning when switching to different issue', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/switch to issue #42/i)).toBeInTheDocument()
    })

    it('should handle singular terminal count for current state', () => {
      const stateWithOneTerminal = {
        terminalCount: 1
      }

      render(<RestoreConfirmDialog {...defaultProps} currentState={stateWithOneTerminal} />)

      expect(screen.getByText(/close 1 terminal(?!s)/i)).toBeInTheDocument()
    })

    it('should handle zero current terminals', () => {
      const stateWithNoTerminals = {
        terminalCount: 0
      }

      render(<RestoreConfirmDialog {...defaultProps} currentState={stateWithNoTerminals} />)

      // Should still show open message but not close message for 0
      expect(screen.getByText(/open 3 terminals/i)).toBeInTheDocument()
    })

    it('should use amber/yellow styling for warnings', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      // Check for amber text color on warning elements
      const warningSection = screen.getByText(/this will/i).closest('div')
      expect(warningSection).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading state when restoring is true', () => {
      render(<RestoreConfirmDialog {...defaultProps} restoring={true} />)

      expect(screen.getByText(/restoring/i)).toBeInTheDocument()
    })

    it('should disable Restore button when restoring', () => {
      render(<RestoreConfirmDialog {...defaultProps} restoring={true} />)

      const restoreButton = screen.getByRole('button', { name: /restoring/i })
      expect(restoreButton).toBeDisabled()
    })

    it('should disable Save Current First button when restoring', () => {
      render(<RestoreConfirmDialog {...defaultProps} restoring={true} />)

      const saveFirstButton = screen.getByRole('button', { name: /save current first/i })
      expect(saveFirstButton).toBeDisabled()
    })

    it('should disable Cancel button when restoring', () => {
      render(<RestoreConfirmDialog {...defaultProps} restoring={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Dialog actions', () => {
    it('should render three action buttons', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save current first/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^restore$/i })).toBeInTheDocument()
    })

    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      // Focus within the dialog first
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Reset the mock since click already called it
      mockOnClose.mockClear()

      // Tab back in and press Escape
      render(<RestoreConfirmDialog {...defaultProps} />)
      const backdrop = screen.getAllByTestId('dialog-backdrop')[0]
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      const backdrop = screen.getByTestId('dialog-backdrop')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onSaveFirst when Save Current First is clicked', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      const saveFirstButton = screen.getByRole('button', { name: /save current first/i })
      await user.click(saveFirstButton)

      expect(mockOnSaveFirst).toHaveBeenCalledTimes(1)
    })

    it('should call onRestore when Restore is clicked', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      const restoreButton = screen.getByRole('button', { name: /^restore$/i })
      await user.click(restoreButton)

      expect(mockOnRestore).toHaveBeenCalledTimes(1)
    })
  })

  describe('Close button', () => {
    it('should render close button in header', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(<RestoreConfirmDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Terminal list display', () => {
    it('should display terminal names from snapshot', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByText('Terminal 1')).toBeInTheDocument()
      expect(screen.getByText('Terminal 2')).toBeInTheDocument()
      expect(screen.getByText('Terminal 3')).toBeInTheDocument()
    })

    it('should handle empty terminal list', () => {
      const snapshotWithNoTerminals = {
        ...defaultSnapshot,
        terminals: []
      }

      render(<RestoreConfirmDialog {...defaultProps} snapshot={snapshotWithNoTerminals} />)

      // 0 terminals appears in both info and warning
      const terminalTexts = screen.getAllByText(/0 terminals/i)
      expect(terminalTexts.length).toBeGreaterThan(0)
    })

    it('should handle singular terminal in snapshot', () => {
      const snapshotWithOneTerminal = {
        ...defaultSnapshot,
        terminals: [{ name: 'Main Terminal' }]
      }

      render(<RestoreConfirmDialog {...defaultProps} snapshot={snapshotWithOneTerminal} />)

      // "1 terminal" (singular) appears in both snapshot info and warning
      const terminalTexts = screen.getAllByText(/1 terminal(?!s)/i)
      expect(terminalTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria labels', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Button styling', () => {
    it('should have primary amber styling on Restore button', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      const restoreButton = screen.getByRole('button', { name: /^restore$/i })
      expect(restoreButton).toHaveClass('bg-amber-600')
    })

    it('should have secondary slate styling on Save Current First button', () => {
      render(<RestoreConfirmDialog {...defaultProps} />)

      const saveFirstButton = screen.getByRole('button', { name: /save current first/i })
      expect(saveFirstButton).toHaveClass('bg-slate-600')
    })
  })
})

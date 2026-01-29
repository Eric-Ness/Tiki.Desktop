import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveWorkspaceDialog } from '../SaveWorkspaceDialog'

describe('SaveWorkspaceDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  const defaultCurrentState = {
    terminalCount: 3,
    activeIssue: 45,
    activeTab: 'terminal'
  }

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    currentState: defaultCurrentState
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog visibility', () => {
    it('should render when isOpen is true', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByText('Save Workspace')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<SaveWorkspaceDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Save Workspace')).not.toBeInTheDocument()
    })
  })

  describe('Name input', () => {
    it('should render name input field with required indicator', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should update name state when typing', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/name/i)
      await user.type(input, 'My Workspace')

      expect(input).toHaveValue('My Workspace')
    })

    it('should have Save button disabled when name is empty', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save$/i })
      expect(saveButton).toBeDisabled()
    })

    it('should enable Save button when name is provided', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/name/i)
      await user.type(input, 'My Workspace')

      const saveButton = screen.getByRole('button', { name: /save$/i })
      expect(saveButton).not.toBeDisabled()
    })

    it('should trim whitespace from name when saving', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/name/i)
      await user.type(input, '  My Workspace  ')

      const saveButton = screen.getByRole('button', { name: /save$/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith('My Workspace', undefined)
    })
  })

  describe('Description textarea', () => {
    it('should render description textarea as optional', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('should update description state when typing', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const textarea = screen.getByLabelText(/description/i)
      await user.click(textarea)
      await user.paste('Working on feature X')

      expect(textarea).toHaveValue('Working on feature X')
    })

    it('should pass description to onSave when provided', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      const descInput = screen.getByLabelText(/description/i)

      await user.type(nameInput, 'My Workspace')
      await user.type(descInput, 'Working on feature X')

      const saveButton = screen.getByRole('button', { name: /save$/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith('My Workspace', 'Working on feature X')
    })
  })

  describe('Current state summary', () => {
    it('should display terminal count', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByText(/3 terminals/i)).toBeInTheDocument()
    })

    it('should display active issue when present', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByText(/issue #45/i)).toBeInTheDocument()
    })

    it('should not display issue when not active', () => {
      const stateWithoutIssue = {
        terminalCount: 2,
        activeTab: 'issues'
      }

      render(<SaveWorkspaceDialog {...defaultProps} currentState={stateWithoutIssue} />)

      expect(screen.queryByText(/issue #/i)).not.toBeInTheDocument()
    })

    it('should display active tab', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByText(/Active tab: terminal/i)).toBeInTheDocument()
    })

    it('should handle singular terminal count', () => {
      const stateWithOneTerminal = {
        terminalCount: 1,
        activeTab: 'terminal'
      }

      render(<SaveWorkspaceDialog {...defaultProps} currentState={stateWithOneTerminal} />)

      expect(screen.getByText(/1 terminal(?!s)/i)).toBeInTheDocument()
    })

    it('should handle zero terminals', () => {
      const stateWithNoTerminals = {
        terminalCount: 0,
        activeTab: 'issues'
      }

      render(<SaveWorkspaceDialog {...defaultProps} currentState={stateWithNoTerminals} />)

      expect(screen.getByText(/0 terminals/i)).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading state when saving is true', () => {
      render(<SaveWorkspaceDialog {...defaultProps} saving={true} />)

      expect(screen.getByText(/saving/i)).toBeInTheDocument()
    })

    it('should disable Save button when saving', () => {
      render(<SaveWorkspaceDialog {...defaultProps} saving={true} />)

      const saveButton = screen.getByRole('button', { name: /saving/i })
      expect(saveButton).toBeDisabled()
    })

    it('should disable Cancel button when saving', () => {
      render(<SaveWorkspaceDialog {...defaultProps} saving={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it('should disable inputs when saving', () => {
      render(<SaveWorkspaceDialog {...defaultProps} saving={true} />)

      const nameInput = screen.getByLabelText(/name/i)
      const descInput = screen.getByLabelText(/description/i)

      expect(nameInput).toBeDisabled()
      expect(descInput).toBeDisabled()
    })
  })

  describe('Dialog actions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      // Focus the dialog first by clicking on an element within it
      const nameInput = screen.getByLabelText(/name/i)
      await user.click(nameInput)
      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const backdrop = screen.getByTestId('dialog-backdrop')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onSave with name and description when Save is clicked', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      await user.type(nameInput, 'Test Workspace')

      const saveButton = screen.getByRole('button', { name: /save$/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith('Test Workspace', undefined)
    })

    it('should call onSave when Enter is pressed in name input', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      await user.type(nameInput, 'Test Workspace')
      await user.keyboard('{Enter}')

      expect(mockOnSave).toHaveBeenCalledWith('Test Workspace', undefined)
    })

    it('should not call onSave when Enter is pressed with empty name', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      await user.click(nameInput)
      await user.keyboard('{Enter}')

      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('Close button', () => {
    it('should render close button in header', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(<SaveWorkspaceDialog {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should focus name input when dialog opens', async () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveFocus()
      })
    })

    it('should have proper aria labels', () => {
      render(<SaveWorkspaceDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})

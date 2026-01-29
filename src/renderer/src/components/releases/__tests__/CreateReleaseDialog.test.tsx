import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateReleaseDialog } from '../CreateReleaseDialog'

// Mock the tiki store
const mockIssues = [
  {
    number: 1,
    title: 'Add login feature',
    state: 'open',
    labels: [{ name: 'enhancement', color: 'blue' }],
    url: 'https://github.com/test/repo/issues/1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    number: 2,
    title: 'Fix navigation bug',
    state: 'open',
    labels: [{ name: 'bug', color: 'red' }],
    url: 'https://github.com/test/repo/issues/2',
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02'
  },
  {
    number: 3,
    title: 'Update documentation',
    state: 'open',
    labels: [],
    url: 'https://github.com/test/repo/issues/3',
    createdAt: '2024-01-03',
    updatedAt: '2024-01-03'
  }
]

vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      issues: mockIssues
    }
    return selector(state)
  })
}))

describe('CreateReleaseDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.getByText('Create Release')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(
        <CreateReleaseDialog
          isOpen={false}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.queryByText('Create Release')).not.toBeInTheDocument()
    })
  })

  describe('Version input', () => {
    it('should render version input field', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.getByPlaceholderText(/v1\.0\.0/i)).toBeInTheDocument()
    })

    it('should update version state when typing', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const input = screen.getByPlaceholderText(/v1\.0\.0/i)
      await user.type(input, 'v1.0.0')

      expect(input).toHaveValue('v1.0.0')
    })

    it('should accept valid semver versions', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const input = screen.getByPlaceholderText(/v1\.0\.0/i)

      // Test various valid versions
      await user.clear(input)
      await user.type(input, 'v1.0')
      expect(input).toHaveValue('v1.0')

      await user.clear(input)
      await user.type(input, 'v1.0.0')
      expect(input).toHaveValue('v1.0.0')

      await user.clear(input)
      await user.type(input, '2.1.0')
      expect(input).toHaveValue('2.1.0')

      await user.clear(input)
      await user.type(input, 'v1.0.0-beta.1')
      expect(input).toHaveValue('v1.0.0-beta.1')
    })

    it('should show validation error for invalid version', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const input = screen.getByPlaceholderText(/v1\.0\.0/i)
      await user.type(input, 'invalid-version')

      // The create button should be disabled for invalid version
      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeDisabled()
    })
  })

  describe('Issue selection', () => {
    it('should display list of open issues', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.getByText('Add login feature')).toBeInTheDocument()
      expect(screen.getByText('Fix navigation bug')).toBeInTheDocument()
      expect(screen.getByText('Update documentation')).toBeInTheDocument()
    })

    it('should display issue numbers', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText('#3')).toBeInTheDocument()
    })

    it('should toggle issue selection when clicking checkbox', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const firstCheckbox = checkboxes[0]

      expect(firstCheckbox).not.toBeChecked()

      await user.click(firstCheckbox)
      expect(firstCheckbox).toBeChecked()

      await user.click(firstCheckbox)
      expect(firstCheckbox).not.toBeChecked()
    })

    it('should allow selecting multiple issues', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')

      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
      expect(checkboxes[2]).not.toBeChecked()
    })
  })

  describe('Selection mode toggle', () => {
    it('should render selection mode toggle', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      expect(screen.getByText('Select Manually')).toBeInTheDocument()
      expect(screen.getByText('LLM Recommend')).toBeInTheDocument()
    })

    it('should default to manual selection mode', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      // The manual selection button should be active/selected
      const manualButton = screen.getByText('Select Manually')
      expect(manualButton).toHaveClass('bg-amber-600')
    })

    it('should switch to LLM mode and show placeholder', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const llmButton = screen.getByText('LLM Recommend')
      await user.click(llmButton)

      // Should show LLM mode content (either prompt to get recommendations or button)
      expect(screen.getByText(/Get AI Recommendations/i)).toBeInTheDocument()
    })
  })

  describe('Dialog actions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const backdrop = screen.getByTestId('dialog-backdrop')
      await user.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should have Create button disabled when version is empty', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeDisabled()
    })

    it('should have Create button enabled when version is valid and issue is selected', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const input = screen.getByPlaceholderText(/v1\.0\.0/i)
      await user.type(input, 'v1.0.0')

      // Create button should still be disabled without selecting an issue
      const createButton = screen.getByRole('button', { name: /create/i })
      expect(createButton).toBeDisabled()

      // Select an issue
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Now button should be enabled
      expect(createButton).not.toBeDisabled()
    })
  })

  describe('Close button', () => {
    it('should render close button in header', () => {
      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <CreateReleaseDialog
          isOpen={true}
          onClose={mockOnClose}
          onCreated={mockOnCreated}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })
})

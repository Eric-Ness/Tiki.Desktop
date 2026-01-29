import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LearningModeToggle } from '../LearningModeToggle'
import { LearningProvider } from '../../../contexts/LearningContext'

// Wrap component with LearningProvider for tests
function renderWithProvider(ui: React.ReactElement) {
  return render(<LearningProvider>{ui}</LearningProvider>)
}

describe('LearningModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock values
    vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
      learningModeEnabled: true,
      expertModeEnabled: false,
      conceptsSeen: [],
      totalExecutions: 0
    })
  })

  describe('Full display mode', () => {
    it('should render learning mode label', async () => {
      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByText(/learning mode/i)).toBeInTheDocument()
      })
    })

    it('should show ON when learning mode is enabled', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
      })
    })

    it('should show OFF when learning mode is disabled', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
      })
    })

    it('should toggle learning mode when clicked', async () => {
      const user = userEvent.setup()

      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      expect(window.tikiDesktop.learning.setLearningMode).toHaveBeenCalledWith(false)
    })

    it('should have amber-500 background when learning mode is on', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const toggle = screen.getByRole('switch')
        expect(toggle).toHaveClass('bg-amber-500')
      })
    })

    it('should have slate-600 background when learning mode is off', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const toggle = screen.getByRole('switch')
        expect(toggle).toHaveClass('bg-slate-600')
      })
    })
  })

  describe('Expert mode checkbox', () => {
    it('should show expert mode checkbox when learning mode is enabled', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /expert mode/i })).toBeInTheDocument()
      })
    })

    it('should not show expert mode checkbox when learning mode is disabled', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      expect(screen.queryByRole('checkbox', { name: /expert mode/i })).not.toBeInTheDocument()
    })

    it('should check expert mode checkbox when expert mode is enabled', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: true,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /expert mode/i })
        expect(checkbox).toBeChecked()
      })
    })

    it('should toggle expert mode when checkbox is clicked', async () => {
      const user = userEvent.setup()

      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /expert mode/i })).toBeInTheDocument()
      })

      const checkbox = screen.getByRole('checkbox', { name: /expert mode/i })
      await user.click(checkbox)

      expect(window.tikiDesktop.learning.setExpertMode).toHaveBeenCalledWith(true)
    })

    it('should show expert mode description', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByText(/hide all tips/i)).toBeInTheDocument()
      })
    })
  })

  describe('Compact mode', () => {
    it('should render in compact layout when compact prop is true', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle compact />)

      await waitFor(() => {
        expect(screen.getByTestId('learning-toggle-compact')).toBeInTheDocument()
      })
    })

    it('should show Learning text in compact mode', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle compact />)

      await waitFor(() => {
        expect(screen.getByText('Learning')).toBeInTheDocument()
      })
    })

    it('should show Expert checkbox in compact mode when learning is on', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle compact />)

      await waitFor(() => {
        expect(screen.getByText('Expert')).toBeInTheDocument()
      })
    })

    it('should not show Expert option in compact mode when learning is off', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle compact />)

      await waitFor(() => {
        expect(screen.getByTestId('learning-toggle-compact')).toBeInTheDocument()
      })

      expect(screen.queryByText('Expert')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show loading indicator while loading progress', async () => {
      // Make the promise hang to test loading state
      vi.mocked(window.tikiDesktop.learning.getProgress).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithProvider(<LearningModeToggle />)

      expect(screen.getByTestId('learning-toggle-loading')).toBeInTheDocument()
    })

    it('should disable toggle while loading', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockImplementation(
        () => new Promise(() => {})
      )

      renderWithProvider(<LearningModeToggle />)

      const toggle = screen.getByRole('switch')
      expect(toggle).toBeDisabled()
    })

    it('should hide loading indicator after progress loads', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.queryByTestId('learning-toggle-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('Toggle functionality', () => {
    it('should enable learning mode when turning on', async () => {
      const user = userEvent.setup()

      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: false,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      expect(window.tikiDesktop.learning.setLearningMode).toHaveBeenCalledWith(true)
    })

    it('should update UI optimistically when toggling', async () => {
      const user = userEvent.setup()

      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const toggle = screen.getByRole('switch')
        expect(toggle).toHaveAttribute('aria-checked', 'true')
      })

      const toggle = screen.getByRole('switch')
      await user.click(toggle)

      await waitFor(() => {
        expect(toggle).toHaveAttribute('aria-checked', 'false')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA role for toggle', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })
    })

    it('should have accessible name for expert mode checkbox', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /expert mode/i })
        expect(checkbox).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()

      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      await user.tab()
      expect(screen.getByRole('switch')).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('checkbox', { name: /expert mode/i })).toHaveFocus()
    })
  })

  describe('Styling', () => {
    it('should have text-sm text-slate-300 for labels', async () => {
      vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
        learningModeEnabled: true,
        expertModeEnabled: false,
        conceptsSeen: [],
        totalExecutions: 0
      })

      renderWithProvider(<LearningModeToggle />)

      await waitFor(() => {
        const label = screen.getByText(/learning mode/i)
        expect(label).toHaveClass('text-sm')
        expect(label).toHaveClass('text-slate-300')
      })
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhaseExplanation } from '../PhaseExplanation'

const mockExplanation = {
  whyThisPhase: 'This phase sets up the foundation for the feature by creating the service layer and establishing the data models that will be used throughout.',
  whatHappens: [
    'Create service file',
    'Add unit tests',
    'Implement interfaces'
  ],
  conceptsInvolved: ['phases', 'testing']
}

describe('PhaseExplanation', () => {
  describe('Basic Rendering', () => {
    it('should render "Learning Mode" badge', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      expect(screen.getByText('Learning Mode')).toBeInTheDocument()
    })

    it('should render "Why this phase?" header', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      expect(screen.getByText(/Why this phase\?/i)).toBeInTheDocument()
    })

    it('should be collapsed by default', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      // The explanation text should not be visible when collapsed
      expect(
        screen.queryByText(/This phase sets up the foundation/)
      ).not.toBeInTheDocument()
    })

    it('should render collapse/expand toggle icon', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      expect(screen.getByTestId('phase-explanation-toggle')).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Functionality', () => {
    it('should expand when header is clicked', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(
        screen.getByText(/This phase sets up the foundation/)
      ).toBeInTheDocument()
    })

    it('should show "What happens:" section when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('What happens:')).toBeInTheDocument()
    })

    it('should show bulleted list of what happens when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('Create service file')).toBeInTheDocument()
      expect(screen.getByText('Add unit tests')).toBeInTheDocument()
      expect(screen.getByText('Implement interfaces')).toBeInTheDocument()
    })

    it('should collapse when header is clicked again', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      // Expand
      await user.click(header)
      expect(
        screen.getByText(/This phase sets up the foundation/)
      ).toBeInTheDocument()

      // Collapse
      await user.click(header)
      expect(
        screen.queryByText(/This phase sets up the foundation/)
      ).not.toBeInTheDocument()
    })

    it('should rotate toggle icon when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const toggleIcon = screen.getByTestId('phase-explanation-toggle')
      expect(toggleIcon).not.toHaveClass('rotate-180')

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(toggleIcon).toHaveClass('rotate-180')
    })
  })

  describe('Concepts Involved', () => {
    it('should show concepts as chips when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('Phases')).toBeInTheDocument()
      expect(screen.getByText('Testing')).toBeInTheDocument()
    })

    it('should display "Concepts:" label when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('Concepts:')).toBeInTheDocument()
    })

    it('should call onConceptClick when concept chip is clicked', async () => {
      const user = userEvent.setup()
      const onConceptClick = vi.fn()
      render(
        <PhaseExplanation
          explanation={mockExplanation}
          onConceptClick={onConceptClick}
        />
      )

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      const phasesChip = screen.getByText('Phases')
      await user.click(phasesChip)

      expect(onConceptClick).toHaveBeenCalledWith('phases')
    })

    it('should capitalize concept names', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('Phases')).toBeInTheDocument()
      expect(screen.queryByText('phases')).not.toBeInTheDocument()
    })

    it('should not show concepts section when conceptsInvolved is empty', async () => {
      const user = userEvent.setup()
      const explanationNoConceptsInvolved = {
        ...mockExplanation,
        conceptsInvolved: []
      }
      render(<PhaseExplanation explanation={explanationNoConceptsInvolved} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.queryByText('Concepts:')).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have cyan container styling', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      const container = screen.getByTestId('phase-explanation')
      expect(container).toHaveClass('bg-cyan-900/20')
      expect(container).toHaveClass('border')
      expect(container).toHaveClass('border-cyan-500/30')
      expect(container).toHaveClass('rounded-lg')
      expect(container).toHaveClass('p-4')
    })

    it('should have correct badge styling', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      const badge = screen.getByText('Learning Mode')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('bg-cyan-600')
      expect(badge).toHaveClass('rounded')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-0.5')
    })

    it('should have bulleted list styling when expanded', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      const list = screen.getByTestId('what-happens-list')
      expect(list).toHaveClass('list-disc')
      expect(list).toHaveClass('ml-4')
      expect(list).toHaveClass('text-sm')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button for header toggle', () => {
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      expect(header).toBeInTheDocument()
    })

    it('should have aria-expanded attribute on header', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      expect(header).toHaveAttribute('aria-expanded', 'false')

      await user.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      const onConceptClick = vi.fn()
      render(
        <PhaseExplanation
          explanation={mockExplanation}
          onConceptClick={onConceptClick}
        />
      )

      // Tab to header
      await user.tab()
      const header = screen.getByRole('button', { name: /why this phase/i })
      expect(header).toHaveFocus()

      // Press Enter to expand
      await user.keyboard('{Enter}')
      expect(
        screen.getByText(/This phase sets up the foundation/)
      ).toBeInTheDocument()

      // Tab to first concept chip
      await user.tab()
      expect(screen.getByText('Phases')).toHaveFocus()

      // Press Enter to click concept
      await user.keyboard('{Enter}')
      expect(onConceptClick).toHaveBeenCalledWith('phases')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty whatHappens array', async () => {
      const user = userEvent.setup()
      const explanationNoWhatHappens = {
        ...mockExplanation,
        whatHappens: []
      }
      render(<PhaseExplanation explanation={explanationNoWhatHappens} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.queryByText('What happens:')).not.toBeInTheDocument()
    })

    it('should handle long explanation text', async () => {
      const user = userEvent.setup()
      const longExplanation = {
        ...mockExplanation,
        whyThisPhase:
          'This is a very long explanation that describes in great detail why this phase is important and what it accomplishes. It goes on for multiple sentences to test how the component handles lengthy text content that might wrap to multiple lines in the UI.'
      }
      render(<PhaseExplanation explanation={longExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(
        screen.getByText(/This is a very long explanation/)
      ).toBeInTheDocument()
    })

    it('should handle concept click without onConceptClick callback', async () => {
      const user = userEvent.setup()
      render(<PhaseExplanation explanation={mockExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      const phasesChip = screen.getByText('Phases')
      // Should not throw
      await user.click(phasesChip)
    })

    it('should handle single item in whatHappens array', async () => {
      const user = userEvent.setup()
      const singleItemExplanation = {
        ...mockExplanation,
        whatHappens: ['Create service file']
      }
      render(<PhaseExplanation explanation={singleItemExplanation} />)

      const header = screen.getByRole('button', { name: /why this phase/i })
      await user.click(header)

      expect(screen.getByText('Create service file')).toBeInTheDocument()
      expect(screen.getByText('What happens:')).toBeInTheDocument()
    })
  })
})

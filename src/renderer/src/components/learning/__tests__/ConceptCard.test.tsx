import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConceptCard } from '../ConceptCard'

const mockConcept = {
  id: 'phases',
  title: 'Phases',
  shortDescription: 'Individual steps in completing an issue',
  fullExplanation:
    'Phases break down complex tasks into manageable steps. Each phase focuses on a specific part of the implementation, such as creating files, writing tests, or verifying functionality.',
  relatedConcepts: ['execution', 'verification']
}

describe('ConceptCard', () => {
  describe('Basic Rendering', () => {
    it('should render concept title', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByText('Phases')).toBeInTheDocument()
    })

    it('should render lightbulb icon', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByTestId('concept-icon-lightbulb')).toBeInTheDocument()
    })

    it('should render short description by default', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(
        screen.getByText('Individual steps in completing an issue')
      ).toBeInTheDocument()
    })

    it('should not show full explanation by default', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(
        screen.queryByText(/Phases break down complex tasks/)
      ).not.toBeInTheDocument()
    })

    it('should render "Got it!" button', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Functionality', () => {
    it('should show "Show more" button by default', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
    })

    it('should expand to show full explanation when "Show more" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const showMoreBtn = screen.getByRole('button', { name: /show more/i })
      await user.click(showMoreBtn)

      expect(
        screen.getByText(/Phases break down complex tasks into manageable steps/)
      ).toBeInTheDocument()
    })

    it('should change button text to "Show less" when expanded', async () => {
      const user = userEvent.setup()
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const showMoreBtn = screen.getByRole('button', { name: /show more/i })
      await user.click(showMoreBtn)

      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
    })

    it('should collapse when "Show less" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      // Expand
      await user.click(screen.getByRole('button', { name: /show more/i }))
      // Collapse
      await user.click(screen.getByRole('button', { name: /show less/i }))

      expect(
        screen.queryByText(/Phases break down complex tasks into manageable steps/)
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when "Got it!" button is clicked', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<ConceptCard concept={mockConcept} onDismiss={onDismiss} />)

      const gotItBtn = screen.getByRole('button', { name: /got it/i })
      await user.click(gotItBtn)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Related Concepts', () => {
    it('should render related concepts as chips', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByText('Execution')).toBeInTheDocument()
      expect(screen.getByText('Verification')).toBeInTheDocument()
    })

    it('should display "Related:" label', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      expect(screen.getByText('Related:')).toBeInTheDocument()
    })

    it('should call onLearnMore when related concept chip is clicked', async () => {
      const user = userEvent.setup()
      const onLearnMore = vi.fn()
      render(
        <ConceptCard
          concept={mockConcept}
          onDismiss={vi.fn()}
          onLearnMore={onLearnMore}
        />
      )

      const executionChip = screen.getByText('Execution')
      await user.click(executionChip)

      expect(onLearnMore).toHaveBeenCalledWith('execution')
    })

    it('should not render related concepts section when relatedConcepts is empty', () => {
      const conceptWithoutRelated = {
        ...mockConcept,
        relatedConcepts: []
      }
      render(<ConceptCard concept={conceptWithoutRelated} onDismiss={vi.fn()} />)

      expect(screen.queryByText('Related:')).not.toBeInTheDocument()
    })

    it('should capitalize related concept names', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      // 'execution' should be displayed as 'Execution'
      expect(screen.getByText('Execution')).toBeInTheDocument()
      expect(screen.queryByText('execution')).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have amber card styling', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const card = screen.getByTestId('concept-card')
      expect(card).toHaveClass('bg-amber-900/20')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('border-amber-500/30')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('p-4')
    })

    it('should have correct title styling', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const title = screen.getByText('Phases')
      expect(title).toHaveClass('text-lg')
      expect(title).toHaveClass('font-semibold')
      expect(title).toHaveClass('text-amber-200')
    })

    it('should have correct description styling', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const description = screen.getByText('Individual steps in completing an issue')
      expect(description).toHaveClass('text-sm')
      expect(description).toHaveClass('text-slate-300')
    })

    it('should have correct button styling', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const button = screen.getByRole('button', { name: /got it/i })
      expect(button).toHaveClass('bg-amber-600')
      expect(button).toHaveClass('text-white')
    })

    it('should have correct chip styling for related concepts', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const chip = screen.getByText('Execution')
      expect(chip).toHaveClass('bg-slate-700')
      expect(chip).toHaveClass('text-xs')
      expect(chip).toHaveClass('px-2')
      expect(chip).toHaveClass('py-1')
      expect(chip).toHaveClass('rounded')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button for "Got it!"', () => {
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const button = screen.getByRole('button', { name: /got it/i })
      expect(button).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<ConceptCard concept={mockConcept} onDismiss={onDismiss} />)

      // Tab to show more button
      await user.tab()
      expect(screen.getByRole('button', { name: /show more/i })).toHaveFocus()

      // Tab to first related concept
      await user.tab()
      expect(screen.getByText('Execution')).toHaveFocus()

      // Tab to second related concept
      await user.tab()
      expect(screen.getByText('Verification')).toHaveFocus()

      // Tab to Got it! button
      await user.tab()
      expect(screen.getByRole('button', { name: /got it/i })).toHaveFocus()

      // Press Enter to dismiss
      await user.keyboard('{Enter}')
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle long concept titles', () => {
      const longTitleConcept = {
        ...mockConcept,
        title: 'This is a very long concept title that might wrap to multiple lines'
      }
      render(<ConceptCard concept={longTitleConcept} onDismiss={vi.fn()} />)

      expect(
        screen.getByText('This is a very long concept title that might wrap to multiple lines')
      ).toBeInTheDocument()
    })

    it('should handle concept with single related concept', () => {
      const singleRelatedConcept = {
        ...mockConcept,
        relatedConcepts: ['testing']
      }
      render(<ConceptCard concept={singleRelatedConcept} onDismiss={vi.fn()} />)

      expect(screen.getByText('Testing')).toBeInTheDocument()
      expect(screen.getByText('Related:')).toBeInTheDocument()
    })

    it('should handle concept with no onLearnMore callback', async () => {
      const user = userEvent.setup()
      render(<ConceptCard concept={mockConcept} onDismiss={vi.fn()} />)

      const chip = screen.getByText('Execution')
      // Should not throw when clicking without onLearnMore
      await user.click(chip)
    })
  })
})

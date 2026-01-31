import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AssumptionTracker } from '../AssumptionTracker'
import type { Assumption } from '../../../stores/tiki-store'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Sample assumptions for testing
const lowConfidenceAssumption: Assumption = {
  id: 'A1',
  confidence: 'low',
  description: 'Assuming the existing API endpoint supports batch operations',
  source: 'Pattern inference from codebase',
  affectsPhases: [2, 4]
}

const mediumConfidenceAssumption: Assumption = {
  id: 'A2',
  confidence: 'medium',
  description: 'Test framework supports async testing patterns',
  source: 'Package.json analysis',
  affectsPhases: [3]
}

const highConfidenceAssumption: Assumption = {
  id: 'A3',
  confidence: 'high',
  description: 'TypeScript compilation is configured correctly',
  source: 'tsconfig.json verified',
  affectsPhases: [1, 2, 3]
}

const assumptionWithoutSource: Assumption = {
  id: 'A4',
  confidence: 'medium',
  description: 'Component follows existing patterns',
  affectsPhases: [1]
}

const assumptionWithoutPhases: Assumption = {
  id: 'A5',
  confidence: 'high',
  description: 'No affected phases specified'
}

describe('AssumptionTracker', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the component with assumptions', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('assumption-tracker')).toBeInTheDocument()
    })

    it('should render assumptions from plan', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption, mediumConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByText(/Assuming the existing API endpoint/)).toBeInTheDocument()
      expect(screen.getByText(/Test framework supports async/)).toBeInTheDocument()
    })

    it('should display empty state when no assumptions', () => {
      render(<AssumptionTracker assumptions={[]} onPhaseClick={vi.fn()} />)
      expect(screen.getByTestId('empty-assumptions')).toBeInTheDocument()
      expect(screen.getByText(/No assumptions recorded/)).toBeInTheDocument()
    })

    it('should display assumption ID badge', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('assumption-id-A1')).toHaveTextContent('A1')
    })

    it('should display assumption description', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(
        screen.getByText('Assuming the existing API endpoint supports batch operations')
      ).toBeInTheDocument()
    })

    it('should display source text when provided', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('assumption-source-A1')).toHaveTextContent(
        'Pattern inference from codebase'
      )
    })

    it('should not display source section when source is not provided', () => {
      render(
        <AssumptionTracker
          assumptions={[assumptionWithoutSource]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('assumption-source-A4')).not.toBeInTheDocument()
    })
  })

  describe('Confidence Colors', () => {
    it('should show red styling for low confidence', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      const badge = screen.getByTestId('confidence-badge-A1')
      expect(badge).toHaveClass('bg-red-500/20')
      expect(badge).toHaveClass('border-red-500/50')
    })

    it('should show yellow styling for medium confidence', () => {
      render(
        <AssumptionTracker
          assumptions={[mediumConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      const badge = screen.getByTestId('confidence-badge-A2')
      expect(badge).toHaveClass('bg-yellow-500/20')
      expect(badge).toHaveClass('border-yellow-500/50')
    })

    it('should show green styling for high confidence', () => {
      render(
        <AssumptionTracker
          assumptions={[highConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      const badge = screen.getByTestId('confidence-badge-A3')
      expect(badge).toHaveClass('bg-green-500/20')
      expect(badge).toHaveClass('border-green-500/50')
    })

    it('should display confidence text in badge', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('confidence-badge-A1')).toHaveTextContent('low')
    })

    it('should show warning icon for low confidence assumptions', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('warning-icon-A1')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort low confidence first', () => {
      render(
        <AssumptionTracker
          assumptions={[
            highConfidenceAssumption,
            mediumConfidenceAssumption,
            lowConfidenceAssumption
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      const cards = screen.getAllByTestId(/^assumption-card-/)
      expect(cards[0]).toHaveAttribute('data-testid', 'assumption-card-A1')
      expect(cards[1]).toHaveAttribute('data-testid', 'assumption-card-A2')
      expect(cards[2]).toHaveAttribute('data-testid', 'assumption-card-A3')
    })

    it('should maintain order within same confidence level', () => {
      const anotherLowConfidence: Assumption = {
        id: 'A6',
        confidence: 'low',
        description: 'Another low confidence assumption',
        affectsPhases: [1]
      }
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption, anotherLowConfidence]}
          onPhaseClick={vi.fn()}
        />
      )
      const cards = screen.getAllByTestId(/^assumption-card-/)
      expect(cards[0]).toHaveAttribute('data-testid', 'assumption-card-A1')
      expect(cards[1]).toHaveAttribute('data-testid', 'assumption-card-A6')
    })
  })

  describe('Summary Bar', () => {
    it('should show correct counts by confidence level', () => {
      render(
        <AssumptionTracker
          assumptions={[
            lowConfidenceAssumption,
            mediumConfidenceAssumption,
            highConfidenceAssumption
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('summary-low-count')).toHaveTextContent('1')
      expect(screen.getByTestId('summary-medium-count')).toHaveTextContent('1')
      expect(screen.getByTestId('summary-high-count')).toHaveTextContent('1')
    })

    it('should show zero counts correctly', () => {
      render(
        <AssumptionTracker
          assumptions={[highConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('summary-low-count')).toHaveTextContent('0')
      expect(screen.getByTestId('summary-medium-count')).toHaveTextContent('0')
      expect(screen.getByTestId('summary-high-count')).toHaveTextContent('1')
    })

    it('should display total assumption count', () => {
      render(
        <AssumptionTracker
          assumptions={[
            lowConfidenceAssumption,
            mediumConfidenceAssumption,
            highConfidenceAssumption
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('summary-total')).toHaveTextContent('3')
    })
  })

  describe('Phase Links', () => {
    it('should display affected phases as clickable links', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('phase-link-A1-2')).toBeInTheDocument()
      expect(screen.getByTestId('phase-link-A1-4')).toBeInTheDocument()
    })

    it('should call onPhaseClick with phase number when phase link clicked', () => {
      const onPhaseClick = vi.fn()
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={onPhaseClick}
        />
      )
      fireEvent.click(screen.getByTestId('phase-link-A1-2'))
      expect(onPhaseClick).toHaveBeenCalledWith(2)
    })

    it('should have cyan styling for phase links', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      const link = screen.getByTestId('phase-link-A1-2')
      expect(link).toHaveClass('text-cyan-400')
    })

    it('should not display phases section when affectsPhases is empty or undefined', () => {
      render(
        <AssumptionTracker
          assumptions={[assumptionWithoutPhases]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('phases-section-A5')).not.toBeInTheDocument()
    })
  })

  describe('Collapse/Expand', () => {
    it('should be expanded by default', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('assumption-list')).toBeInTheDocument()
    })

    it('should collapse when header is clicked', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('collapse-header'))
      expect(screen.queryByTestId('assumption-list')).not.toBeInTheDocument()
    })

    it('should expand when collapsed header is clicked', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('collapse-header'))
      fireEvent.click(screen.getByTestId('collapse-header'))
      expect(screen.getByTestId('assumption-list')).toBeInTheDocument()
    })

    it('should show chevron icon', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
    })

    it('should rotate chevron when expanded', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      const chevron = screen.getByTestId('chevron-icon')
      expect(chevron).toHaveClass('rotate-90')
    })

    it('should not rotate chevron when collapsed', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('collapse-header'))
      const chevron = screen.getByTestId('chevron-icon')
      expect(chevron).not.toHaveClass('rotate-90')
    })
  })

  describe('LocalStorage Persistence', () => {
    it('should persist collapsed state to localStorage', () => {
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('collapse-header'))
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'assumption-tracker-collapsed',
        'true'
      )
    })

    it('should restore collapsed state from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('true')
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('assumption-list')).not.toBeInTheDocument()
    })

    it('should restore expanded state from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('false')
      render(
        <AssumptionTracker
          assumptions={[lowConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('assumption-list')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle single assumption', () => {
      render(
        <AssumptionTracker
          assumptions={[highConfidenceAssumption]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getAllByTestId(/^assumption-card-/)).toHaveLength(1)
    })

    it('should handle many assumptions', () => {
      const manyAssumptions = Array.from({ length: 10 }, (_, i) => ({
        id: `A${i + 1}`,
        confidence: 'medium' as const,
        description: `Assumption ${i + 1}`,
        affectsPhases: [i + 1]
      }))
      render(
        <AssumptionTracker assumptions={manyAssumptions} onPhaseClick={vi.fn()} />
      )
      expect(screen.getAllByTestId(/^assumption-card-/)).toHaveLength(10)
    })

    it('should handle assumption with many affected phases', () => {
      const manyPhases: Assumption = {
        id: 'A7',
        confidence: 'low',
        description: 'Affects many phases',
        affectsPhases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }
      render(
        <AssumptionTracker assumptions={[manyPhases]} onPhaseClick={vi.fn()} />
      )
      expect(screen.getAllByTestId(/^phase-link-A7-/)).toHaveLength(10)
    })
  })
})

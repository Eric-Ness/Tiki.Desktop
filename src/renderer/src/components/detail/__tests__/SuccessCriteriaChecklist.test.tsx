import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuccessCriteriaChecklist, getCriterionStatus } from '../SuccessCriteriaChecklist'
import type { SuccessCriterion } from '../../../stores/tiki-store'

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

// Sample criteria for testing
const functionalCriterion: SuccessCriterion = {
  id: 'SC1',
  category: 'functional',
  description: 'User can log in with valid credentials'
}

const nonFunctionalCriterion: SuccessCriterion = {
  id: 'SC2',
  category: 'non-functional',
  description: 'Page loads within 2 seconds'
}

const testingCriterion: SuccessCriterion = {
  id: 'SC3',
  category: 'testing',
  description: 'Unit tests pass with 80% coverage'
}

const documentationCriterion: SuccessCriterion = {
  id: 'SC4',
  category: 'documentation',
  description: 'API documentation is complete'
}

const anotherFunctionalCriterion: SuccessCriterion = {
  id: 'SC5',
  category: 'functional',
  description: 'User can reset password'
}

// Sample phases
const pendingPhases = [
  { number: 1, status: 'pending' as const },
  { number: 2, status: 'pending' as const },
  { number: 3, status: 'pending' as const }
]

const mixedPhases = [
  { number: 1, status: 'completed' as const },
  { number: 2, status: 'in_progress' as const },
  { number: 3, status: 'pending' as const }
]

const allCompletedPhases = [
  { number: 1, status: 'completed' as const },
  { number: 2, status: 'completed' as const },
  { number: 3, status: 'completed' as const }
]

const failedPhases = [
  { number: 1, status: 'completed' as const },
  { number: 2, status: 'failed' as const },
  { number: 3, status: 'pending' as const }
]

const skippedPhases = [
  { number: 1, status: 'skipped' as const },
  { number: 2, status: 'completed' as const }
]

// Sample coverage matrix
const sampleCoverageMatrix = {
  SC1: { phases: [1, 2] },
  SC2: { phases: [2, 3] },
  SC3: { phases: [3] },
  SC4: { phases: [1] },
  SC5: { phases: [1, 3] }
}

describe('SuccessCriteriaChecklist', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the component', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('success-criteria-checklist')).toBeInTheDocument()
    })

    it('should display Success Criteria header', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByText('Success Criteria')).toBeInTheDocument()
    })

    it('should render all criteria grouped by category', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[
            functionalCriterion,
            nonFunctionalCriterion,
            testingCriterion,
            documentationCriterion
          ]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('category-section-functional')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-non-functional')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-testing')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-documentation')).toBeInTheDocument()
    })

    it('should not render empty categories', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('category-section-functional')).toBeInTheDocument()
      expect(screen.queryByTestId('category-section-non-functional')).not.toBeInTheDocument()
      expect(screen.queryByTestId('category-section-testing')).not.toBeInTheDocument()
      expect(screen.queryByTestId('category-section-documentation')).not.toBeInTheDocument()
    })

    it('should display criterion description', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByText('User can log in with valid credentials')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no criteria', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[]}
          coverageMatrix={{}}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('empty-criteria')).toBeInTheDocument()
      expect(screen.getByText(/No success criteria defined/)).toBeInTheDocument()
    })

    it('should show progress as 0/0 when no criteria', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[]}
          coverageMatrix={{}}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('progress-text')).toHaveTextContent('0/0 completed')
    })
  })

  describe('Progress Bar', () => {
    it('should show correct progress text', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion, nonFunctionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] }, SC2: { phases: [2] } }}
          phases={[
            { number: 1, status: 'completed' },
            { number: 2, status: 'pending' }
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('progress-text')).toHaveTextContent('1/2 completed')
    })

    it('should render progress bar container', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('progress-bar-container')).toBeInTheDocument()
      expect(screen.getByTestId('progress-bar-container')).toHaveClass('bg-zinc-700')
    })

    it('should render progress bar fill', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'completed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const fill = screen.getByTestId('progress-bar-fill')
      expect(fill).toBeInTheDocument()
      expect(fill).toHaveClass('bg-green-500')
      expect(fill).toHaveStyle({ width: '100%' })
    })

    it('should show 50% progress when half completed', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion, nonFunctionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] }, SC2: { phases: [2] } }}
          phases={[
            { number: 1, status: 'completed' },
            { number: 2, status: 'pending' }
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      const fill = screen.getByTestId('progress-bar-fill')
      expect(fill).toHaveStyle({ width: '50%' })
    })
  })

  describe('getCriterionStatus', () => {
    it('should return completed when all phases are completed', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [1, 2] } }, allCompletedPhases)
      expect(status).toBe('completed')
    })

    it('should return completed when all phases are completed or skipped', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [1, 2] } }, skippedPhases)
      expect(status).toBe('completed')
    })

    it('should return in_progress when at least one phase is in_progress and none failed', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [1, 2] } }, mixedPhases)
      expect(status).toBe('in_progress')
    })

    it('should return blocked when any phase is failed', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [1, 2] } }, failedPhases)
      expect(status).toBe('blocked')
    })

    it('should return pending when all phases are pending', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [1, 2] } }, pendingPhases)
      expect(status).toBe('pending')
    })

    it('should return pending when no addressing phases', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [] } }, pendingPhases)
      expect(status).toBe('pending')
    })

    it('should return pending when criterion not in coverage matrix', () => {
      const status = getCriterionStatus('SC_UNKNOWN', {}, pendingPhases)
      expect(status).toBe('pending')
    })

    it('should return pending when phase not found in phases array', () => {
      const status = getCriterionStatus('SC1', { SC1: { phases: [99] } }, pendingPhases)
      expect(status).toBe('pending')
    })
  })

  describe('Status Icons', () => {
    it('should render check icon for completed status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'completed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName.toLowerCase()).toBe('svg')
    })

    it('should render animated indicator for in_progress status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'in_progress' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('animate-pulse')
    })

    it('should render circle icon for pending status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'pending' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName.toLowerCase()).toBe('svg')
    })

    it('should render X icon for blocked status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'failed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName.toLowerCase()).toBe('svg')
    })

    it('should apply green color for completed status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'completed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toHaveClass('text-green-400')
    })

    it('should apply yellow color for in_progress status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'in_progress' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toHaveClass('text-yellow-400')
    })

    it('should apply zinc color for pending status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'pending' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toHaveClass('text-zinc-400')
    })

    it('should apply red color for blocked status', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'failed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const icon = screen.getByTestId('criterion-status-icon-SC1')
      expect(icon).toHaveClass('text-red-400')
    })
  })

  describe('Phase Links', () => {
    it('should display addressing phases as clickable links', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1, 2] } }}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('phase-link-SC1-1')).toBeInTheDocument()
      expect(screen.getByTestId('phase-link-SC1-2')).toBeInTheDocument()
    })

    it('should call onPhaseClick with phase number when clicked', () => {
      const onPhaseClick = vi.fn()
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1, 2] } }}
          phases={pendingPhases}
          onPhaseClick={onPhaseClick}
        />
      )
      fireEvent.click(screen.getByTestId('phase-link-SC1-1'))
      expect(onPhaseClick).toHaveBeenCalledWith(1)
    })

    it('should have cyan styling for phase links', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      const link = screen.getByTestId('phase-link-SC1-1')
      expect(link).toHaveClass('text-cyan-400')
    })

    it('should not display phases section when no addressing phases', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [] } }}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('criterion-phases-SC1')).not.toBeInTheDocument()
    })

    it('should not display phases section when criterion not in coverage matrix', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{}}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('criterion-phases-SC1')).not.toBeInTheDocument()
    })
  })

  describe('Category Collapse/Expand', () => {
    it('should be expanded by default', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('category-content-functional')).toBeInTheDocument()
    })

    it('should collapse when category header is clicked', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('category-header-functional'))
      expect(screen.queryByTestId('category-content-functional')).not.toBeInTheDocument()
    })

    it('should expand when collapsed category header is clicked', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('category-header-functional'))
      fireEvent.click(screen.getByTestId('category-header-functional'))
      expect(screen.getByTestId('category-content-functional')).toBeInTheDocument()
    })

    it('should show chevron icon for category', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('category-chevron-functional')).toBeInTheDocument()
    })

    it('should rotate chevron when expanded', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      const chevron = screen.getByTestId('category-chevron-functional')
      expect(chevron).toHaveClass('rotate-90')
    })

    it('should not rotate chevron when collapsed', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('category-header-functional'))
      const chevron = screen.getByTestId('category-chevron-functional')
      expect(chevron).not.toHaveClass('rotate-90')
    })

    it('should show category completion count', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion, anotherFunctionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] }, SC5: { phases: [2] } }}
          phases={[
            { number: 1, status: 'completed' },
            { number: 2, status: 'pending' }
          ]}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByTestId('category-count-functional')).toHaveTextContent('1/2')
    })
  })

  describe('LocalStorage Persistence', () => {
    it('should persist collapsed state to localStorage', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('category-header-functional'))
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'success-criteria-collapsed',
        JSON.stringify({ functional: true })
      )
    })

    it('should restore collapsed state from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ functional: true }))
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.queryByTestId('category-content-functional')).not.toBeInTheDocument()
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      // Should default to expanded
      expect(screen.getByTestId('category-content-functional')).toBeInTheDocument()
    })

    it('should preserve collapsed state for multiple categories independently', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion, nonFunctionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      fireEvent.click(screen.getByTestId('category-header-functional'))
      expect(screen.queryByTestId('category-content-functional')).not.toBeInTheDocument()
      expect(screen.getByTestId('category-content-non-functional')).toBeInTheDocument()
    })
  })

  describe('Category Ordering', () => {
    it('should display categories in correct order: Functional, Non-Functional, Testing, Documentation', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[
            documentationCriterion,
            testingCriterion,
            nonFunctionalCriterion,
            functionalCriterion
          ]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      const categories = screen.getAllByTestId(/^category-section-/)
      expect(categories[0]).toHaveAttribute('data-testid', 'category-section-functional')
      expect(categories[1]).toHaveAttribute('data-testid', 'category-section-non-functional')
      expect(categories[2]).toHaveAttribute('data-testid', 'category-section-testing')
      expect(categories[3]).toHaveAttribute('data-testid', 'category-section-documentation')
    })

    it('should display category labels correctly', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[
            functionalCriterion,
            nonFunctionalCriterion,
            testingCriterion,
            documentationCriterion
          ]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getByText('Functional')).toBeInTheDocument()
      expect(screen.getByText('Non-Functional')).toBeInTheDocument()
      expect(screen.getByText('Testing')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })
  })

  describe('Completed Criterion Styling', () => {
    it('should apply line-through to completed criterion description', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'completed' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const description = screen.getByTestId('criterion-description-SC1')
      expect(description).toHaveClass('line-through')
    })

    it('should not apply line-through to non-completed criterion', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1] } }}
          phases={[{ number: 1, status: 'pending' }]}
          onPhaseClick={vi.fn()}
        />
      )
      const description = screen.getByTestId('criterion-description-SC1')
      expect(description).not.toHaveClass('line-through')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single criterion', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getAllByTestId(/^criterion-item-/)).toHaveLength(1)
    })

    it('should handle many criteria', () => {
      const manyCriteria = Array.from({ length: 10 }, (_, i) => ({
        id: `SC${i + 1}`,
        category: 'functional' as const,
        description: `Criterion ${i + 1}`
      }))
      render(
        <SuccessCriteriaChecklist
          criteria={manyCriteria}
          coverageMatrix={{}}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getAllByTestId(/^criterion-item-/)).toHaveLength(10)
    })

    it('should handle criterion with many addressing phases', () => {
      const manyPhases = Array.from({ length: 10 }, (_, i) => ({
        number: i + 1,
        status: 'pending' as const
      }))
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion]}
          coverageMatrix={{ SC1: { phases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } }}
          phases={manyPhases}
          onPhaseClick={vi.fn()}
        />
      )
      expect(screen.getAllByTestId(/^phase-link-SC1-/)).toHaveLength(10)
    })

    it('should handle multiple criteria in same category', () => {
      render(
        <SuccessCriteriaChecklist
          criteria={[functionalCriterion, anotherFunctionalCriterion]}
          coverageMatrix={sampleCoverageMatrix}
          phases={pendingPhases}
          onPhaseClick={vi.fn()}
        />
      )
      const content = screen.getByTestId('category-content-functional')
      expect(content.querySelectorAll('[data-testid^="criterion-item-"]')).toHaveLength(2)
    })
  })
})

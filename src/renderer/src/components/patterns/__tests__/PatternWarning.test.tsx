import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PatternWarning } from '../PatternWarning'
import { PreventionSuggestions } from '../PreventionSuggestions'
import type {
  PatternMatchPreload,
  PreventiveMeasurePreload,
  FailurePatternPreload
} from '../../../../../preload/index'

// Mock pattern data
const mockPattern: FailurePatternPreload = {
  id: 'pattern-1',
  name: 'TypeScript Compilation Error',
  description: 'Repeated type errors in component files due to missing type definitions',
  category: 'code',
  errorSignatures: ['TS2339: Property .* does not exist'],
  filePatterns: ['src/components/**/*.tsx'],
  contextIndicators: ['React component', 'TypeScript strict mode'],
  occurrenceCount: 5,
  lastOccurrence: new Date().toISOString(),
  affectedIssues: [42, 45, 48],
  successfulFixes: [],
  preventiveMeasures: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null
}

const mockMeasure1: PreventiveMeasurePreload = {
  id: 'measure-1',
  description: 'Run tsc --noEmit before execution',
  type: 'verification',
  automatic: true,
  effectiveness: 0.78,
  application: 'Pre-phase verification step'
}

const mockMeasure2: PreventiveMeasurePreload = {
  id: 'measure-2',
  description: 'Include type exports in file patterns',
  type: 'context',
  automatic: false,
  effectiveness: 0.65,
  application: 'Phase planning suggestion'
}

const mockMeasure3: PreventiveMeasurePreload = {
  id: 'measure-3',
  description: 'Add npm install to pre-build steps',
  type: 'phase_structure',
  automatic: true,
  effectiveness: 0.95,
  application: 'Add as first phase step'
}

const mockMeasure4: PreventiveMeasurePreload = {
  id: 'measure-4',
  description: 'Review code manually before commit',
  type: 'manual',
  automatic: false,
  effectiveness: 0.5,
  application: 'Manual review required'
}

const highConfidenceMatch: PatternMatchPreload = {
  pattern: mockPattern,
  confidence: 0.85,
  matchedIndicators: ['React component', 'TypeScript strict mode'],
  suggestedMeasures: [mockMeasure1, mockMeasure2]
}

const mediumConfidenceMatch: PatternMatchPreload = {
  pattern: {
    ...mockPattern,
    id: 'pattern-2',
    name: 'Missing Dependencies'
  },
  confidence: 0.6,
  matchedIndicators: ['npm install'],
  suggestedMeasures: [mockMeasure3]
}

const lowConfidenceMatch: PatternMatchPreload = {
  pattern: {
    ...mockPattern,
    id: 'pattern-3',
    name: 'Low Priority Issue'
  },
  confidence: 0.4,
  matchedIndicators: [],
  suggestedMeasures: []
}

describe('PatternWarning', () => {
  describe('Basic Rendering', () => {
    it('should render nothing when matches array is empty', () => {
      const { container } = render(<PatternWarning matches={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('should render warning banner when matches exist', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('pattern-warning')).toBeInTheDocument()
    })

    it('should display warning header', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('warning-header')).toHaveTextContent(
        'Pattern Alert: Similar issues have failed'
      )
    })

    it('should display match count', () => {
      render(<PatternWarning matches={[highConfidenceMatch, mediumConfidenceMatch]} />)
      expect(screen.getByText(/2 patterns matched/)).toBeInTheDocument()
    })

    it('should display singular "pattern" for single match', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByText(/1 pattern matched/)).toBeInTheDocument()
    })
  })

  describe('Pattern Match Items', () => {
    it('should render all pattern matches', () => {
      render(<PatternWarning matches={[highConfidenceMatch, mediumConfidenceMatch]} />)
      expect(screen.getAllByTestId('pattern-match-item')).toHaveLength(2)
    })

    it('should display pattern name', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
    })

    it('should display pattern description', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(
        screen.getByText(/Repeated type errors in component files/)
      ).toBeInTheDocument()
    })
  })

  describe('Confidence Levels', () => {
    it('should display confidence percentage', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('confidence-badge')).toHaveTextContent('85%')
    })

    it('should show "high" level for confidence > 0.7', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('confidence-level')).toHaveTextContent('high')
    })

    it('should show "medium" level for confidence between 0.5 and 0.7', () => {
      render(<PatternWarning matches={[mediumConfidenceMatch]} />)
      expect(screen.getByTestId('confidence-level')).toHaveTextContent('medium')
    })

    it('should show "low" level for confidence < 0.5', () => {
      render(<PatternWarning matches={[lowConfidenceMatch]} />)
      expect(screen.getByTestId('confidence-level')).toHaveTextContent('low')
    })

    it('should have red styling for high confidence', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      const badge = screen.getByTestId('confidence-level')
      expect(badge).toHaveClass('bg-red-500/20')
    })

    it('should have amber styling for medium confidence', () => {
      render(<PatternWarning matches={[mediumConfidenceMatch]} />)
      const badge = screen.getByTestId('confidence-level')
      expect(badge).toHaveClass('bg-amber-500/20')
    })

    it('should have slate styling for low confidence', () => {
      render(<PatternWarning matches={[lowConfidenceMatch]} />)
      const badge = screen.getByTestId('confidence-level')
      expect(badge).toHaveClass('bg-slate-500/20')
    })
  })

  describe('Overall Severity Styling', () => {
    it('should have red border for high severity (any match > 0.7)', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      const warning = screen.getByTestId('pattern-warning')
      expect(warning).toHaveClass('border-red-500/50')
    })

    it('should have amber border for medium/low severity', () => {
      render(<PatternWarning matches={[mediumConfidenceMatch]} />)
      const warning = screen.getByTestId('pattern-warning')
      expect(warning).toHaveClass('border-amber-500/50')
    })
  })

  describe('Matched Indicators', () => {
    it('should display matched indicators', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('matched-indicators')).toBeInTheDocument()
      expect(screen.getByText('React component')).toBeInTheDocument()
      expect(screen.getByText('TypeScript strict mode')).toBeInTheDocument()
    })

    it('should not display indicators section when empty', () => {
      render(<PatternWarning matches={[lowConfidenceMatch]} />)
      expect(screen.queryByTestId('matched-indicators')).not.toBeInTheDocument()
    })
  })

  describe('Suggested Measures Count', () => {
    it('should display count of suggested measures', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.getByTestId('measures-count')).toHaveTextContent(
        '2 preventive measures available'
      )
    })

    it('should use singular form for single measure', () => {
      render(<PatternWarning matches={[mediumConfidenceMatch]} />)
      expect(screen.getByTestId('measures-count')).toHaveTextContent(
        '1 preventive measure available'
      )
    })

    it('should not display measures count when none available', () => {
      render(<PatternWarning matches={[lowConfidenceMatch]} />)
      expect(screen.queryByTestId('measures-count')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render apply all button when onApplyAll provided', () => {
      const onApplyAll = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onApplyAll={onApplyAll} />)
      expect(screen.getByTestId('apply-all-button')).toBeInTheDocument()
    })

    it('should not render apply all button when onApplyAll not provided', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.queryByTestId('apply-all-button')).not.toBeInTheDocument()
    })

    it('should call onApplyAll when apply all button clicked', () => {
      const onApplyAll = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onApplyAll={onApplyAll} />)
      fireEvent.click(screen.getByTestId('apply-all-button'))
      expect(onApplyAll).toHaveBeenCalledTimes(1)
    })

    it('should render dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onDismiss={onDismiss} />)
      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('should not render dismiss button when onDismiss not provided', () => {
      render(<PatternWarning matches={[highConfidenceMatch]} />)
      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByTestId('dismiss-button'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should render dismiss text button in footer', () => {
      const onDismiss = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onDismiss={onDismiss} />)
      expect(screen.getByTestId('dismiss-text-button')).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss text button clicked', () => {
      const onDismiss = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByTestId('dismiss-text-button'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('View Details', () => {
    it('should call onViewDetails when pattern name clicked', () => {
      const onViewDetails = vi.fn()
      render(
        <PatternWarning matches={[highConfidenceMatch]} onViewDetails={onViewDetails} />
      )
      fireEvent.click(screen.getByTestId('pattern-name-button'))
      expect(onViewDetails).toHaveBeenCalledWith(highConfidenceMatch.pattern)
    })
  })

  describe('Apply All Button Styling', () => {
    it('should have red styling for high severity', () => {
      const onApplyAll = vi.fn()
      render(<PatternWarning matches={[highConfidenceMatch]} onApplyAll={onApplyAll} />)
      const button = screen.getByTestId('apply-all-button')
      expect(button).toHaveClass('bg-red-500/20')
    })

    it('should have amber styling for medium severity', () => {
      const onApplyAll = vi.fn()
      render(<PatternWarning matches={[mediumConfidenceMatch]} onApplyAll={onApplyAll} />)
      const button = screen.getByTestId('apply-all-button')
      expect(button).toHaveClass('bg-amber-500/20')
    })
  })
})

describe('PreventionSuggestions', () => {
  describe('Basic Rendering', () => {
    it('should render empty state when no measures', () => {
      render(<PreventionSuggestions measures={[]} />)
      expect(screen.getByTestId('empty-suggestions')).toBeInTheDocument()
      expect(screen.getByText('No preventive measures available')).toBeInTheDocument()
    })

    it('should render all measures', () => {
      render(
        <PreventionSuggestions measures={[mockMeasure1, mockMeasure2, mockMeasure3]} />
      )
      expect(screen.getAllByTestId('measure-item')).toHaveLength(3)
    })

    it('should display measures count in header', () => {
      render(<PreventionSuggestions measures={[mockMeasure1, mockMeasure2]} />)
      expect(screen.getByText(/Preventive Measures \(2\)/)).toBeInTheDocument()
    })
  })

  describe('Measure Item Display', () => {
    it('should display measure description', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByText('Run tsc --noEmit before execution')).toBeInTheDocument()
    })

    it('should display application hint', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('application-hint')).toHaveTextContent(
        'Pre-phase verification step'
      )
    })
  })

  describe('Type Badges', () => {
    it('should display type badge', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('type-badge')).toBeInTheDocument()
    })

    it('should display "Verification" for verification type', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('type-badge')).toHaveTextContent('Verification')
    })

    it('should display "Context" for context type', () => {
      render(<PreventionSuggestions measures={[mockMeasure2]} />)
      expect(screen.getByTestId('type-badge')).toHaveTextContent('Context')
    })

    it('should display "Phase Structure" for phase_structure type', () => {
      render(<PreventionSuggestions measures={[mockMeasure3]} />)
      expect(screen.getByTestId('type-badge')).toHaveTextContent('Phase Structure')
    })

    it('should display "Manual" for manual type', () => {
      render(<PreventionSuggestions measures={[mockMeasure4]} />)
      expect(screen.getByTestId('type-badge')).toHaveTextContent('Manual')
    })

    it('should have cyan styling for context type', () => {
      render(<PreventionSuggestions measures={[mockMeasure2]} />)
      expect(screen.getByTestId('type-badge')).toHaveClass('bg-cyan-500/20')
    })

    it('should have amber styling for verification type', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('type-badge')).toHaveClass('bg-amber-500/20')
    })

    it('should have purple styling for phase_structure type', () => {
      render(<PreventionSuggestions measures={[mockMeasure3]} />)
      expect(screen.getByTestId('type-badge')).toHaveClass('bg-purple-500/20')
    })

    it('should have slate styling for manual type', () => {
      render(<PreventionSuggestions measures={[mockMeasure4]} />)
      expect(screen.getByTestId('type-badge')).toHaveClass('bg-slate-500/20')
    })
  })

  describe('Effectiveness Display', () => {
    it('should display effectiveness percentage', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('effectiveness-badge')).toHaveTextContent('78% effective')
    })

    it('should have green color for high effectiveness (>= 0.8)', () => {
      render(<PreventionSuggestions measures={[mockMeasure3]} />)
      expect(screen.getByTestId('effectiveness-badge')).toHaveClass('text-green-400')
    })

    it('should have amber color for medium effectiveness (>= 0.6)', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('effectiveness-badge')).toHaveClass('text-amber-400')
    })

    it('should have slate color for low effectiveness (< 0.6)', () => {
      render(<PreventionSuggestions measures={[mockMeasure4]} />)
      expect(screen.getByTestId('effectiveness-badge')).toHaveClass('text-slate-400')
    })
  })

  describe('Automatic Measures', () => {
    it('should display auto badge for automatic measures', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.getByTestId('auto-badge')).toBeInTheDocument()
      expect(screen.getByTestId('auto-badge')).toHaveTextContent('Auto')
    })

    it('should not display auto badge for non-automatic measures', () => {
      render(<PreventionSuggestions measures={[mockMeasure2]} />)
      expect(screen.queryByTestId('auto-badge')).not.toBeInTheDocument()
    })

    it('should display count of automatic measures', () => {
      render(
        <PreventionSuggestions measures={[mockMeasure1, mockMeasure2, mockMeasure3]} />
      )
      expect(screen.getByTestId('automatic-count')).toHaveTextContent(
        '2 can be auto-applied'
      )
    })

    it('should not display automatic count when none are automatic', () => {
      render(<PreventionSuggestions measures={[mockMeasure2, mockMeasure4]} />)
      expect(screen.queryByTestId('automatic-count')).not.toBeInTheDocument()
    })
  })

  describe('Apply Button', () => {
    it('should show apply button for automatic measures when onApply provided', () => {
      const onApply = vi.fn()
      render(<PreventionSuggestions measures={[mockMeasure1]} onApply={onApply} />)
      expect(screen.getByTestId('apply-button')).toBeInTheDocument()
    })

    it('should not show apply button for non-automatic measures', () => {
      const onApply = vi.fn()
      render(<PreventionSuggestions measures={[mockMeasure2]} onApply={onApply} />)
      expect(screen.queryByTestId('apply-button')).not.toBeInTheDocument()
    })

    it('should not show apply button when onApply not provided', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.queryByTestId('apply-button')).not.toBeInTheDocument()
    })

    it('should call onApply with measure when apply button clicked', () => {
      const onApply = vi.fn()
      render(<PreventionSuggestions measures={[mockMeasure1]} onApply={onApply} />)
      fireEvent.click(screen.getByTestId('apply-button'))
      expect(onApply).toHaveBeenCalledWith(mockMeasure1)
    })
  })

  describe('Dismiss Button', () => {
    it('should show dismiss button when onDismiss provided', () => {
      const onDismiss = vi.fn()
      render(<PreventionSuggestions measures={[mockMeasure1]} onDismiss={onDismiss} />)
      expect(screen.getByTestId('dismiss-measure-button')).toBeInTheDocument()
    })

    it('should not show dismiss button when onDismiss not provided', () => {
      render(<PreventionSuggestions measures={[mockMeasure1]} />)
      expect(screen.queryByTestId('dismiss-measure-button')).not.toBeInTheDocument()
    })

    it('should call onDismiss with measure when dismiss button clicked', () => {
      const onDismiss = vi.fn()
      render(<PreventionSuggestions measures={[mockMeasure1]} onDismiss={onDismiss} />)
      fireEvent.click(screen.getByTestId('dismiss-measure-button'))
      expect(onDismiss).toHaveBeenCalledWith(mockMeasure1)
    })
  })

  describe('Sorting', () => {
    it('should sort automatic measures first', () => {
      const onApply = vi.fn()
      render(
        <PreventionSuggestions
          measures={[mockMeasure2, mockMeasure1, mockMeasure4]}
          onApply={onApply}
        />
      )
      const items = screen.getAllByTestId('measure-item')
      // First item should be mockMeasure1 (automatic)
      expect(items[0]).toHaveTextContent('Run tsc --noEmit before execution')
    })

    it('should sort by effectiveness within automatic/non-automatic groups', () => {
      const onApply = vi.fn()
      render(
        <PreventionSuggestions
          measures={[mockMeasure1, mockMeasure3]}
          onApply={onApply}
        />
      )
      const items = screen.getAllByTestId('measure-item')
      // mockMeasure3 has higher effectiveness (0.95 vs 0.78)
      expect(items[0]).toHaveTextContent('Add npm install to pre-build steps')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InsightsPanel } from '../InsightsPanel'

describe('InsightsPanel', () => {
  const mockInsights = [
    {
      id: '1',
      type: 'positive' as const,
      category: 'Velocity',
      title: 'Great progress this week',
      description: 'You completed 15% more tasks than last week',
      priority: 1
    },
    {
      id: '2',
      type: 'improvement' as const,
      category: 'Focus',
      title: 'Consider time boxing',
      description: 'Breaking work into smaller chunks could improve flow',
      priority: 2
    },
    {
      id: '3',
      type: 'warning' as const,
      category: 'Burnout Risk',
      title: 'Working long hours',
      description: 'You have been working over 10 hours for 3 consecutive days',
      priority: 1
    },
    {
      id: '4',
      type: 'positive' as const,
      category: 'Quality',
      title: 'Low bug rate',
      description: 'Your code has fewer bugs than average',
      priority: 2
    }
  ]

  describe('Basic Rendering', () => {
    it('should render insights panel container', () => {
      render(<InsightsPanel insights={mockInsights} />)
      expect(screen.getByTestId('insights-panel')).toBeInTheDocument()
    })

    it('should render all insight titles', () => {
      render(<InsightsPanel insights={mockInsights} />)
      expect(screen.getByText('Great progress this week')).toBeInTheDocument()
      expect(screen.getByText('Consider time boxing')).toBeInTheDocument()
      expect(screen.getByText('Working long hours')).toBeInTheDocument()
      expect(screen.getByText('Low bug rate')).toBeInTheDocument()
    })

    it('should render insight descriptions', () => {
      render(<InsightsPanel insights={mockInsights} />)
      expect(screen.getByText('You completed 15% more tasks than last week')).toBeInTheDocument()
      expect(screen.getByText('Breaking work into smaller chunks could improve flow')).toBeInTheDocument()
    })
  })

  describe('Grouping by Type', () => {
    it('should group insights by type', () => {
      render(<InsightsPanel insights={mockInsights} />)

      // Should have section headers for each type present
      expect(screen.getByTestId('insights-group-positive')).toBeInTheDocument()
      expect(screen.getByTestId('insights-group-improvement')).toBeInTheDocument()
      expect(screen.getByTestId('insights-group-warning')).toBeInTheDocument()
    })

    it('should show positive insights in positive group', () => {
      render(<InsightsPanel insights={mockInsights} />)

      const positiveGroup = screen.getByTestId('insights-group-positive')
      expect(positiveGroup).toHaveTextContent('Great progress this week')
      expect(positiveGroup).toHaveTextContent('Low bug rate')
    })

    it('should show improvement insights in improvement group', () => {
      render(<InsightsPanel insights={mockInsights} />)

      const improvementGroup = screen.getByTestId('insights-group-improvement')
      expect(improvementGroup).toHaveTextContent('Consider time boxing')
    })

    it('should show warning insights in warning group', () => {
      render(<InsightsPanel insights={mockInsights} />)

      const warningGroup = screen.getByTestId('insights-group-warning')
      expect(warningGroup).toHaveTextContent('Working long hours')
    })

    it('should not show empty groups', () => {
      const onlyPositive = [mockInsights[0]]
      render(<InsightsPanel insights={onlyPositive} />)

      expect(screen.getByTestId('insights-group-positive')).toBeInTheDocument()
      expect(screen.queryByTestId('insights-group-improvement')).not.toBeInTheDocument()
      expect(screen.queryByTestId('insights-group-warning')).not.toBeInTheDocument()
    })
  })

  describe('Type Icons', () => {
    it('should show checkmark icon for positive insights', () => {
      const positiveOnly = [mockInsights[0]]
      render(<InsightsPanel insights={positiveOnly} />)

      expect(screen.getByTestId('insight-icon-positive-1')).toBeInTheDocument()
    })

    it('should show lightbulb icon for improvement insights', () => {
      const improvementOnly = [mockInsights[1]]
      render(<InsightsPanel insights={improvementOnly} />)

      expect(screen.getByTestId('insight-icon-improvement-2')).toBeInTheDocument()
    })

    it('should show warning icon for warning insights', () => {
      const warningOnly = [mockInsights[2]]
      render(<InsightsPanel insights={warningOnly} />)

      expect(screen.getByTestId('insight-icon-warning-3')).toBeInTheDocument()
    })
  })

  describe('Type Colors', () => {
    it('should apply green color to positive insight icons', () => {
      const positiveOnly = [mockInsights[0]]
      render(<InsightsPanel insights={positiveOnly} />)

      const icon = screen.getByTestId('insight-icon-positive-1')
      expect(icon).toHaveClass('text-green-400')
    })

    it('should apply amber color to improvement insight icons', () => {
      const improvementOnly = [mockInsights[1]]
      render(<InsightsPanel insights={improvementOnly} />)

      const icon = screen.getByTestId('insight-icon-improvement-2')
      expect(icon).toHaveClass('text-amber-400')
    })

    it('should apply red color to warning insight icons', () => {
      const warningOnly = [mockInsights[2]]
      render(<InsightsPanel insights={warningOnly} />)

      const icon = screen.getByTestId('insight-icon-warning-3')
      expect(icon).toHaveClass('text-red-400')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<InsightsPanel insights={[]} loading={true} />)
      expect(screen.getByTestId('insights-panel-loading')).toBeInTheDocument()
    })

    it('should not show insights when loading', () => {
      render(<InsightsPanel insights={mockInsights} loading={true} />)
      expect(screen.queryByText('Great progress this week')).not.toBeInTheDocument()
    })

    it('should show loading skeleton placeholders', () => {
      render(<InsightsPanel insights={[]} loading={true} />)
      const skeletons = screen.getAllByTestId('insights-skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when insights array is empty', () => {
      render(<InsightsPanel insights={[]} />)
      expect(screen.getByTestId('insights-panel-empty')).toBeInTheDocument()
    })

    it('should show helpful message in empty state', () => {
      render(<InsightsPanel insights={[]} />)
      expect(screen.getByText('No insights available')).toBeInTheDocument()
    })

    it('should not show empty state when there are insights', () => {
      render(<InsightsPanel insights={mockInsights} />)
      expect(screen.queryByTestId('insights-panel-empty')).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct section header styling', () => {
      render(<InsightsPanel insights={mockInsights} />)

      const positiveHeader = screen.getByTestId('insights-header-positive')
      expect(positiveHeader).toHaveClass('text-sm')
      expect(positiveHeader).toHaveClass('font-semibold')
      expect(positiveHeader).toHaveClass('text-slate-300')
    })

    it('should have correct insight card styling', () => {
      render(<InsightsPanel insights={mockInsights} />)

      const insightCard = screen.getByTestId('insight-card-1')
      expect(insightCard).toHaveClass('bg-slate-800/50')
      expect(insightCard).toHaveClass('rounded-lg')
      expect(insightCard).toHaveClass('p-3')
      expect(insightCard).toHaveClass('mb-2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single insight', () => {
      const singleInsight = [mockInsights[0]]
      render(<InsightsPanel insights={singleInsight} />)

      expect(screen.getByText('Great progress this week')).toBeInTheDocument()
    })

    it('should handle insights with same type', () => {
      const sameTypeInsights = [mockInsights[0], mockInsights[3]]
      render(<InsightsPanel insights={sameTypeInsights} />)

      expect(screen.getByText('Great progress this week')).toBeInTheDocument()
      expect(screen.getByText('Low bug rate')).toBeInTheDocument()
    })

    it('should handle long title and description', () => {
      const longInsight = [{
        id: '99',
        type: 'positive' as const,
        category: 'Test',
        title: 'This is a very long title that spans multiple lines and contains detailed information about the insight',
        description: 'This is an even longer description that provides comprehensive details about the insight including context, reasoning, and actionable suggestions for the user to consider.',
        priority: 1
      }]
      render(<InsightsPanel insights={longInsight} />)

      expect(screen.getByText(longInsight[0].title)).toBeInTheDocument()
      expect(screen.getByText(longInsight[0].description)).toBeInTheDocument()
    })
  })
})

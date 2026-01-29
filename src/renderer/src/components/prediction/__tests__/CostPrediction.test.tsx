import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CostPrediction } from '../CostPrediction'
import { CostBreakdown } from '../CostBreakdown'

const mockPrediction = {
  estimatedTokens: { low: 50000, expected: 100000, high: 150000 },
  estimatedCost: { low: 1.0, expected: 2.0, high: 3.0 },
  confidence: 'medium' as const,
  factors: [
    {
      name: 'Multiple files',
      impact: 'increases' as const,
      weight: 0.3,
      reason: 'Changes span 5+ files'
    },
    {
      name: 'Has tests',
      impact: 'decreases' as const,
      weight: 0.2,
      reason: 'Test coverage provides verification'
    },
    {
      name: 'Bug fix',
      impact: 'neutral' as const,
      weight: 0.1,
      reason: 'Standard complexity'
    }
  ],
  comparisons: { vsAverage: 1.5, vsSimilar: 0.8, vsRecent: 1.2 },
  breakdown: { planning: 20000, execution: 60000, verification: 15000, fixes: 5000 },
  similarIssues: [
    { number: 42, title: 'Similar bug fix', actualCost: 1.8, similarity: 0.85 },
    { number: 38, title: 'Another related issue', actualCost: 2.2, similarity: 0.72 }
  ]
}

const mockIssue = {
  number: 123,
  title: 'Test issue',
  body: 'Issue body content',
  labels: [{ name: 'bug' }]
}

describe('CostPrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('should show loading spinner while fetching prediction', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise: (value: typeof mockPrediction) => void
      const pendingPromise = new Promise<typeof mockPrediction>((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockReturnValue(pendingPromise)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      expect(screen.getByTestId('prediction-loading')).toBeInTheDocument()
      expect(screen.getByText('Estimating cost...')).toBeInTheDocument()

      // Resolve and wait for state update to complete
      resolvePromise!(mockPrediction)
      await waitFor(() => {
        expect(screen.queryByTestId('prediction-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error state', () => {
    it('should show error message when prediction fails', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockRejectedValue(
        new Error('Network error')
      )

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('prediction-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show generic error for non-Error rejections', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockRejectedValue('Unknown error')

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('prediction-error')).toBeInTheDocument()
        expect(screen.getByText('Failed to get prediction')).toBeInTheDocument()
      })
    })
  })

  describe('Cost range display', () => {
    it('should display cost range with expected value highlighted', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const costRange = screen.getByTestId('cost-range')
        expect(costRange).toHaveTextContent('$1.00 - $3.00')
        expect(costRange).toHaveTextContent('(expected: ~$2.00)')
      })
    })

    it('should display token count', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByText('100,000 tokens expected')).toBeInTheDocument()
      })
    })
  })

  describe('Confidence indicator', () => {
    it('should show high confidence badge with green styling', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        confidence: 'high'
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const badge = screen.getByTestId('confidence-badge')
        expect(badge).toHaveTextContent('high confidence')
        expect(badge).toHaveClass('text-green-400')
      })
    })

    it('should show medium confidence badge with amber styling', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        confidence: 'medium'
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const badge = screen.getByTestId('confidence-badge')
        expect(badge).toHaveTextContent('medium confidence')
        expect(badge).toHaveClass('text-amber-400')
      })
    })

    it('should show low confidence badge with red styling', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        confidence: 'low'
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const badge = screen.getByTestId('confidence-badge')
        expect(badge).toHaveTextContent('low confidence')
        expect(badge).toHaveClass('text-red-400')
      })
    })
  })

  describe('Contributing factors', () => {
    it('should display all prediction factors', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const factors = screen.getAllByTestId('prediction-factor')
        expect(factors).toHaveLength(3)
      })
    })

    it('should show + icon for factors that increase cost', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByText('Multiple files')).toBeInTheDocument()
        // Check for reason text (note: it's prefixed with "- ")
        expect(screen.getByText(/Changes span 5\+ files/)).toBeInTheDocument()
      })
    })

    it('should show - icon for factors that decrease cost', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByText('Has tests')).toBeInTheDocument()
        expect(screen.getByText(/Test coverage provides verification/)).toBeInTheDocument()
      })
    })

    it('should show = icon for neutral factors', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByText('Bug fix')).toBeInTheDocument()
        expect(screen.getByText(/Standard complexity/)).toBeInTheDocument()
      })
    })

    it('should not show factors section when empty', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        factors: []
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('cost-prediction')).toBeInTheDocument()
      })

      expect(screen.queryByText('Contributing Factors')).not.toBeInTheDocument()
    })
  })

  describe('Comparisons', () => {
    it('should display comparison to average', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-average')).toHaveTextContent('1.5x average')
      })
    })

    it('should display comparison to similar issues when available', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-similar')).toHaveTextContent('0.8x similar issues')
      })
    })

    it('should display comparison to recent when available', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-recent')).toHaveTextContent('1.2x recent average')
      })
    })

    it('should not display similar comparison when null', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        comparisons: { vsAverage: 1.0, vsSimilar: null, vsRecent: null }
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-average')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('comparison-similar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('comparison-recent')).not.toBeInTheDocument()
    })

    it('should show "Same as average" when ratio is 1', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        comparisons: { vsAverage: 1.0, vsSimilar: null, vsRecent: null }
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-average')).toHaveTextContent('Same as average')
      })
    })

    it('should show percentage below average when ratio < 1', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        comparisons: { vsAverage: 0.7, vsSimilar: null, vsRecent: null }
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('comparison-average')).toHaveTextContent('30% below average')
      })
    })
  })

  describe('Similar issues', () => {
    it('should display similar issues with cost and similarity', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const similarIssues = screen.getAllByTestId('similar-issue')
        expect(similarIssues).toHaveLength(2)
      })

      expect(screen.getByText('#42')).toBeInTheDocument()
      expect(screen.getByText('Similar bug fix')).toBeInTheDocument()
      expect(screen.getByText('$1.80')).toBeInTheDocument()
      expect(screen.getByText('85% match')).toBeInTheDocument()
    })

    it('should limit similar issues to 3', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        similarIssues: [
          { number: 1, title: 'Issue 1', actualCost: 1.0, similarity: 0.9 },
          { number: 2, title: 'Issue 2', actualCost: 1.5, similarity: 0.8 },
          { number: 3, title: 'Issue 3', actualCost: 2.0, similarity: 0.7 },
          { number: 4, title: 'Issue 4', actualCost: 2.5, similarity: 0.6 }
        ]
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        const similarIssues = screen.getAllByTestId('similar-issue')
        expect(similarIssues).toHaveLength(3)
      })

      expect(screen.queryByText('#4')).not.toBeInTheDocument()
    })

    it('should not show similar issues section when empty', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue({
        ...mockPrediction,
        similarIssues: []
      })

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(screen.getByTestId('cost-prediction')).toBeInTheDocument()
      })

      expect(screen.queryByText('Similar Issues')).not.toBeInTheDocument()
    })
  })

  describe('API calls', () => {
    it('should call estimateIssue when no plan provided', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)

      render(<CostPrediction cwd="/test/path" issue={mockIssue} />)

      await waitFor(() => {
        expect(window.tikiDesktop.prediction.estimateIssue).toHaveBeenCalledWith(
          '/test/path',
          mockIssue
        )
      })
    })

    it('should call estimatePlan when plan is provided', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimatePlan).mockResolvedValue(mockPrediction)

      const plan = { phases: [{ files: ['file.ts'], verification: ['test'] }] }

      render(<CostPrediction cwd="/test/path" issue={mockIssue} plan={plan} />)

      await waitFor(() => {
        expect(window.tikiDesktop.prediction.estimatePlan).toHaveBeenCalledWith(
          '/test/path',
          plan,
          mockIssue
        )
      })
    })
  })

  describe('onPredictionLoaded callback', () => {
    it('should call onPredictionLoaded with cached prediction data when loaded', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockResolvedValue(mockPrediction)
      const onPredictionLoaded = vi.fn()

      render(
        <CostPrediction
          cwd="/test/path"
          issue={mockIssue}
          onPredictionLoaded={onPredictionLoaded}
        />
      )

      await waitFor(() => {
        expect(onPredictionLoaded).toHaveBeenCalledTimes(1)
      })

      const calledWith = onPredictionLoaded.mock.calls[0][0]
      expect(calledWith.estimatedCost).toEqual(mockPrediction.estimatedCost)
      expect(calledWith.confidence).toBe(mockPrediction.confidence)
      expect(calledWith.cachedAt).toBeGreaterThan(0)
    })

    it('should not call onPredictionLoaded when prediction fails', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimateIssue).mockRejectedValue(
        new Error('Network error')
      )
      const onPredictionLoaded = vi.fn()

      render(
        <CostPrediction
          cwd="/test/path"
          issue={mockIssue}
          onPredictionLoaded={onPredictionLoaded}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('prediction-error')).toBeInTheDocument()
      })

      expect(onPredictionLoaded).not.toHaveBeenCalled()
    })

    it('should call onPredictionLoaded with plan-based prediction data', async () => {
      vi.mocked(window.tikiDesktop.prediction.estimatePlan).mockResolvedValue(mockPrediction)
      const onPredictionLoaded = vi.fn()
      const plan = { phases: [{ files: ['file.ts'], verification: ['test'] }] }

      render(
        <CostPrediction
          cwd="/test/path"
          issue={mockIssue}
          plan={plan}
          onPredictionLoaded={onPredictionLoaded}
        />
      )

      await waitFor(() => {
        expect(onPredictionLoaded).toHaveBeenCalledTimes(1)
      })

      const calledWith = onPredictionLoaded.mock.calls[0][0]
      expect(calledWith.estimatedCost).toEqual(mockPrediction.estimatedCost)
      expect(calledWith.confidence).toBe(mockPrediction.confidence)
    })
  })
})

describe('CostBreakdown', () => {
  const defaultBreakdown = {
    planning: 20000,
    execution: 60000,
    verification: 15000,
    fixes: 5000
  }

  it('should render breakdown chart', () => {
    render(<CostBreakdown breakdown={defaultBreakdown} totalTokens={100000} />)

    expect(screen.getByRole('img', { name: /token breakdown chart/i })).toBeInTheDocument()
  })

  it('should display all segments in legend', () => {
    render(<CostBreakdown breakdown={defaultBreakdown} totalTokens={100000} />)

    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeInTheDocument()
    expect(screen.getByText('Fixes')).toBeInTheDocument()
  })

  it('should show correct percentages', () => {
    render(<CostBreakdown breakdown={defaultBreakdown} totalTokens={100000} />)

    expect(screen.getByText(/20K \(20%\)/)).toBeInTheDocument()
    expect(screen.getByText(/60K \(60%\)/)).toBeInTheDocument()
    expect(screen.getByText(/15K \(15%\)/)).toBeInTheDocument()
    expect(screen.getByText(/5K \(5%\)/)).toBeInTheDocument()
  })

  it('should format large token counts with M suffix', () => {
    const largeBreakdown = {
      planning: 2000000,
      execution: 6000000,
      verification: 1500000,
      fixes: 500000
    }

    render(<CostBreakdown breakdown={largeBreakdown} totalTokens={10000000} />)

    expect(screen.getByText(/2.0M \(20%\)/)).toBeInTheDocument()
    expect(screen.getByText(/6.0M \(60%\)/)).toBeInTheDocument()
  })

  it('should handle zero total tokens', () => {
    const zeroBreakdown = {
      planning: 0,
      execution: 0,
      verification: 0,
      fixes: 0
    }

    render(<CostBreakdown breakdown={zeroBreakdown} totalTokens={0} />)

    // All values should be 0 with 0%
    const planningRow = screen.getByText('Planning').closest('div')?.parentElement
    expect(planningRow).toHaveTextContent('0 (0%)')
  })

  it('should format small token counts without suffix', () => {
    const smallBreakdown = {
      planning: 200,
      execution: 600,
      verification: 150,
      fixes: 50
    }

    render(<CostBreakdown breakdown={smallBreakdown} totalTokens={1000} />)

    expect(screen.getByText(/200 \(20%\)/)).toBeInTheDocument()
    expect(screen.getByText(/600 \(60%\)/)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BudgetTracker } from '../BudgetTracker'

describe('BudgetTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('should show loading spinner while fetching budget', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockReturnValue(
        pendingPromise as Promise<{
          settings: { dailyBudget: number | null; weeklyBudget: number | null; warnThreshold: number }
          dailySpend: number
          weeklySpend: number
        }>
      )

      render(<BudgetTracker cwd="/test/path" />)

      expect(screen.getByTestId('budget-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading budget...')).toBeInTheDocument()

      // Resolve and wait for state update
      resolvePromise!({
        settings: { dailyBudget: null, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 0
      })
      await waitFor(() => {
        expect(screen.queryByTestId('budget-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error state', () => {
    it('should show error message when fetching budget fails', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockRejectedValue(
        new Error('Network error')
      )

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show generic error for non-Error rejections', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockRejectedValue('Unknown error')

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-error')).toBeInTheDocument()
        expect(screen.getByText('Failed to fetch budget')).toBeInTheDocument()
      })
    })
  })

  describe('No budget configured', () => {
    it('should show message when no budget is configured', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-not-configured')).toBeInTheDocument()
        expect(screen.getByText(/No budget configured/)).toBeInTheDocument()
        expect(screen.getByTestId('configure-budget-link')).toBeInTheDocument()
      })
    })
  })

  describe('Daily budget display', () => {
    it('should display daily budget usage', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 5.0,
        weeklySpend: 25.0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-tracker')).toBeInTheDocument()
        expect(screen.getByTestId('daily-usage')).toHaveTextContent('$5.00 / $10.00')
        expect(screen.getByTestId('daily-percentage')).toHaveTextContent('50% used')
      })
    })

    it('should show progress bar with correct percentage', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 7.5,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveStyle({ width: '75%' })
      })
    })

    it('should cap progress bar at 100% when over budget', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 15.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveStyle({ width: '100%' })
      })
    })
  })

  describe('Weekly budget display', () => {
    it('should display weekly budget usage', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 5.0,
        weeklySpend: 25.0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-tracker')).toBeInTheDocument()
        expect(screen.getByTestId('weekly-usage')).toHaveTextContent('$25.00 / $50.00')
        expect(screen.getByTestId('weekly-percentage')).toHaveTextContent('50% used')
      })
    })

    it('should show weekly progress bar', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: 100.0, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 30.0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('weekly-progress')
        expect(progressBar).toHaveStyle({ width: '30%' })
      })
    })
  })

  describe('Both budgets display', () => {
    it('should display both daily and weekly budgets', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 3.0,
        weeklySpend: 20.0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('daily-usage')).toHaveTextContent('$3.00 / $10.00')
        expect(screen.getByTestId('weekly-usage')).toHaveTextContent('$20.00 / $50.00')
        expect(screen.getByTestId('daily-percentage')).toHaveTextContent('30% used')
        expect(screen.getByTestId('weekly-percentage')).toHaveTextContent('40% used')
      })
    })
  })

  describe('Estimated cost projection', () => {
    it('should show projected spend after issue when estimatedCost is provided', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 3.0,
        weeklySpend: 20.0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={2.5} />)

      await waitFor(() => {
        expect(screen.getByTestId('daily-projected')).toHaveTextContent('After this issue: $5.50 (55%)')
        expect(screen.getByTestId('weekly-projected')).toHaveTextContent('After this issue: $22.50 (45%)')
      })
    })

    it('should not show projection when estimatedCost is zero', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 3.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={0} />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-tracker')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('daily-projected')).not.toBeInTheDocument()
    })

    it('should not show projection when estimatedCost is undefined', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 3.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-tracker')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('daily-projected')).not.toBeInTheDocument()
    })
  })

  describe('Budget exceed warnings', () => {
    it('should show warning when daily budget would be exceeded', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 8.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={5.0} />)

      await waitFor(() => {
        expect(screen.getByTestId('daily-exceed-warning')).toHaveTextContent('Exceeds budget!')
        expect(screen.getByTestId('budget-warning')).toBeInTheDocument()
        expect(screen.getByTestId('budget-warning')).toHaveTextContent('daily budget')
      })
    })

    it('should show warning when weekly budget would be exceeded', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 45.0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={10.0} />)

      await waitFor(() => {
        expect(screen.getByTestId('weekly-exceed-warning')).toHaveTextContent('Exceeds budget!')
        expect(screen.getByTestId('budget-warning')).toBeInTheDocument()
        expect(screen.getByTestId('budget-warning')).toHaveTextContent('weekly budget')
      })
    })

    it('should show warning when both budgets would be exceeded', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 8.0,
        weeklySpend: 45.0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={10.0} />)

      await waitFor(() => {
        expect(screen.getByTestId('daily-exceed-warning')).toBeInTheDocument()
        expect(screen.getByTestId('weekly-exceed-warning')).toBeInTheDocument()
        expect(screen.getByTestId('budget-warning')).toHaveTextContent('daily and weekly')
      })
    })

    it('should not show warning when within budget', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: 50.0, warnThreshold: 2.0 },
        dailySpend: 3.0,
        weeklySpend: 20.0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={2.0} />)

      await waitFor(() => {
        expect(screen.getByTestId('budget-tracker')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('budget-warning')).not.toBeInTheDocument()
    })
  })

  describe('Progress bar colors', () => {
    it('should use green color when usage is low', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 5.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveClass('bg-green-500')
      })
    })

    it('should use amber color when usage is between 75-90%', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 8.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveClass('bg-amber-500')
      })
    })

    it('should use red color when usage is above 90%', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 9.5,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveClass('bg-red-500')
      })
    })

    it('should use red color when budget would be exceeded', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.0, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 5.0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" estimatedCost={10.0} />)

      await waitFor(() => {
        const progressBar = screen.getByTestId('daily-progress')
        expect(progressBar).toHaveClass('bg-red-500')
      })
    })
  })

  describe('API calls', () => {
    it('should call getBudget with correct cwd', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/custom/path" />)

      await waitFor(() => {
        expect(window.tikiDesktop.prediction.getBudget).toHaveBeenCalledWith('/custom/path')
      })
    })

    it('should refetch budget when cwd changes', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: null, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 0,
        weeklySpend: 0
      })

      const { rerender } = render(<BudgetTracker cwd="/path1" />)

      await waitFor(() => {
        expect(window.tikiDesktop.prediction.getBudget).toHaveBeenCalledWith('/path1')
      })

      rerender(<BudgetTracker cwd="/path2" />)

      await waitFor(() => {
        expect(window.tikiDesktop.prediction.getBudget).toHaveBeenCalledWith('/path2')
      })
    })
  })

  describe('Cost formatting', () => {
    it('should format costs with two decimal places', async () => {
      vi.mocked(window.tikiDesktop.prediction.getBudget).mockResolvedValue({
        settings: { dailyBudget: 10.123, weeklyBudget: null, warnThreshold: 2.0 },
        dailySpend: 5.456,
        weeklySpend: 0
      })

      render(<BudgetTracker cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('daily-usage')).toHaveTextContent('$5.46 / $10.12')
      })
    })
  })
})

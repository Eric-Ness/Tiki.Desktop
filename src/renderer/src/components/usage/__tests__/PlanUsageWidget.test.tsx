import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanUsageWidget } from '../PlanUsageWidget'

const mockUsageSummary = {
  totalInputTokens: 50000,
  totalOutputTokens: 25000,
  estimatedCost: 1.25,
  recordCount: 10
}

const mockWeeklyUsageSummary = {
  totalInputTokens: 200000,
  totalOutputTokens: 100000,
  estimatedCost: 5.0,
  recordCount: 50
}

beforeEach(() => {
  vi.clearAllMocks()

  // Mock window.tikiDesktop.usage
  window.tikiDesktop = {
    ...window.tikiDesktop,
    usage: {
      getSummary: vi.fn().mockImplementation((since: string) => {
        const sinceDate = new Date(since)
        const now = new Date()
        const daysDiff = (now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24)

        if (daysDiff > 1) {
          return Promise.resolve(mockWeeklyUsageSummary)
        }
        return Promise.resolve(mockUsageSummary)
      }),
      addRecord: vi.fn(),
      getRecords: vi.fn(),
      clear: vi.fn(),
      getIssueUsage: vi.fn(),
      getSessionUsage: vi.fn(),
      getDailyUsage: vi.fn()
    }
  } as unknown as typeof window.tikiDesktop
})

describe('PlanUsageWidget', () => {
  describe('Rendering', () => {
    it('should render compact progress bar and percentage', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByText(/15%/)).toBeInTheDocument()
      })
    })

    it('should render expand/collapse button', () => {
      render(<PlanUsageWidget />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Expanded view', () => {
    it('should show detailed usage when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Claude Plan Usage')).toBeInTheDocument()
      })
    })

    it('should show session usage section when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Session')).toBeInTheDocument()
      })
    })

    it('should show weekly usage section when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Weekly')).toBeInTheDocument()
      })
    })

    it('should show cost estimates when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Est. Cost (Session)')).toBeInTheDocument()
        expect(screen.getByText('Est. Cost (Weekly)')).toBeInTheDocument()
      })
    })

    it('should collapse when clicked again', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Claude Plan Usage')).toBeInTheDocument()
      })

      await user.click(button)

      await waitFor(() => {
        expect(screen.queryByText('Claude Plan Usage')).not.toBeInTheDocument()
      })
    })
  })

  describe('Usage calculations', () => {
    it('should display session usage percentage correctly', async () => {
      render(<PlanUsageWidget />)

      // 75000 tokens (50k input + 25k output) out of 500000 = 15%
      await waitFor(() => {
        expect(screen.getByText(/15%/)).toBeInTheDocument()
      })
    })

    it('should show reset time information', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Resets in/)).toBeInTheDocument()
      })
    })

    it('should show weekly reset information', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Resets Monday')).toBeInTheDocument()
      })
    })
  })

  describe('Usage API calls', () => {
    it('should call usage API on mount', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(window.tikiDesktop.usage.getSummary).toHaveBeenCalled()
      })
    })

    it('should call usage API for both session and weekly', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(window.tikiDesktop.usage.getSummary).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Color coding', () => {
    it('should show green color for low usage', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/15%/)
        expect(percentText).toHaveClass('text-emerald-400')
      })
    })

    it('should show amber color for medium usage (70-90%)', async () => {
      window.tikiDesktop.usage.getSummary = vi.fn().mockResolvedValue({
        totalInputTokens: 300000,
        totalOutputTokens: 100000,
        estimatedCost: 10.0,
        recordCount: 100
      })

      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/80%/)
        expect(percentText).toHaveClass('text-amber-400')
      })
    })

    it('should show red color for high usage (>90%)', async () => {
      window.tikiDesktop.usage.getSummary = vi.fn().mockResolvedValue({
        totalInputTokens: 400000,
        totalOutputTokens: 100000,
        estimatedCost: 12.5,
        recordCount: 120
      })

      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/100%/)
        expect(percentText).toHaveClass('text-red-400')
      })
    })
  })
})

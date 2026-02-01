import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanUsageWidget } from '../PlanUsageWidget'

const mockPlanUsage = {
  sessionTokens: 75000,
  sessionLimit: 500000,
  sessionPercent: 15,
  sessionResetTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
  weeklyTokens: 750000,
  weeklyLimit: 3500000,
  weeklyPercent: 21.4,
  weeklyResetTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  totalInputTokens: 1900000,
  totalOutputTokens: 1300000,
  totalCacheReadTokens: 1742000000,
  totalCacheCreationTokens: 100000,
  lastUpdated: '2026-01-31',
  dataSource: 'claude-stats' as const
}

beforeEach(() => {
  vi.clearAllMocks()

  window.tikiDesktop = {
    ...window.tikiDesktop,
    claudeStats: {
      isAvailable: vi.fn().mockResolvedValue(true),
      getPlanUsage: vi.fn().mockResolvedValue(mockPlanUsage),
      getRaw: vi.fn().mockResolvedValue(null),
      getDailyTokens: vi.fn().mockResolvedValue([])
    }
  } as unknown as typeof window.tikiDesktop
})

describe('PlanUsageWidget', () => {
  describe('Rendering', () => {
    it('should render compact progress bar and percentage', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByText(/21%/)).toBeInTheDocument()
      })
    })

    it('should render expand/collapse button', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })
    })

    it('should show "No stats" when Claude stats unavailable', async () => {
      window.tikiDesktop.claudeStats.isAvailable = vi.fn().mockResolvedValue(false)

      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByText('No stats')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      render(<PlanUsageWidget />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Expanded view', () => {
    it('should show detailed usage when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Claude Max Usage')).toBeInTheDocument()
      })
    })

    it('should show weekly usage section when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Weekly')).toBeInTheDocument()
        expect(screen.getByText('Rolling 7-day window')).toBeInTheDocument()
      })
    })

    it('should show all-time totals when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('All-Time Totals')).toBeInTheDocument()
        expect(screen.getByText('Input tokens')).toBeInTheDocument()
        expect(screen.getByText('Output tokens')).toBeInTheDocument()
      })
    })

    it('should show Live indicator when expanded', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument()
      })
    })

    it('should collapse when clicked again', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Claude Max Usage')).toBeInTheDocument()
      })

      await user.click(button)

      await waitFor(() => {
        expect(screen.queryByText('Claude Max Usage')).not.toBeInTheDocument()
      })
    })
  })

  describe('API calls', () => {
    it('should check availability on mount', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(window.tikiDesktop.claudeStats.isAvailable).toHaveBeenCalled()
      })
    })

    it('should fetch plan usage when available', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(window.tikiDesktop.claudeStats.getPlanUsage).toHaveBeenCalled()
      })
    })

    it('should not fetch plan usage when unavailable', async () => {
      window.tikiDesktop.claudeStats.isAvailable = vi.fn().mockResolvedValue(false)

      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(window.tikiDesktop.claudeStats.isAvailable).toHaveBeenCalled()
      })

      expect(window.tikiDesktop.claudeStats.getPlanUsage).not.toHaveBeenCalled()
    })
  })

  describe('Color coding', () => {
    it('should show green color for low usage', async () => {
      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/21%/)
        expect(percentText).toHaveClass('text-emerald-400')
      })
    })

    it('should show amber color for medium usage (70-90%)', async () => {
      window.tikiDesktop.claudeStats.getPlanUsage = vi.fn().mockResolvedValue({
        ...mockPlanUsage,
        weeklyPercent: 80
      })

      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/80%/)
        expect(percentText).toHaveClass('text-amber-400')
      })
    })

    it('should show red color for high usage (>90%)', async () => {
      window.tikiDesktop.claudeStats.getPlanUsage = vi.fn().mockResolvedValue({
        ...mockPlanUsage,
        weeklyPercent: 95
      })

      render(<PlanUsageWidget />)

      await waitFor(() => {
        const percentText = screen.getByText(/95%/)
        expect(percentText).toHaveClass('text-red-400')
      })
    })
  })

  describe('Token formatting', () => {
    it('should format large token counts with K suffix', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        // 750000 should be formatted as 750K
        expect(screen.getByText(/750K/)).toBeInTheDocument()
      })
    })

    it('should format million+ token counts with M suffix', async () => {
      const user = userEvent.setup()
      render(<PlanUsageWidget />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        // totalInputTokens is 1900000, should be 1.9M
        expect(screen.getByText('1.9M')).toBeInTheDocument()
      })
    })
  })
})

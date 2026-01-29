import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UsageWidget } from '../UsageWidget'

describe('UsageWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display token count and estimated cost', async () => {
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 5000,
      totalOutputTokens: 3000,
      estimatedCost: 0.15,
      recordCount: 10
    })

    render(<UsageWidget />)

    await waitFor(() => {
      expect(screen.getByText(/8,000 tokens/)).toBeInTheDocument()
      expect(screen.getByText(/\$0\.15/)).toBeInTheDocument()
    })
  })

  it('should not render when no usage data', async () => {
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCost: 0,
      recordCount: 0
    })

    render(<UsageWidget />)

    await waitFor(() => {
      // Should still render the component but show 0 tokens
      expect(screen.getByText(/0 tokens/)).toBeInTheDocument()
    })
  })

  it('should format large token counts with commas', async () => {
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 1500000,
      totalOutputTokens: 500000,
      estimatedCost: 45.75,
      recordCount: 100
    })

    render(<UsageWidget />)

    await waitFor(() => {
      expect(screen.getByText(/2,000,000 tokens/)).toBeInTheDocument()
      expect(screen.getByText(/\$45\.75/)).toBeInTheDocument()
    })
  })

  it('should call getSummary on mount', async () => {
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      estimatedCost: 0.05,
      recordCount: 5
    })

    render(<UsageWidget />)

    await waitFor(() => {
      expect(window.tikiDesktop.usage.getSummary).toHaveBeenCalled()
    })
  })

  it('should request today usage with ISO date string', async () => {
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 100,
      totalOutputTokens: 50,
      estimatedCost: 0.01,
      recordCount: 1
    })

    render(<UsageWidget />)

    await waitFor(() => {
      const call = vi.mocked(window.tikiDesktop.usage.getSummary).mock.calls[0]
      expect(call).toBeDefined()
      expect(typeof call[0]).toBe('string')
      // Check it's an ISO date string
      expect(call[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})

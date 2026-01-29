import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { UsagePanel } from '../UsagePanel'

describe('UsagePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(window.tikiDesktop.usage.getSummary).mockResolvedValue({
      totalInputTokens: 10000,
      totalOutputTokens: 5000,
      estimatedCost: 1.50,
      recordCount: 25
    })
    vi.mocked(window.tikiDesktop.usage.getDailyUsage).mockResolvedValue([
      {
        date: '2024-01-10',
        totalInputTokens: 5000,
        totalOutputTokens: 2500,
        estimatedCost: 0.75,
        recordCount: 12
      },
      {
        date: '2024-01-11',
        totalInputTokens: 5000,
        totalOutputTokens: 2500,
        estimatedCost: 0.75,
        recordCount: 13
      }
    ])
  })

  it('should display summary statistics', async () => {
    render(<UsagePanel />)

    await waitFor(() => {
      // Total tokens
      expect(screen.getByText('15,000')).toBeInTheDocument()
      // Estimated cost
      expect(screen.getByText('$1.50')).toBeInTheDocument()
      // Record count
      expect(screen.getByText('25')).toBeInTheDocument()
    })
  })

  it('should display daily usage chart', async () => {
    render(<UsagePanel />)

    await waitFor(() => {
      // Should show date labels
      expect(screen.getByText('2024-01-10')).toBeInTheDocument()
      expect(screen.getByText('2024-01-11')).toBeInTheDocument()
    })
  })

  it('should have clear history button', async () => {
    render(<UsagePanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear history/i })).toBeInTheDocument()
    })
  })

  it('should call clear when clear button is clicked', async () => {
    vi.mocked(window.tikiDesktop.usage.clear).mockResolvedValue(undefined)

    render(<UsagePanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear history/i })).toBeInTheDocument()
    })

    const clearButton = screen.getByRole('button', { name: /clear history/i })
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(window.tikiDesktop.usage.clear).toHaveBeenCalled()
    })
  })

  it('should display input and output token breakdown', async () => {
    render(<UsagePanel />)

    await waitFor(() => {
      expect(screen.getByText('10,000')).toBeInTheDocument() // Input tokens
      expect(screen.getByText('5,000')).toBeInTheDocument() // Output tokens
    })
  })

  it('should show time period selector', async () => {
    render(<UsagePanel />)

    await waitFor(() => {
      expect(screen.getByText(/today/i)).toBeInTheDocument()
    })
  })
})

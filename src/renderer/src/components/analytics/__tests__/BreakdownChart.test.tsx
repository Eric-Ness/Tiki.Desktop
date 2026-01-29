import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BreakdownChart } from '../BreakdownChart'

describe('BreakdownChart', () => {
  const mockData = [
    { label: 'Feature Development', value: 45, percentage: 45 },
    { label: 'Bug Fixes', value: 25, percentage: 25 },
    { label: 'Code Review', value: 20, percentage: 20 },
    { label: 'Documentation', value: 10, percentage: 10 }
  ]

  describe('Basic Rendering', () => {
    it('should render chart container', () => {
      render(<BreakdownChart data={mockData} />)
      expect(screen.getByTestId('breakdown-chart')).toBeInTheDocument()
    })

    it('should render title when provided', () => {
      render(<BreakdownChart data={mockData} title="Time Breakdown" />)
      expect(screen.getByText('Time Breakdown')).toBeInTheDocument()
    })

    it('should render all data items', () => {
      render(<BreakdownChart data={mockData} />)
      expect(screen.getByText('Feature Development')).toBeInTheDocument()
      expect(screen.getByText('Bug Fixes')).toBeInTheDocument()
      expect(screen.getByText('Code Review')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })

    it('should render values for each item', () => {
      render(<BreakdownChart data={mockData} />)
      expect(screen.getByText('45')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('should render percentages for each item', () => {
      render(<BreakdownChart data={mockData} />)
      expect(screen.getByText('45.0%')).toBeInTheDocument()
      expect(screen.getByText('25.0%')).toBeInTheDocument()
      expect(screen.getByText('20.0%')).toBeInTheDocument()
      expect(screen.getByText('10.0%')).toBeInTheDocument()
    })

    it('should render bars for each item', () => {
      render(<BreakdownChart data={mockData} />)
      expect(screen.getByTestId('breakdown-bar-0')).toBeInTheDocument()
      expect(screen.getByTestId('breakdown-bar-1')).toBeInTheDocument()
      expect(screen.getByTestId('breakdown-bar-2')).toBeInTheDocument()
      expect(screen.getByTestId('breakdown-bar-3')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort data by value descending', () => {
      const unsortedData = [
        { label: 'Small', value: 10, percentage: 10 },
        { label: 'Large', value: 50, percentage: 50 },
        { label: 'Medium', value: 30, percentage: 30 }
      ]
      render(<BreakdownChart data={unsortedData} />)

      // Check the order of items
      const items = screen.getAllByTestId(/^breakdown-item-/)
      expect(items[0]).toHaveTextContent('Large')
      expect(items[1]).toHaveTextContent('Medium')
      expect(items[2]).toHaveTextContent('Small')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<BreakdownChart data={mockData} loading={true} />)
      expect(screen.getByTestId('breakdown-chart-loading')).toBeInTheDocument()
    })

    it('should not show chart content when loading', () => {
      render(<BreakdownChart data={mockData} loading={true} />)
      expect(screen.queryByTestId('breakdown-chart')).not.toBeInTheDocument()
    })

    it('should still show title when loading', () => {
      render(<BreakdownChart data={mockData} loading={true} title="Loading Chart" />)
      expect(screen.getByText('Loading Chart')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when data is empty', () => {
      render(<BreakdownChart data={[]} />)
      expect(screen.getByTestId('breakdown-chart-empty')).toBeInTheDocument()
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('should show title with empty state', () => {
      render(<BreakdownChart data={[]} title="Empty Chart" />)
      expect(screen.getByText('Empty Chart')).toBeInTheDocument()
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct card styling', () => {
      render(<BreakdownChart data={mockData} />)
      const chart = screen.getByTestId('breakdown-chart')
      expect(chart).toHaveClass('bg-slate-800')
      expect(chart).toHaveClass('rounded-lg')
      expect(chart).toHaveClass('p-4')
      expect(chart).toHaveClass('border')
      expect(chart).toHaveClass('border-slate-700')
    })

    it('should apply amber color to bars', () => {
      render(<BreakdownChart data={mockData} />)
      const firstBar = screen.getByTestId('breakdown-bar-0')
      // First item should have amber-500
      expect(firstBar).toHaveClass('bg-amber-500')
    })

    it('should have gradient colors based on position', () => {
      render(<BreakdownChart data={mockData} />)
      const bar0 = screen.getByTestId('breakdown-bar-0')
      const bar3 = screen.getByTestId('breakdown-bar-3')

      // First should be amber-500, last should be darker
      expect(bar0).toHaveClass('bg-amber-500')
      expect(bar3).toHaveClass('bg-amber-700')
    })

    it('should set bar width based on percentage', () => {
      render(<BreakdownChart data={mockData} />)
      const bar0 = screen.getByTestId('breakdown-bar-0')
      expect(bar0).toHaveStyle({ width: '45%' })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      const singleData = [{ label: 'Only Item', value: 100, percentage: 100 }]
      render(<BreakdownChart data={singleData} />)
      expect(screen.getByText('Only Item')).toBeInTheDocument()
      expect(screen.getByTestId('breakdown-bar-0')).toBeInTheDocument()
    })

    it('should handle zero percentages', () => {
      const zeroData = [
        { label: 'Zero Item', value: 0, percentage: 0 }
      ]
      render(<BreakdownChart data={zeroData} />)
      expect(screen.getByText('Zero Item')).toBeInTheDocument()
      const bar = screen.getByTestId('breakdown-bar-0')
      expect(bar).toHaveStyle({ width: '0%' })
    })

    it('should cap percentage at 100%', () => {
      const overData = [
        { label: 'Over 100', value: 150, percentage: 150 }
      ]
      render(<BreakdownChart data={overData} />)
      const bar = screen.getByTestId('breakdown-bar-0')
      expect(bar).toHaveStyle({ width: '100%' })
    })

    it('should handle decimal percentages', () => {
      const decimalData = [
        { label: 'Decimal', value: 33, percentage: 33.333 }
      ]
      render(<BreakdownChart data={decimalData} />)
      expect(screen.getByText('33.3%')).toBeInTheDocument()
    })

    it('should handle long labels', () => {
      const longData = [
        {
          label: 'This is a very long label that should be truncated',
          value: 50,
          percentage: 50
        }
      ]
      render(<BreakdownChart data={longData} />)
      expect(
        screen.getByText('This is a very long label that should be truncated')
      ).toBeInTheDocument()
    })
  })
})

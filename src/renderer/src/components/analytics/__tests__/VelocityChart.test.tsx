import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VelocityChart } from '../VelocityChart'

describe('VelocityChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 25 },
    { date: '2024-01-03', value: 15 },
    { date: '2024-01-04', value: 30 },
    { date: '2024-01-05', value: 20 }
  ]

  describe('Basic Rendering', () => {
    it('should render chart container', () => {
      render(<VelocityChart data={mockData} />)
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument()
    })

    it('should render title when provided', () => {
      render(<VelocityChart data={mockData} title="Velocity Over Time" />)
      expect(screen.getByText('Velocity Over Time')).toBeInTheDocument()
    })

    it('should render SVG element', () => {
      render(<VelocityChart data={mockData} />)
      const chart = screen.getByTestId('velocity-chart')
      const svg = chart.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render data points as circles', () => {
      render(<VelocityChart data={mockData} />)
      const chart = screen.getByTestId('velocity-chart')
      const circles = chart.querySelectorAll('circle')
      expect(circles.length).toBe(mockData.length)
    })

    it('should render line path', () => {
      render(<VelocityChart data={mockData} />)
      const chart = screen.getByTestId('velocity-chart')
      const paths = chart.querySelectorAll('path')
      // Should have at least line path and area path
      expect(paths.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading is true', () => {
      render(<VelocityChart data={mockData} loading={true} />)
      expect(screen.getByTestId('velocity-chart-loading')).toBeInTheDocument()
    })

    it('should not show chart content when loading', () => {
      render(<VelocityChart data={mockData} loading={true} />)
      expect(screen.queryByTestId('velocity-chart')).not.toBeInTheDocument()
    })

    it('should still show title when loading', () => {
      render(<VelocityChart data={mockData} loading={true} title="Loading Chart" />)
      expect(screen.getByText('Loading Chart')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when data is empty', () => {
      render(<VelocityChart data={[]} />)
      expect(screen.getByTestId('velocity-chart-empty')).toBeInTheDocument()
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('should show title with empty state', () => {
      render(<VelocityChart data={[]} title="Empty Chart" />)
      expect(screen.getByText('Empty Chart')).toBeInTheDocument()
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct card styling', () => {
      render(<VelocityChart data={mockData} />)
      const chart = screen.getByTestId('velocity-chart')
      expect(chart).toHaveClass('bg-slate-800')
      expect(chart).toHaveClass('rounded-lg')
      expect(chart).toHaveClass('p-4')
      expect(chart).toHaveClass('border')
      expect(chart).toHaveClass('border-slate-700')
    })

    it('should respect custom height', () => {
      render(<VelocityChart data={mockData} height={300} />)
      const chart = screen.getByTestId('velocity-chart')
      const chartArea = chart.querySelector('[style*="height"]')
      expect(chartArea).toBeInTheDocument()
    })
  })

  describe('Data Handling', () => {
    it('should handle single data point', () => {
      const singlePoint = [{ date: '2024-01-01', value: 50 }]
      render(<VelocityChart data={singlePoint} />)
      const chart = screen.getByTestId('velocity-chart')
      const circles = chart.querySelectorAll('circle')
      expect(circles.length).toBe(1)
    })

    it('should handle two data points', () => {
      const twoPoints = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 }
      ]
      render(<VelocityChart data={twoPoints} />)
      const chart = screen.getByTestId('velocity-chart')
      const circles = chart.querySelectorAll('circle')
      expect(circles.length).toBe(2)
    })

    it('should handle large values', () => {
      const largeData = [
        { date: '2024-01-01', value: 10000 },
        { date: '2024-01-02', value: 25000 }
      ]
      render(<VelocityChart data={largeData} />)
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument()
    })

    it('should handle zero values', () => {
      const zeroData = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-01-02', value: 0 }
      ]
      render(<VelocityChart data={zeroData} />)
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument()
    })

    it('should handle negative values', () => {
      const negativeData = [
        { date: '2024-01-01', value: -10 },
        { date: '2024-01-02', value: 10 }
      ]
      render(<VelocityChart data={negativeData} />)
      expect(screen.getByTestId('velocity-chart')).toBeInTheDocument()
    })
  })
})

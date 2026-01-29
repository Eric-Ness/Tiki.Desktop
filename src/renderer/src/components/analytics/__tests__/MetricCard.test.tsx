import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../MetricCard'

describe('MetricCard', () => {
  describe('Basic Rendering', () => {
    it('should render title and value', () => {
      render(<MetricCard title="Tasks Completed" value={42} />)

      expect(screen.getByText('Tasks Completed')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should render string values', () => {
      render(<MetricCard title="Status" value="On Track" />)

      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('On Track')).toBeInTheDocument()
    })

    it('should render value with unit suffix', () => {
      render(<MetricCard title="Completion Rate" value={85} unit="%" />)

      expect(screen.getByText('85')).toBeInTheDocument()
      expect(screen.getByText('%')).toBeInTheDocument()
    })

    it('should render value with different units', () => {
      const { rerender } = render(
        <MetricCard title="Time Spent" value={12.5} unit="hrs" />
      )
      expect(screen.getByText('hrs')).toBeInTheDocument()

      rerender(<MetricCard title="Lines Changed" value={2.4} unit="K" />)
      expect(screen.getByText('K')).toBeInTheDocument()
    })
  })

  describe('Delta Display', () => {
    it('should show positive delta with up indicator', () => {
      render(<MetricCard title="Velocity" value={100} delta={15} />)

      const deltaElement = screen.getByTestId('metric-delta')
      expect(deltaElement).toHaveTextContent('+15%')
      expect(deltaElement).toHaveClass('text-green-400')
    })

    it('should show negative delta with down indicator', () => {
      render(<MetricCard title="Bugs" value={5} delta={-20} />)

      const deltaElement = screen.getByTestId('metric-delta')
      expect(deltaElement).toHaveTextContent('-20%')
      expect(deltaElement).toHaveClass('text-red-400')
    })

    it('should show zero delta as neutral', () => {
      render(<MetricCard title="Unchanged" value={50} delta={0} />)

      const deltaElement = screen.getByTestId('metric-delta')
      expect(deltaElement).toHaveTextContent('0%')
      expect(deltaElement).toHaveClass('text-slate-400')
    })

    it('should display delta label when provided', () => {
      render(
        <MetricCard
          title="Velocity"
          value={100}
          delta={15}
          deltaLabel="vs last week"
        />
      )

      expect(screen.getByText('vs last week')).toBeInTheDocument()
    })

    it('should not show delta section when delta is undefined', () => {
      render(<MetricCard title="Simple" value={42} />)

      expect(screen.queryByTestId('metric-delta')).not.toBeInTheDocument()
    })
  })

  describe('Icon Support', () => {
    it('should render icon when provided', () => {
      const TestIcon = () => <svg data-testid="test-icon" />
      render(<MetricCard title="With Icon" value={10} icon={<TestIcon />} />)

      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('should not render icon container when no icon provided', () => {
      render(<MetricCard title="No Icon" value={10} />)

      expect(screen.queryByTestId('metric-icon')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading is true', () => {
      render(<MetricCard title="Loading Card" value={0} loading={true} />)

      expect(screen.getByTestId('metric-loading')).toBeInTheDocument()
      // Should still show title even when loading
      expect(screen.getByText('Loading Card')).toBeInTheDocument()
    })

    it('should not show value when loading', () => {
      render(<MetricCard title="Loading Card" value={42} loading={true} />)

      // Value should not be visible during loading
      expect(screen.queryByText('42')).not.toBeInTheDocument()
    })

    it('should show value when not loading', () => {
      render(<MetricCard title="Loaded Card" value={42} loading={false} />)

      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.queryByTestId('metric-loading')).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct card styling', () => {
      render(<MetricCard title="Styled Card" value={99} />)

      const card = screen.getByTestId('metric-card')
      expect(card).toHaveClass('bg-slate-800')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('p-4')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('border-slate-700')
    })

    it('should have correct title styling', () => {
      render(<MetricCard title="Styled Title" value={99} />)

      const title = screen.getByText('Styled Title')
      expect(title).toHaveClass('text-xs')
      expect(title).toHaveClass('text-slate-400')
      expect(title).toHaveClass('uppercase')
      expect(title).toHaveClass('tracking-wide')
    })

    it('should have correct value styling', () => {
      render(<MetricCard title="Value Style" value={99} />)

      const value = screen.getByText('99')
      expect(value).toHaveClass('text-2xl')
      expect(value).toHaveClass('font-bold')
      expect(value).toHaveClass('text-white')
    })
  })

  describe('Edge Cases', () => {
    it('should handle large numbers', () => {
      render(<MetricCard title="Large Number" value={1000000} />)

      expect(screen.getByText('1000000')).toBeInTheDocument()
    })

    it('should handle decimal values', () => {
      render(<MetricCard title="Decimal" value={3.14159} />)

      expect(screen.getByText('3.14159')).toBeInTheDocument()
    })

    it('should handle empty string value', () => {
      render(<MetricCard title="Empty" value="" />)

      const card = screen.getByTestId('metric-card')
      expect(card).toBeInTheDocument()
    })

    it('should handle very small delta values', () => {
      render(<MetricCard title="Small Delta" value={100} delta={0.5} />)

      const deltaElement = screen.getByTestId('metric-delta')
      expect(deltaElement).toHaveTextContent('+0.5%')
    })

    it('should handle negative value with positive delta', () => {
      render(<MetricCard title="Negative" value={-10} delta={5} />)

      expect(screen.getByText('-10')).toBeInTheDocument()
      const deltaElement = screen.getByTestId('metric-delta')
      expect(deltaElement).toHaveTextContent('+5%')
    })
  })
})

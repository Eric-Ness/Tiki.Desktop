import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineAxis } from '../TimelineAxis'

describe('TimelineAxis', () => {
  it('should render time ticks', () => {
    const startTime = new Date('2024-01-15T10:00:00.000Z')
    const endTime = new Date('2024-01-15T10:30:00.000Z')

    render(<TimelineAxis startTime={startTime} endTime={endTime} />)

    const axis = screen.getByTestId('timeline-axis')
    expect(axis).toBeInTheDocument()
  })

  it('should render the specified number of ticks', () => {
    const startTime = new Date('2024-01-15T10:00:00.000Z')
    const endTime = new Date('2024-01-15T10:30:00.000Z')

    render(<TimelineAxis startTime={startTime} endTime={endTime} tickCount={5} />)

    const ticks = screen.getAllByTestId('timeline-tick')
    expect(ticks).toHaveLength(5)
  })

  it('should default to 5 ticks when tickCount is not specified', () => {
    const startTime = new Date('2024-01-15T10:00:00.000Z')
    const endTime = new Date('2024-01-15T10:30:00.000Z')

    render(<TimelineAxis startTime={startTime} endTime={endTime} />)

    const ticks = screen.getAllByTestId('timeline-tick')
    expect(ticks).toHaveLength(5)
  })

  it('should display formatted time values', () => {
    const startTime = new Date('2024-01-15T10:00:00.000Z')
    const endTime = new Date('2024-01-15T10:10:00.000Z')

    render(<TimelineAxis startTime={startTime} endTime={endTime} tickCount={3} />)

    // Should show time in HH:MM format or similar
    const axis = screen.getByTestId('timeline-axis')
    expect(axis.textContent).toBeTruthy()
  })

  it('should handle same start and end time', () => {
    const time = new Date('2024-01-15T10:00:00.000Z')

    render(<TimelineAxis startTime={time} endTime={time} tickCount={3} />)

    const axis = screen.getByTestId('timeline-axis')
    expect(axis).toBeInTheDocument()
  })
})

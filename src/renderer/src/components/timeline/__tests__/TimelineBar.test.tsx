import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineBar } from '../TimelineBar'
import type { PhaseExecution } from '../../../types/timeline'

describe('TimelineBar', () => {
  const baseExecution: PhaseExecution = {
    phaseNumber: 1,
    phaseName: 'Setup Infrastructure',
    issueNumber: 25,
    startedAt: '2024-01-15T10:00:00.000Z',
    completedAt: '2024-01-15T10:05:00.000Z',
    status: 'completed',
    durationMs: 300000, // 5 minutes
    files: ['src/main.ts', 'src/utils.ts']
  }

  it('should render the phase number', () => {
    render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
  })

  it('should apply correct width based on duration and total', () => {
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000} // 10 minutes total
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar).toBeInTheDocument()
    // 5 min / 10 min = 50%
    expect(bar).toHaveStyle({ width: '50%' })
  })

  it('should apply correct left offset based on startOffset', () => {
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={120000} // 2 minutes offset
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar).toBeInTheDocument()
    // 2 min / 10 min = 20%
    expect(bar).toHaveStyle({ left: '20%' })
  })

  it('should apply completed styling for completed status', () => {
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar?.className).toContain('bg-green')
  })

  it('should apply failed styling for failed status', () => {
    const failedExecution: PhaseExecution = {
      ...baseExecution,
      status: 'failed',
      error: 'Build failed'
    }
    const { container } = render(
      <TimelineBar
        execution={failedExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar?.className).toContain('bg-red')
  })

  it('should apply running styling with animation for running status', () => {
    const runningExecution: PhaseExecution = {
      ...baseExecution,
      status: 'running',
      completedAt: undefined,
      durationMs: undefined
    }
    const { container } = render(
      <TimelineBar
        execution={runningExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar?.className).toContain('bg-amber')
    expect(bar?.className).toContain('animate-pulse')
  })

  it('should apply skipped styling for skipped status', () => {
    const skippedExecution: PhaseExecution = {
      ...baseExecution,
      status: 'skipped'
    }
    const { container } = render(
      <TimelineBar
        execution={skippedExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    expect(bar?.className).toContain('bg-slate')
  })

  it('should call onHover with execution when mouse enters', () => {
    const onHover = vi.fn()
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={0}
        onHover={onHover}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    fireEvent.mouseEnter(bar!)
    expect(onHover).toHaveBeenCalledWith(baseExecution)
  })

  it('should call onHover with null when mouse leaves', () => {
    const onHover = vi.fn()
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={0}
        onHover={onHover}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    fireEvent.mouseLeave(bar!)
    expect(onHover).toHaveBeenCalledWith(null)
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    const { container } = render(
      <TimelineBar
        execution={baseExecution}
        totalDuration={600000}
        startOffset={0}
        onClick={onClick}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    fireEvent.click(bar!)
    expect(onClick).toHaveBeenCalled()
  })

  it('should have a minimum width for very short durations', () => {
    const shortExecution: PhaseExecution = {
      ...baseExecution,
      durationMs: 100 // Very short
    }
    const { container } = render(
      <TimelineBar
        execution={shortExecution}
        totalDuration={600000}
        startOffset={0}
      />
    )
    const bar = container.querySelector('[data-testid="timeline-bar"]')
    // Should have at least 2% width for visibility
    expect(bar).toHaveStyle({ width: '2%' })
  })
})

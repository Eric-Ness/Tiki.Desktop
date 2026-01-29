import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineView } from '../TimelineView'
import type { ExecutionTimeline, PhaseExecution } from '../../../types/timeline'

describe('TimelineView', () => {
  const completedExecution: PhaseExecution = {
    phaseNumber: 1,
    phaseName: 'Setup',
    issueNumber: 25,
    startedAt: '2024-01-15T10:00:00.000Z',
    completedAt: '2024-01-15T10:05:00.000Z',
    status: 'completed',
    durationMs: 300000,
    files: ['src/main.ts']
  }

  const secondExecution: PhaseExecution = {
    phaseNumber: 2,
    phaseName: 'Implementation',
    issueNumber: 25,
    startedAt: '2024-01-15T10:05:00.000Z',
    completedAt: '2024-01-15T10:15:00.000Z',
    status: 'completed',
    durationMs: 600000,
    files: ['src/feature.ts', 'src/utils.ts']
  }

  const baseTimeline: ExecutionTimeline = {
    executions: [completedExecution, secondExecution],
    issueNumber: 25,
    startedAt: '2024-01-15T10:00:00.000Z'
  }

  it('should render the timeline container', () => {
    render(<TimelineView timeline={baseTimeline} />)
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
  })

  it('should render all phase executions as bars', () => {
    render(<TimelineView timeline={baseTimeline} />)
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
    expect(screen.getByText('Phase 2')).toBeInTheDocument()
  })

  it('should render zoom controls', () => {
    render(<TimelineView timeline={baseTimeline} />)
    expect(screen.getByTestId('zoom-in-button')).toBeInTheDocument()
    expect(screen.getByTestId('zoom-out-button')).toBeInTheDocument()
    expect(screen.getByTestId('zoom-level')).toBeInTheDocument()
  })

  it('should increase zoom when zoom in button is clicked', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const zoomInButton = screen.getByTestId('zoom-in-button')
    const zoomLevel = screen.getByTestId('zoom-level')

    expect(zoomLevel).toHaveTextContent('100%')
    fireEvent.click(zoomInButton)
    expect(zoomLevel).toHaveTextContent('125%')
  })

  it('should decrease zoom when zoom out button is clicked', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const zoomOutButton = screen.getByTestId('zoom-out-button')
    const zoomLevel = screen.getByTestId('zoom-level')

    expect(zoomLevel).toHaveTextContent('100%')
    fireEvent.click(zoomOutButton)
    expect(zoomLevel).toHaveTextContent('75%')
  })

  it('should not zoom below minimum', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const zoomOutButton = screen.getByTestId('zoom-out-button')
    const zoomLevel = screen.getByTestId('zoom-level')

    // Click multiple times to try to go below minimum
    for (let i = 0; i < 10; i++) {
      fireEvent.click(zoomOutButton)
    }
    // Should not go below 50%
    expect(zoomLevel).toHaveTextContent('50%')
  })

  it('should not zoom above maximum', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const zoomInButton = screen.getByTestId('zoom-in-button')
    const zoomLevel = screen.getByTestId('zoom-level')

    // Click multiple times to try to go above maximum
    for (let i = 0; i < 20; i++) {
      fireEvent.click(zoomInButton)
    }
    // Should not go above 400%
    expect(zoomLevel).toHaveTextContent('400%')
  })

  it('should show tooltip when hovering over a bar', async () => {
    render(<TimelineView timeline={baseTimeline} />)
    const phase1Bars = screen.getAllByTestId('timeline-bar')

    fireEvent.mouseEnter(phase1Bars[0])

    expect(screen.getByTestId('timeline-tooltip')).toBeInTheDocument()
  })

  it('should hide tooltip when mouse leaves bar', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const phase1Bars = screen.getAllByTestId('timeline-bar')

    fireEvent.mouseEnter(phase1Bars[0])
    expect(screen.getByTestId('timeline-tooltip')).toBeInTheDocument()

    fireEvent.mouseLeave(phase1Bars[0])
    expect(screen.queryByTestId('timeline-tooltip')).not.toBeInTheDocument()
  })

  it('should render the timeline axis', () => {
    render(<TimelineView timeline={baseTimeline} />)
    expect(screen.getByTestId('timeline-axis')).toBeInTheDocument()
  })

  it('should handle empty executions', () => {
    const emptyTimeline: ExecutionTimeline = {
      executions: [],
      issueNumber: 25,
      startedAt: '2024-01-15T10:00:00.000Z'
    }
    render(<TimelineView timeline={emptyTimeline} />)
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
    expect(screen.getByText(/No executions/i)).toBeInTheDocument()
  })

  it('should show currently running execution with animation', () => {
    const runningExecution: PhaseExecution = {
      phaseNumber: 3,
      phaseName: 'Testing',
      issueNumber: 25,
      startedAt: '2024-01-15T10:15:00.000Z',
      status: 'running'
    }
    const timelineWithRunning: ExecutionTimeline = {
      executions: [completedExecution, secondExecution, runningExecution],
      currentExecution: runningExecution,
      issueNumber: 25,
      startedAt: '2024-01-15T10:00:00.000Z'
    }

    render(<TimelineView timeline={timelineWithRunning} />)
    const bars = screen.getAllByTestId('timeline-bar')
    const runningBar = bars.find(bar => bar.className.includes('animate-pulse'))
    expect(runningBar).toBeTruthy()
  })

  it('should highlight failed phases distinctly', () => {
    const failedExecution: PhaseExecution = {
      phaseNumber: 2,
      phaseName: 'Build',
      issueNumber: 25,
      startedAt: '2024-01-15T10:05:00.000Z',
      completedAt: '2024-01-15T10:08:00.000Z',
      status: 'failed',
      durationMs: 180000,
      error: 'Build failed'
    }
    const timelineWithFailed: ExecutionTimeline = {
      executions: [completedExecution, failedExecution],
      issueNumber: 25,
      startedAt: '2024-01-15T10:00:00.000Z'
    }

    const { container } = render(<TimelineView timeline={timelineWithFailed} />)
    const failedBar = container.querySelector('[data-testid="timeline-bar"].bg-red-500')
    expect(failedBar).toBeTruthy()
  })

  it('should be scrollable for long executions', () => {
    render(<TimelineView timeline={baseTimeline} />)
    const scrollContainer = screen.getByTestId('timeline-scroll-container')
    expect(scrollContainer).toHaveClass('overflow-auto')
  })

  it('should call onPhaseSelect when a bar is clicked', () => {
    const onPhaseSelect = vi.fn()
    render(<TimelineView timeline={baseTimeline} onPhaseSelect={onPhaseSelect} />)

    const bars = screen.getAllByTestId('timeline-bar')
    fireEvent.click(bars[0])

    expect(onPhaseSelect).toHaveBeenCalledWith(completedExecution)
  })
})

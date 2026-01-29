import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineTooltip } from '../TimelineTooltip'
import type { PhaseExecution } from '../../../types/timeline'

describe('TimelineTooltip', () => {
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

  it('should render the phase number and name', () => {
    render(
      <TimelineTooltip
        execution={baseExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.getByText(/Phase 1/)).toBeInTheDocument()
    expect(screen.getByText(/Setup Infrastructure/)).toBeInTheDocument()
  })

  it('should render the duration', () => {
    render(
      <TimelineTooltip
        execution={baseExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    // Should show formatted duration like "5m 0s" or "5 minutes"
    expect(screen.getByTestId('tooltip-duration')).toBeInTheDocument()
  })

  it('should render the file count when files are present', () => {
    render(
      <TimelineTooltip
        execution={baseExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.getByText(/2 files changed/)).toBeInTheDocument()
  })

  it('should not render file count when no files', () => {
    const noFilesExecution: PhaseExecution = {
      ...baseExecution,
      files: undefined
    }
    render(
      <TimelineTooltip
        execution={noFilesExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.queryByText(/files changed/)).not.toBeInTheDocument()
  })

  it('should render error message for failed phases', () => {
    const failedExecution: PhaseExecution = {
      ...baseExecution,
      status: 'failed',
      error: 'Build failed: missing dependency'
    }
    render(
      <TimelineTooltip
        execution={failedExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.getByText(/Build failed: missing dependency/)).toBeInTheDocument()
  })

  it('should position the tooltip at the specified coordinates', () => {
    const { container } = render(
      <TimelineTooltip
        execution={baseExecution}
        position={{ x: 150, y: 75 }}
      />
    )
    const tooltip = container.querySelector('[data-testid="timeline-tooltip"]')
    expect(tooltip).toHaveStyle({ left: '150px', top: '75px' })
  })

  it('should show status indicator', () => {
    render(
      <TimelineTooltip
        execution={baseExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.getByTestId('tooltip-status')).toBeInTheDocument()
  })

  it('should handle running phase with no duration', () => {
    const runningExecution: PhaseExecution = {
      ...baseExecution,
      status: 'running',
      completedAt: undefined,
      durationMs: undefined
    }
    render(
      <TimelineTooltip
        execution={runningExecution}
        position={{ x: 100, y: 50 }}
      />
    )
    expect(screen.getByText(/Running/i)).toBeInTheDocument()
  })
})

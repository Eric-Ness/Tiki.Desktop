import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityEventItem } from '../ActivityEventItem'
import type { ActivityEvent } from '../../../stores/activity-store'

describe('ActivityEventItem', () => {
  const baseEvent: ActivityEvent = {
    id: 'test-id',
    timestamp: '2024-01-15T10:30:00.000Z',
    type: 'execution_start',
    level: 'info',
    message: 'Started execution of issue #27'
  }

  it('should render the event message', () => {
    render(<ActivityEventItem event={baseEvent} />)
    expect(screen.getByText('Started execution of issue #27')).toBeInTheDocument()
  })

  it('should render the formatted timestamp', () => {
    render(<ActivityEventItem event={baseEvent} />)
    // Should show time in HH:MM:SS format
    expect(screen.getByTestId('event-timestamp')).toBeInTheDocument()
  })

  it('should render an icon for the event type', () => {
    render(<ActivityEventItem event={baseEvent} />)
    expect(screen.getByTestId('event-icon')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ActivityEventItem event={baseEvent} onClick={onClick} />)

    fireEvent.click(screen.getByTestId('activity-event'))
    expect(onClick).toHaveBeenCalled()
  })

  it('should show success styling for success level', () => {
    const successEvent: ActivityEvent = {
      ...baseEvent,
      level: 'success',
      type: 'phase_complete',
      message: 'Phase completed'
    }
    render(<ActivityEventItem event={successEvent} />)

    const icon = screen.getByTestId('event-icon')
    expect(icon.className).toContain('text-green')
  })

  it('should show error styling for error level', () => {
    const errorEvent: ActivityEvent = {
      ...baseEvent,
      level: 'error',
      type: 'execution_fail',
      message: 'Execution failed'
    }
    render(<ActivityEventItem event={errorEvent} />)

    const icon = screen.getByTestId('event-icon')
    expect(icon.className).toContain('text-red')
  })

  it('should show warning styling for warning level', () => {
    const warningEvent: ActivityEvent = {
      ...baseEvent,
      level: 'warning',
      type: 'phase_skip',
      message: 'Phase skipped'
    }
    render(<ActivityEventItem event={warningEvent} />)

    const icon = screen.getByTestId('event-icon')
    expect(icon.className).toContain('text-amber')
  })

  it('should display different icons for different event types', () => {
    const types = [
      'execution_start',
      'execution_complete',
      'phase_start',
      'phase_complete',
      'terminal_create'
    ] as const

    types.forEach((type) => {
      const { unmount } = render(
        <ActivityEventItem event={{ ...baseEvent, type }} />
      )
      expect(screen.getByTestId('event-icon')).toBeInTheDocument()
      unmount()
    })
  })

  it('should show metadata when hovering if present', () => {
    const eventWithMetadata: ActivityEvent = {
      ...baseEvent,
      metadata: {
        issueNumber: 27,
        phaseNumber: 1,
        duration: 5000
      }
    }
    render(<ActivityEventItem event={eventWithMetadata} />)

    // The event should have a title attribute with metadata
    const eventElement = screen.getByTestId('activity-event')
    expect(eventElement).toHaveAttribute('title')
    expect(eventElement.getAttribute('title')).toContain('27')
  })
})

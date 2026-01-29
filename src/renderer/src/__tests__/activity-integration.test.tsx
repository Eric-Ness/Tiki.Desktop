import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MainContent } from '../components/layout/MainContent'
import { useActivityStore } from '../stores/activity-store'
import { useTikiStore } from '../stores/tiki-store'

describe('Activity Log Integration', () => {
  beforeEach(() => {
    // Reset the activity store
    useActivityStore.setState({
      events: [],
      filter: 'all',
      searchQuery: '',
      maxEvents: 500
    })

    // Reset terminal state
    useTikiStore.setState({
      terminals: [],
      activeTerminal: null
    })
  })

  it('should render activity tab in main content', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })
    expect(screen.getByRole('button', { name: /Activity/i })).toBeInTheDocument()
  })

  it('should switch to activity view when activity tab clicked', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    // Click the Activity tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Activity/i }))
    })

    // Activity log should be visible
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
  })

  it('should show activity events in the log', async () => {
    // Add an event before rendering
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Started execution of issue #27'
    })

    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    // Click the Activity tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Activity/i }))
    })

    // Event should be visible
    expect(screen.getByText('Started execution of issue #27')).toBeInTheDocument()
  })

  it('should update in real-time when new events added', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    // Click the Activity tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Activity/i }))
    })

    // Initially no events
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()

    // Add an event
    await act(async () => {
      useActivityStore.getState().addEvent({
        type: 'phase_start',
        level: 'info',
        message: 'Phase 1 started'
      })
    })

    // Event should appear
    await waitFor(() => {
      expect(screen.getByText('Phase 1 started')).toBeInTheDocument()
    })
  })

  it('should show event count badge when events exist', async () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Test event 1'
    })
    useActivityStore.getState().addEvent({
      type: 'phase_start',
      level: 'info',
      message: 'Test event 2'
    })

    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    // The tab should show event count
    const activityTab = screen.getByRole('button', { name: /Activity/i })
    expect(activityTab).toHaveTextContent('2')
  })
})

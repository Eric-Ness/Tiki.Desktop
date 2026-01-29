import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityLog } from '../ActivityLog'
import { useActivityStore } from '../../../stores/activity-store'

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

describe('ActivityLog', () => {
  beforeEach(() => {
    // Reset the store before each test
    useActivityStore.setState({
      events: [],
      filter: 'all',
      searchQuery: '',
      maxEvents: 500
    })
    vi.clearAllMocks()
  })

  it('should render empty state when no events', () => {
    render(<ActivityLog />)
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
  })

  it('should render events list when events exist', () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Started execution'
    })

    render(<ActivityLog />)
    expect(screen.getByText('Started execution')).toBeInTheDocument()
  })

  it('should have a search input', () => {
    render(<ActivityLog />)
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument()
  })

  it('should filter events when searching', () => {
    const { addEvent } = useActivityStore.getState()
    addEvent({ type: 'execution_start', level: 'info', message: 'Started execution' })
    addEvent({ type: 'phase_start', level: 'info', message: 'Phase 1 started' })

    render(<ActivityLog />)

    const searchInput = screen.getByPlaceholderText(/Search/i)
    fireEvent.change(searchInput, { target: { value: 'Phase' } })

    expect(screen.getByText('Phase 1 started')).toBeInTheDocument()
    expect(screen.queryByText('Started execution')).not.toBeInTheDocument()
  })

  it('should have a filter dropdown', () => {
    render(<ActivityLog />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should filter events by type when filter selected', () => {
    const { addEvent } = useActivityStore.getState()
    addEvent({ type: 'execution_start', level: 'info', message: 'Execution started' })
    addEvent({ type: 'phase_complete', level: 'success', message: 'Phase completed' })

    render(<ActivityLog />)

    const filterSelect = screen.getByRole('combobox')
    fireEvent.change(filterSelect, { target: { value: 'phase_complete' } })

    expect(screen.getByText('Phase completed')).toBeInTheDocument()
    expect(screen.queryByText('Execution started')).not.toBeInTheDocument()
  })

  it('should have a clear button', () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Test event'
    })

    render(<ActivityLog />)
    expect(screen.getByTitle(/Clear/i)).toBeInTheDocument()
  })

  it('should clear events when clear button clicked', () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Test event'
    })

    render(<ActivityLog />)

    fireEvent.click(screen.getByTitle(/Clear/i))
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
  })

  it('should have an export button', () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Test event'
    })

    render(<ActivityLog />)
    expect(screen.getByTitle(/Export/i)).toBeInTheDocument()
  })

  it('should export events to clipboard when export clicked', async () => {
    useActivityStore.getState().addEvent({
      type: 'execution_start',
      level: 'info',
      message: 'Test event'
    })

    render(<ActivityLog />)

    fireEvent.click(screen.getByTitle(/Export/i))

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })

  it('should show events in reverse chronological order', () => {
    const { addEvent } = useActivityStore.getState()
    addEvent({ type: 'execution_start', level: 'info', message: 'First event' })
    addEvent({ type: 'phase_start', level: 'info', message: 'Second event' })

    render(<ActivityLog />)

    const events = screen.getAllByTestId('activity-event')
    expect(events[0]).toHaveTextContent('Second event')
    expect(events[1]).toHaveTextContent('First event')
  })

  it('should display event count in header', () => {
    const { addEvent } = useActivityStore.getState()
    addEvent({ type: 'execution_start', level: 'info', message: 'Event 1' })
    addEvent({ type: 'phase_start', level: 'info', message: 'Event 2' })

    render(<ActivityLog />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

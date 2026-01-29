import { describe, it, expect, beforeEach } from 'vitest'
import { useActivityStore, ActivityEvent, ActivityEventType } from '../activity-store'

describe('Activity Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useActivityStore.setState({
      events: [],
      filter: 'all',
      searchQuery: '',
      maxEvents: 500
    })
  })

  describe('addEvent', () => {
    it('should add a new event with auto-generated id and timestamp', () => {
      const { addEvent } = useActivityStore.getState()

      addEvent({
        type: 'execution_start',
        level: 'info',
        message: 'Started execution of issue #27'
      })

      const state = useActivityStore.getState()
      expect(state.events).toHaveLength(1)
      expect(state.events[0].id).toBeDefined()
      expect(state.events[0].timestamp).toBeDefined()
      expect(state.events[0].type).toBe('execution_start')
      expect(state.events[0].level).toBe('info')
      expect(state.events[0].message).toBe('Started execution of issue #27')
    })

    it('should add events in reverse chronological order (newest first)', () => {
      const { addEvent } = useActivityStore.getState()

      addEvent({
        type: 'execution_start',
        level: 'info',
        message: 'First event'
      })

      addEvent({
        type: 'phase_start',
        level: 'info',
        message: 'Second event'
      })

      const state = useActivityStore.getState()
      expect(state.events).toHaveLength(2)
      expect(state.events[0].message).toBe('Second event')
      expect(state.events[1].message).toBe('First event')
    })

    it('should respect maxEvents limit', () => {
      useActivityStore.setState({ maxEvents: 3 })
      const { addEvent } = useActivityStore.getState()

      addEvent({ type: 'execution_start', level: 'info', message: 'Event 1' })
      addEvent({ type: 'execution_start', level: 'info', message: 'Event 2' })
      addEvent({ type: 'execution_start', level: 'info', message: 'Event 3' })
      addEvent({ type: 'execution_start', level: 'info', message: 'Event 4' })

      const state = useActivityStore.getState()
      expect(state.events).toHaveLength(3)
      expect(state.events[0].message).toBe('Event 4')
      expect(state.events[2].message).toBe('Event 2')
    })

    it('should store metadata when provided', () => {
      const { addEvent } = useActivityStore.getState()

      addEvent({
        type: 'phase_complete',
        level: 'success',
        message: 'Phase 1 completed',
        metadata: {
          issueNumber: 27,
          phaseNumber: 1,
          duration: 5000
        }
      })

      const state = useActivityStore.getState()
      expect(state.events[0].metadata).toEqual({
        issueNumber: 27,
        phaseNumber: 1,
        duration: 5000
      })
    })
  })

  describe('clearEvents', () => {
    it('should remove all events', () => {
      const { addEvent, clearEvents } = useActivityStore.getState()

      addEvent({ type: 'execution_start', level: 'info', message: 'Event 1' })
      addEvent({ type: 'phase_start', level: 'info', message: 'Event 2' })

      clearEvents()

      const state = useActivityStore.getState()
      expect(state.events).toHaveLength(0)
    })
  })

  describe('setFilter', () => {
    it('should update the filter', () => {
      const { setFilter } = useActivityStore.getState()

      setFilter('phase_complete')

      const state = useActivityStore.getState()
      expect(state.filter).toBe('phase_complete')
    })

    it('should allow setting filter to all', () => {
      const { setFilter } = useActivityStore.getState()

      setFilter('phase_complete')
      setFilter('all')

      const state = useActivityStore.getState()
      expect(state.filter).toBe('all')
    })
  })

  describe('setSearchQuery', () => {
    it('should update the search query', () => {
      const { setSearchQuery } = useActivityStore.getState()

      setSearchQuery('issue #27')

      const state = useActivityStore.getState()
      expect(state.searchQuery).toBe('issue #27')
    })
  })

  describe('getFilteredEvents', () => {
    beforeEach(() => {
      const { addEvent } = useActivityStore.getState()
      addEvent({ type: 'execution_start', level: 'info', message: 'Execution started for issue #27' })
      addEvent({ type: 'phase_start', level: 'info', message: 'Phase 1 started' })
      addEvent({ type: 'phase_complete', level: 'success', message: 'Phase 1 completed' })
      addEvent({ type: 'terminal_create', level: 'info', message: 'Terminal created' })
    })

    it('should return all events when filter is all and no search query', () => {
      const { getFilteredEvents } = useActivityStore.getState()

      const filtered = getFilteredEvents()
      expect(filtered).toHaveLength(4)
    })

    it('should filter by event type', () => {
      const { setFilter, getFilteredEvents } = useActivityStore.getState()

      setFilter('phase_complete')
      const filtered = getFilteredEvents()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('phase_complete')
    })

    it('should filter by search query (case insensitive)', () => {
      const { setSearchQuery, getFilteredEvents } = useActivityStore.getState()

      setSearchQuery('PHASE')
      const filtered = getFilteredEvents()

      expect(filtered).toHaveLength(2)
      expect(filtered.every(e => e.message.toLowerCase().includes('phase'))).toBe(true)
    })

    it('should combine type filter and search query', () => {
      const { setFilter, setSearchQuery, getFilteredEvents } = useActivityStore.getState()

      setFilter('phase_start')
      setSearchQuery('1')
      const filtered = getFilteredEvents()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].message).toBe('Phase 1 started')
    })

    it('should return empty array if no matches', () => {
      const { setSearchQuery, getFilteredEvents } = useActivityStore.getState()

      setSearchQuery('nonexistent')
      const filtered = getFilteredEvents()

      expect(filtered).toHaveLength(0)
    })
  })

  describe('exportEvents', () => {
    it('should return events as JSON string', () => {
      const { addEvent, exportEvents } = useActivityStore.getState()

      addEvent({
        type: 'execution_start',
        level: 'info',
        message: 'Test event',
        metadata: { issueNumber: 27 }
      })

      const exported = exportEvents()
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].message).toBe('Test event')
      expect(parsed[0].metadata.issueNumber).toBe(27)
    })

    it('should return empty array JSON when no events', () => {
      const { exportEvents } = useActivityStore.getState()

      const exported = exportEvents()

      expect(exported).toBe('[]')
    })

    it('should be properly formatted with indentation', () => {
      const { addEvent, exportEvents } = useActivityStore.getState()

      addEvent({ type: 'execution_start', level: 'info', message: 'Test' })

      const exported = exportEvents()

      expect(exported).toContain('\n')
      expect(exported).toContain('  ')
    })
  })

  describe('event types', () => {
    const eventTypes: ActivityEventType[] = [
      'execution_start',
      'execution_complete',
      'execution_fail',
      'phase_start',
      'phase_complete',
      'phase_fail',
      'phase_skip',
      'terminal_create',
      'terminal_close',
      'project_switch',
      'app_start',
      'command_execute'
    ]

    it.each(eventTypes)('should accept %s event type', (eventType) => {
      const { addEvent } = useActivityStore.getState()

      addEvent({
        type: eventType,
        level: 'info',
        message: `Event of type ${eventType}`
      })

      const state = useActivityStore.getState()
      expect(state.events[0].type).toBe(eventType)
    })
  })

  describe('event levels', () => {
    const levels = ['info', 'success', 'warning', 'error'] as const

    it.each(levels)('should accept %s level', (level) => {
      const { addEvent } = useActivityStore.getState()

      addEvent({
        type: 'execution_start',
        level,
        message: `Event with ${level} level`
      })

      const state = useActivityStore.getState()
      expect(state.events[0].level).toBe(level)
    })
  })
})

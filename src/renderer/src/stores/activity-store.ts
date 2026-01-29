import { create } from 'zustand'

export type ActivityEventType =
  | 'execution_start'
  | 'execution_complete'
  | 'execution_fail'
  | 'phase_start'
  | 'phase_complete'
  | 'phase_fail'
  | 'phase_skip'
  | 'terminal_create'
  | 'terminal_close'
  | 'project_switch'
  | 'app_start'
  | 'command_execute'

export type ActivityLevel = 'info' | 'success' | 'warning' | 'error'

export interface ActivityEvent {
  id: string
  timestamp: string
  type: ActivityEventType
  level: ActivityLevel
  message: string
  metadata?: {
    issueNumber?: number
    phaseNumber?: number
    duration?: number
    files?: string[]
    error?: string
    terminalId?: string
    command?: string
  }
}

interface ActivityStore {
  events: ActivityEvent[]
  filter: ActivityEventType | 'all'
  searchQuery: string
  maxEvents: number

  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  clearEvents: () => void
  setFilter: (filter: ActivityEventType | 'all') => void
  setSearchQuery: (query: string) => void
  getFilteredEvents: () => ActivityEvent[]
  exportEvents: () => string
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  events: [],
  filter: 'all',
  searchQuery: '',
  maxEvents: 500,

  addEvent: (event) =>
    set((state) => ({
      events: [
        {
          ...event,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        },
        ...state.events
      ].slice(0, state.maxEvents)
    })),

  clearEvents: () => set({ events: [] }),

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  getFilteredEvents: () => {
    const { events, filter, searchQuery } = get()
    return events.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false
      if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase()))
        return false
      return true
    })
  },

  exportEvents: () => {
    const { events } = get()
    return JSON.stringify(events, null, 2)
  }
}))

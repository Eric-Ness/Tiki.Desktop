import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { useTikiStore } from '../stores/tiki-store'
import { TerminalTabs } from '../components/terminal/TerminalTabs'

// Mock the Terminal component
vi.mock('../components/terminal/Terminal', () => ({
  Terminal: ({ terminalId }: { terminalId: string }) => (
    <div data-testid={`terminal-${terminalId}`}>Terminal {terminalId}</div>
  )
}))

// Mock the useTerminalShortcuts hook
vi.mock('../hooks/useTerminalShortcuts', () => ({
  useTerminalShortcuts: () => {}
}))

// Create mock for status change callback
let statusChangeCallback: ((id: string, status: 'idle' | 'running') => void) | null = null

// Mock the window.tikiDesktop API - override the setup.ts mock
const mockTerminalApi = {
  create: vi.fn().mockResolvedValue('terminal-1'),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(true),
  onData: vi.fn().mockReturnValue(() => {}),
  onExit: vi.fn().mockReturnValue(() => {}),
  onStatusChange: vi.fn((callback: (id: string, status: 'idle' | 'running') => void) => {
    statusChangeCallback = callback
    return () => { statusChangeCallback = null }
  })
}

// Override the tikiDesktop property on window (already set by setup.ts)
Object.defineProperty(window, 'tikiDesktop', {
  value: {
    terminal: mockTerminalApi
  },
  writable: true,
  configurable: true
})

describe('Terminal Status', () => {
  beforeEach(() => {
    // Reset store state with pre-existing terminals
    useTikiStore.setState({
      terminals: [
        { id: 'terminal-1', name: 'Terminal 1', status: 'idle' },
        { id: 'terminal-2', name: 'Terminal 2', status: 'idle' }
      ],
      activeTerminal: 'terminal-1'
    })
    vi.clearAllMocks()
    statusChangeCallback = null
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Store setTabStatus action', () => {
    it('should update terminal status via store action', () => {
      const { setTabStatus } = useTikiStore.getState()

      setTabStatus('terminal-1', 'busy')

      const state = useTikiStore.getState()
      expect(state.terminals[0].status).toBe('busy')
    })

    it('should keep other terminals unchanged when updating status', () => {
      const { setTabStatus } = useTikiStore.getState()

      setTabStatus('terminal-1', 'busy')

      const state = useTikiStore.getState()
      expect(state.terminals[0].status).toBe('busy')
      expect(state.terminals[1].status).toBe('idle')
    })

    it('should handle status transitions', () => {
      const { setTabStatus } = useTikiStore.getState()

      // idle -> busy
      setTabStatus('terminal-1', 'busy')
      expect(useTikiStore.getState().terminals[0].status).toBe('busy')

      // busy -> idle
      setTabStatus('terminal-1', 'idle')
      expect(useTikiStore.getState().terminals[0].status).toBe('idle')

      // idle -> active
      setTabStatus('terminal-1', 'active')
      expect(useTikiStore.getState().terminals[0].status).toBe('active')
    })
  })

  describe('Status indicator display', () => {
    it('should show status indicator for each terminal', () => {
      render(<TerminalTabs cwd="/test/path" />)

      const indicator1 = screen.getByTestId('status-indicator-terminal-1')
      const indicator2 = screen.getByTestId('status-indicator-terminal-2')

      expect(indicator1).toBeInTheDocument()
      expect(indicator2).toBeInTheDocument()
    })

    it('should show green indicator for idle status', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'idle' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const indicator = screen.getByTestId('status-indicator-terminal-1')
      expect(indicator).toHaveClass('bg-green-500')
    })

    it('should show amber indicator for busy status', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'busy' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const indicator = screen.getByTestId('status-indicator-terminal-1')
      expect(indicator).toHaveClass('bg-amber-500')
    })

    it('should animate busy indicator', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'busy' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const indicator = screen.getByTestId('status-indicator-terminal-1')
      expect(indicator).toHaveClass('animate-pulse')
    })

    it('should have correct title for idle status', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'idle' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const indicator = screen.getByTestId('status-indicator-terminal-1')
      expect(indicator).toHaveAttribute('title', 'Idle')
    })

    it('should have correct title for busy status', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'busy' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const indicator = screen.getByTestId('status-indicator-terminal-1')
      expect(indicator).toHaveAttribute('title', 'Running')
    })
  })

  describe('Auto-create on close last terminal', () => {
    it('should auto-create new terminal when closing last one via store', () => {
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'idle' }],
        activeTerminal: 'terminal-1'
      })

      const { closeTab } = useTikiStore.getState()
      closeTab('terminal-1')

      const state = useTikiStore.getState()
      // Should have created a new terminal
      expect(state.terminals.length).toBe(1)
      expect(state.terminals[0].name).toBe('Terminal 1')
      expect(state.activeTerminal).not.toBeNull()
    })

    it('should not auto-create when closing non-last terminal', () => {
      useTikiStore.setState({
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', status: 'idle' },
          { id: 'terminal-2', name: 'Terminal 2', status: 'idle' }
        ],
        activeTerminal: 'terminal-1'
      })

      const { closeTab } = useTikiStore.getState()
      closeTab('terminal-1')

      const state = useTikiStore.getState()
      expect(state.terminals.length).toBe(1)
      expect(state.terminals[0].id).toBe('terminal-2')
    })
  })

  describe('Multiple terminals support', () => {
    it('should support 5+ terminals open simultaneously', () => {
      useTikiStore.setState({
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', status: 'idle' },
          { id: 'terminal-2', name: 'Terminal 2', status: 'idle' },
          { id: 'terminal-3', name: 'Terminal 3', status: 'busy' },
          { id: 'terminal-4', name: 'Terminal 4', status: 'idle' },
          { id: 'terminal-5', name: 'Terminal 5', status: 'busy' },
          { id: 'terminal-6', name: 'Terminal 6', status: 'idle' }
        ],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      // All 6 terminals should be visible
      expect(screen.getByText('Terminal 1')).toBeInTheDocument()
      expect(screen.getByText('Terminal 2')).toBeInTheDocument()
      expect(screen.getByText('Terminal 3')).toBeInTheDocument()
      expect(screen.getByText('Terminal 4')).toBeInTheDocument()
      expect(screen.getByText('Terminal 5')).toBeInTheDocument()
      expect(screen.getByText('Terminal 6')).toBeInTheDocument()

      // Status indicators should be correct
      expect(screen.getByTestId('status-indicator-terminal-3')).toHaveClass('bg-amber-500')
      expect(screen.getByTestId('status-indicator-terminal-5')).toHaveClass('bg-amber-500')
      expect(screen.getByTestId('status-indicator-terminal-1')).toHaveClass('bg-green-500')
    })
  })

  describe('IPC status change subscription', () => {
    it('should subscribe to onStatusChange on mount', () => {
      render(<TerminalTabs cwd="/test/path" />)

      expect(mockTerminalApi.onStatusChange).toHaveBeenCalledTimes(1)
      expect(statusChangeCallback).not.toBeNull()
    })

    it('should update store when receiving running status from IPC', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // Simulate IPC status change wrapped in act
      await act(async () => {
        statusChangeCallback?.('terminal-1', 'running')
      })

      await waitFor(() => {
        const state = useTikiStore.getState()
        expect(state.terminals[0].status).toBe('busy')
      })
    })

    it('should update store when receiving idle status from IPC', async () => {
      // Set initial state to busy
      useTikiStore.setState({
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', status: 'busy' }],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      // Simulate IPC status change wrapped in act
      await act(async () => {
        statusChangeCallback?.('terminal-1', 'idle')
      })

      await waitFor(() => {
        const state = useTikiStore.getState()
        expect(state.terminals[0].status).toBe('idle')
      })
    })

    it('should unsubscribe on unmount', () => {
      const { unmount } = render(<TerminalTabs cwd="/test/path" />)

      expect(statusChangeCallback).not.toBeNull()

      unmount()

      expect(statusChangeCallback).toBeNull()
    })
  })
})

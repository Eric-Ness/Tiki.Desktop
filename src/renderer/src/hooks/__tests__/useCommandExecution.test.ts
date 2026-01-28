import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCommandExecution } from '../useCommandExecution'
import { useTikiStore } from '../../stores/tiki-store'
import type { TikiCommand } from '../../lib/command-registry'

// Mock window.tikiDesktop.terminal
const mockWrite = vi.fn()
const mockCreate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Reset store state
  useTikiStore.setState({
    activeTerminal: 'terminal-1',
    activeProject: { name: 'Test Project', path: '/test/path' },
    recentCommands: [],
    activeTab: 'workflow',
    tabs: []
  })

  // Setup mock
  Object.defineProperty(window, 'tikiDesktop', {
    value: {
      ...window.tikiDesktop,
      terminal: {
        ...window.tikiDesktop?.terminal,
        write: mockWrite,
        create: mockCreate
      }
    },
    writable: true,
    configurable: true
  })
})

describe('useCommandExecution', () => {
  const mockCommand: TikiCommand = {
    name: 'tiki:yolo',
    displayName: 'yolo',
    description: 'Run full workflow',
    argumentHint: '<issue>'
  }

  const mockCommandNoArgs: TikiCommand = {
    name: 'tiki:state',
    displayName: 'state',
    description: 'Show current state'
  }

  describe('executeCommand', () => {
    it('should write command to active terminal', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommand(mockCommandNoArgs)
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:state\n')
    })

    it('should add command to recent commands', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommand(mockCommandNoArgs)
      })

      const state = useTikiStore.getState()
      expect(state.recentCommands).toContain('tiki:state')
    })

    it('should execute command with argument hint the same as without', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommand(mockCommand)
      })

      // All commands now execute with newline since arguments are handled separately
      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo\n')
    })

    it('should return error state when no active terminal and no project', async () => {
      useTikiStore.setState({ activeTerminal: null, activeProject: null })

      const { result } = renderHook(() => useCommandExecution())

      let execResult: { success: boolean; error?: string } | undefined

      await act(async () => {
        execResult = await result.current.executeCommand(mockCommandNoArgs)
      })

      expect(execResult?.success).toBe(false)
      expect(execResult?.error).toBe('No active terminal and could not create one')
    })

    it('should create terminal if none exists and project is set', async () => {
      useTikiStore.setState({ activeTerminal: null })
      mockCreate.mockResolvedValue('new-terminal-1')

      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommand(mockCommandNoArgs)
      })

      expect(mockCreate).toHaveBeenCalledWith('/test/path')
      expect(mockWrite).toHaveBeenCalledWith('new-terminal-1', '/tiki:state\n')
    })

    it('should return success when command executed', async () => {
      const { result } = renderHook(() => useCommandExecution())

      let execResult: { success: boolean; error?: string } | undefined

      await act(async () => {
        execResult = await result.current.executeCommand(mockCommandNoArgs)
      })

      expect(execResult?.success).toBe(true)
    })

    it('should switch to terminal tab after execution', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommand(mockCommandNoArgs)
      })

      const state = useTikiStore.getState()
      expect(state.activeTab).toBe('terminal')
    })
  })

  describe('executeCommandWithArgs', () => {
    it('should execute command with provided arguments', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommandWithArgs(mockCommand, '42')
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo 42\n')
    })

    it('should trim argument whitespace', async () => {
      const { result } = renderHook(() => useCommandExecution())

      await act(async () => {
        await result.current.executeCommandWithArgs(mockCommand, '  42  ')
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo 42\n')
    })

    it('should return success with arguments', async () => {
      const { result } = renderHook(() => useCommandExecution())

      let execResult: { success: boolean; error?: string } | undefined

      await act(async () => {
        execResult = await result.current.executeCommandWithArgs(mockCommand, '42')
      })

      expect(execResult?.success).toBe(true)
    })
  })
})

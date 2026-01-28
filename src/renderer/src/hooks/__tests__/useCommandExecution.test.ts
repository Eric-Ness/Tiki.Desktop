import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommandExecution } from '../useCommandExecution'
import { useTikiStore } from '../../stores/tiki-store'
import type { TikiCommand } from '../../lib/command-registry'

// Mock window.tikiDesktop.terminal.write
const mockWrite = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Reset store state
  useTikiStore.setState({
    activeTerminal: 'terminal-1',
    recentCommands: []
  })

  // Setup mock
  Object.defineProperty(window, 'tikiDesktop', {
    value: {
      ...window.tikiDesktop,
      terminal: {
        ...window.tikiDesktop?.terminal,
        write: mockWrite
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
    it('should write command to active terminal', () => {
      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommand(mockCommandNoArgs)
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:state\n')
    })

    it('should add command to recent commands', () => {
      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommand(mockCommandNoArgs)
      })

      const state = useTikiStore.getState()
      expect(state.recentCommands).toContain('tiki:state')
    })

    it('should not include newline for commands with argument hints', () => {
      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommand(mockCommand)
      })

      // Should end with space, not newline, to allow argument input
      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo ')
    })

    it('should not execute if no active terminal', () => {
      useTikiStore.setState({ activeTerminal: null })

      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommand(mockCommandNoArgs)
      })

      expect(mockWrite).not.toHaveBeenCalled()
    })

    it('should return error state when no active terminal', () => {
      useTikiStore.setState({ activeTerminal: null })

      const { result } = renderHook(() => useCommandExecution())

      let execResult: { success: boolean; error?: string } | undefined

      act(() => {
        execResult = result.current.executeCommand(mockCommandNoArgs)
      })

      expect(execResult?.success).toBe(false)
      expect(execResult?.error).toBe('No active terminal')
    })

    it('should return success when command executed', () => {
      const { result } = renderHook(() => useCommandExecution())

      let execResult: { success: boolean; error?: string } | undefined

      act(() => {
        execResult = result.current.executeCommand(mockCommandNoArgs)
      })

      expect(execResult?.success).toBe(true)
    })
  })

  describe('executeCommandWithArgs', () => {
    it('should execute command with provided arguments', () => {
      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommandWithArgs(mockCommand, '42')
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo 42\n')
    })

    it('should trim argument whitespace', () => {
      const { result } = renderHook(() => useCommandExecution())

      act(() => {
        result.current.executeCommandWithArgs(mockCommand, '  42  ')
      })

      expect(mockWrite).toHaveBeenCalledWith('terminal-1', '/tiki:yolo 42\n')
    })
  })
})

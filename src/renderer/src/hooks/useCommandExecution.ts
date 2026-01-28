import { useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'
import type { TikiCommand } from '../lib/command-registry'

interface ExecutionResult {
  success: boolean
  error?: string
}

interface UseCommandExecutionResult {
  executeCommand: (command: TikiCommand) => ExecutionResult
  executeCommandWithArgs: (command: TikiCommand, args: string) => ExecutionResult
}

/**
 * Hook for executing Tiki commands in the active terminal
 */
export function useCommandExecution(): UseCommandExecutionResult {
  const activeTerminal = useTikiStore((state) => state.activeTerminal)
  const addRecentCommand = useTikiStore((state) => state.addRecentCommand)

  const executeCommand = useCallback(
    (command: TikiCommand): ExecutionResult => {
      if (!activeTerminal) {
        return { success: false, error: 'No active terminal' }
      }

      // Add to recent commands
      addRecentCommand(command.name)

      // Build command string
      // If command has argument hint, don't add newline - let user type arg
      const commandText = command.argumentHint
        ? `/${command.name} `
        : `/${command.name}\n`

      // Send to terminal
      window.tikiDesktop.terminal.write(activeTerminal, commandText)

      return { success: true }
    },
    [activeTerminal, addRecentCommand]
  )

  const executeCommandWithArgs = useCallback(
    (command: TikiCommand, args: string): ExecutionResult => {
      if (!activeTerminal) {
        return { success: false, error: 'No active terminal' }
      }

      // Add to recent commands
      addRecentCommand(command.name)

      // Build command string with arguments
      const trimmedArgs = args.trim()
      const commandText = `/${command.name} ${trimmedArgs}\n`

      // Send to terminal
      window.tikiDesktop.terminal.write(activeTerminal, commandText)

      return { success: true }
    },
    [activeTerminal, addRecentCommand]
  )

  return {
    executeCommand,
    executeCommandWithArgs
  }
}

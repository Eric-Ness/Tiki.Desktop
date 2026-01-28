import { useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'
import type { TikiCommand } from '../lib/command-registry'

interface ExecutionResult {
  success: boolean
  error?: string
}

interface UseCommandExecutionResult {
  executeCommand: (command: TikiCommand) => Promise<ExecutionResult>
  executeCommandWithArgs: (command: TikiCommand, args: string) => Promise<ExecutionResult>
}

/**
 * Hook for executing Tiki commands in the active terminal
 */
export function useCommandExecution(): UseCommandExecutionResult {
  const activeTerminal = useTikiStore((state) => state.activeTerminal)
  const activeProject = useTikiStore((state) => state.activeProject)
  const addRecentCommand = useTikiStore((state) => state.addRecentCommand)
  const setActiveTab = useTikiStore((state) => state.setActiveTab)
  const createTab = useTikiStore((state) => state.createTab)

  /**
   * Ensure we have an active terminal, creating one if necessary
   */
  const ensureTerminal = useCallback(async (): Promise<string | null> => {
    // Check if we already have an active terminal
    let terminalId = useTikiStore.getState().activeTerminal

    if (terminalId) {
      return terminalId
    }

    // No terminal - try to create one
    if (!activeProject?.path) {
      return null
    }

    try {
      // Create terminal in main process
      terminalId = await window.tikiDesktop.terminal.create(activeProject.path)

      // Add to store
      useTikiStore.getState().addTerminal({
        id: terminalId,
        name: 'Terminal 1',
        status: 'active'
      })
      useTikiStore.getState().setActiveTerminal(terminalId)

      return terminalId
    } catch {
      return null
    }
  }, [activeProject?.path])

  /**
   * Focus the terminal after command execution
   */
  const focusTerminal = useCallback(() => {
    // Switch to terminal tab
    setActiveTab('terminal')

    // Emit focus event for terminal component
    const terminalId = useTikiStore.getState().activeTerminal
    if (terminalId) {
      window.dispatchEvent(
        new CustomEvent('terminal:focus', { detail: { id: terminalId } })
      )
    }
  }, [setActiveTab])

  const executeCommand = useCallback(
    async (command: TikiCommand): Promise<ExecutionResult> => {
      // Ensure we have a terminal
      const terminalId = await ensureTerminal()

      if (!terminalId) {
        return { success: false, error: 'No active terminal and could not create one' }
      }

      // Add to recent commands
      addRecentCommand(command.name)

      // Build command string - always execute directly (no trailing space for args)
      const commandText = `/${command.name}\n`

      // Send to terminal
      window.tikiDesktop.terminal.write(terminalId, commandText)

      // Focus terminal
      focusTerminal()

      return { success: true }
    },
    [ensureTerminal, addRecentCommand, focusTerminal]
  )

  const executeCommandWithArgs = useCallback(
    async (command: TikiCommand, args: string): Promise<ExecutionResult> => {
      // Ensure we have a terminal
      const terminalId = await ensureTerminal()

      if (!terminalId) {
        return { success: false, error: 'No active terminal and could not create one' }
      }

      // Add to recent commands
      addRecentCommand(command.name)

      // Build command string with arguments
      const trimmedArgs = args.trim()
      const commandText = `/${command.name} ${trimmedArgs}\n`

      // Send to terminal
      window.tikiDesktop.terminal.write(terminalId, commandText)

      // Focus terminal
      focusTerminal()

      return { success: true }
    },
    [ensureTerminal, addRecentCommand, focusTerminal]
  )

  return {
    executeCommand,
    executeCommandWithArgs
  }
}

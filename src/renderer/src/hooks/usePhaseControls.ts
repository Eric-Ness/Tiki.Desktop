import { useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Hook for phase control actions that send Tiki commands to the terminal
 */
export function usePhaseControls() {
  const activeProject = useTikiStore((state) => state.activeProject)
  const setActiveTab = useTikiStore((state) => state.setActiveTab)

  /**
   * Ensure we have an active terminal, creating one if necessary
   */
  const ensureTerminal = useCallback(async (): Promise<string | null> => {
    let terminalId = useTikiStore.getState().activeTerminal
    if (terminalId) return terminalId

    if (!activeProject?.path) return null

    try {
      terminalId = await window.tikiDesktop.terminal.create(activeProject.path)
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
   * Send a command to the terminal
   */
  const sendCommand = useCallback(
    async (command: string): Promise<boolean> => {
      const terminalId = await ensureTerminal()
      if (!terminalId) return false

      // Send command to terminal
      window.tikiDesktop.terminal.write(terminalId, command + '\n')

      // Switch to terminal tab
      setActiveTab('terminal')

      // Focus terminal
      window.dispatchEvent(
        new CustomEvent('terminal:focus', { detail: { id: terminalId } })
      )

      return true
    },
    [ensureTerminal, setActiveTab]
  )

  /**
   * Pause execution
   */
  const pause = useCallback(async (): Promise<void> => {
    await sendCommand('/tiki:pause')
  }, [sendCommand])

  /**
   * Resume execution
   */
  const resume = useCallback(async (): Promise<void> => {
    await sendCommand('/tiki:resume')
  }, [sendCommand])

  /**
   * Skip a phase
   */
  const skipPhase = useCallback(
    async (phaseNumber: number): Promise<void> => {
      await sendCommand(`/tiki:skip-phase ${phaseNumber}`)
    },
    [sendCommand]
  )

  /**
   * Redo a phase
   */
  const redoPhase = useCallback(
    async (phaseNumber: number): Promise<void> => {
      await sendCommand(`/tiki:redo-phase ${phaseNumber}`)
    },
    [sendCommand]
  )

  return {
    pause,
    resume,
    skipPhase,
    redoPhase
  }
}

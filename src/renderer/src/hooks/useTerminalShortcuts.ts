import { useEffect, useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Hook that registers keyboard shortcuts for terminal management.
 *
 * Shortcuts (Windows):
 * - Ctrl+Shift+T: Create new terminal
 * - Ctrl+W: Close active terminal (auto-creates new if last one closed)
 * - Ctrl+1-9: Switch to terminal by index
 */
export function useTerminalShortcuts() {
  const createTab = useTikiStore((state) => state.createTab)
  const closeTab = useTikiStore((state) => state.closeTab)
  const setActiveTerminalTab = useTikiStore((state) => state.setActiveTerminalTab)
  const activeTerminal = useTikiStore((state) => state.activeTerminal)
  const getTabByIndex = useTikiStore((state) => state.getTabByIndex)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ctrl+Shift+T - Create new terminal
      if (event.ctrlKey && event.shiftKey && event.key.toUpperCase() === 'T') {
        event.preventDefault()
        createTab()
        return
      }

      // Ctrl+W - Close active terminal
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (activeTerminal) {
          closeTab(activeTerminal)
        }
        return
      }

      // Ctrl+1-9 - Switch to terminal by index
      if (event.ctrlKey && !event.shiftKey && /^[1-9]$/.test(event.key)) {
        event.preventDefault()
        const index = parseInt(event.key, 10) - 1 // Convert to 0-based index
        const tab = getTabByIndex(index)
        if (tab) {
          setActiveTerminalTab(tab.id)
        }
        return
      }
    },
    [createTab, closeTab, setActiveTerminalTab, activeTerminal, getTabByIndex]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

import { useEffect, useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Hook that registers keyboard shortcuts for detail panel management.
 *
 * Shortcuts (Windows):
 * - Ctrl+Shift+B: Toggle detail panel collapse
 *
 * The shortcut will not trigger when:
 * - Focus is on an INPUT or TEXTAREA element
 * - Alt key is pressed
 */
export function useDetailPanelShortcuts() {
  const toggleDetailPanel = useTikiStore((state) => state.toggleDetailPanel)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if Alt key is pressed
      if (event.altKey) {
        return
      }

      // Skip if typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+Shift+B - Toggle detail panel
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleDetailPanel()
        return
      }
    },
    [toggleDetailPanel]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

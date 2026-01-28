import { useEffect, useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Hook that registers keyboard shortcuts for sidebar management.
 *
 * Shortcuts (Windows):
 * - Ctrl+B: Toggle sidebar collapse
 */
export function useSidebarShortcuts() {
  const toggleSidebar = useTikiStore((state) => state.toggleSidebar)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ctrl+B - Toggle sidebar
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleSidebar()
        return
      }
    },
    [toggleSidebar]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

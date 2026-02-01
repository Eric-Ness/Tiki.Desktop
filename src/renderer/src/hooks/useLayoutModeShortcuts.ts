/**
 * useLayoutModeShortcuts Hook
 *
 * Registers keyboard shortcuts for switching layout modes:
 * - Ctrl+Shift+W: Switch to Workflow mode
 * - Ctrl+Shift+D: Switch to Development mode
 * - Ctrl+Shift+L: Toggle between modes
 */

import { useEffect } from 'react'
import { useTikiStore } from '../stores/tiki-store'

export function useLayoutModeShortcuts() {
  const setLayoutMode = useTikiStore((state) => state.setLayoutMode)
  const toggleLayoutMode = useTikiStore((state) => state.toggleLayoutMode)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Check for Ctrl+Shift combination
      if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
        switch (e.key.toUpperCase()) {
          case 'W':
            e.preventDefault()
            setLayoutMode('workflow')
            break
          case 'D':
            e.preventDefault()
            setLayoutMode('development')
            break
          case 'L':
            e.preventDefault()
            toggleLayoutMode()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setLayoutMode, toggleLayoutMode])
}

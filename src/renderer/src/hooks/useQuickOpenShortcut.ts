/**
 * useQuickOpenShortcut Hook
 *
 * Registers Ctrl+P to open the Quick Open dialog.
 * Only active in Development mode.
 */

import { useState, useEffect } from 'react'
import { useTikiStore } from '../stores/tiki-store'

export function useQuickOpenShortcut() {
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false)
  const layoutMode = useTikiStore((state) => state.layoutMode)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only in Development mode
      if (layoutMode !== 'development') return

      // Ignore if typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Ctrl+P to open quick open
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsQuickOpenOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [layoutMode])

  return {
    isQuickOpenOpen,
    openQuickOpen: () => setIsQuickOpenOpen(true),
    closeQuickOpen: () => setIsQuickOpenOpen(false)
  }
}

import { useState, useEffect, useCallback } from 'react'

interface UseSearchShortcutResult {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  close: () => void
  toggle: () => void
}

/**
 * Hook to manage global search visibility with keyboard shortcut (Ctrl+Shift+F / Cmd+Shift+F)
 */
export function useSearchShortcut(): UseSearchShortcutResult {
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+Shift+F (Windows/Linux) or Cmd+Shift+F (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return {
    isOpen,
    setIsOpen,
    close,
    toggle
  }
}

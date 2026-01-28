import { useState, useEffect, useCallback } from 'react'

interface UseCommandPaletteShortcutResult {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  close: () => void
  toggle: () => void
}

/**
 * Hook to manage command palette visibility with keyboard shortcut (Ctrl+K / Cmd+K)
 */
export function useCommandPaletteShortcut(): UseCommandPaletteShortcutResult {
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

      // Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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

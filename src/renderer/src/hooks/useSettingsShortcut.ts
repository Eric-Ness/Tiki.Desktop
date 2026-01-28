import { useEffect, useCallback } from 'react'
import { useTikiStore } from '../stores/tiki-store'

interface UseSettingsShortcutResult {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Hook to manage settings modal open/close state with keyboard shortcut
 * Ctrl+, (comma) opens the settings modal
 * Uses the shared Zustand store for state management
 */
export function useSettingsShortcut(): UseSettingsShortcutResult {
  const isOpen = useTikiStore((state) => state.settingsModalOpen)
  const setSettingsModalOpen = useTikiStore((state) => state.setSettingsModalOpen)
  const toggleSettingsModal = useTikiStore((state) => state.toggleSettingsModal)

  const open = useCallback(() => setSettingsModalOpen(true), [setSettingsModalOpen])
  const close = useCallback(() => setSettingsModalOpen(false), [setSettingsModalOpen])
  const toggle = toggleSettingsModal

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+, (Windows/Linux) or Cmd+, (Mac)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key === ',') {
        // Don't trigger when typing in inputs
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }

        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return { isOpen, open, close, toggle }
}

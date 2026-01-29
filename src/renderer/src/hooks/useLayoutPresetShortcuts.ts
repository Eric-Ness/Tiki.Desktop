import { useEffect, useCallback } from 'react'
import { useLayoutPresetsStore, builtInPresets } from '../stores/layout-presets'

/**
 * Hook that registers keyboard shortcuts for layout preset switching.
 *
 * Shortcuts (Windows):
 * - Ctrl+1: Apply first preset (Default)
 * - Ctrl+2: Apply second preset (Focus)
 * - Ctrl+3: Apply third preset (Planning)
 * - Ctrl+4: Apply fourth preset (Review)
 */
export function useLayoutPresetShortcuts() {
  const applyPreset = useLayoutPresetsStore((state) => state.applyPreset)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if typing in input or textarea
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // Only handle Ctrl+1 through Ctrl+4
      if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return

      // Map keys 1-4 to built-in preset indices
      const keyToIndex: Record<string, number> = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3
      }

      const presetIndex = keyToIndex[event.key]
      if (presetIndex !== undefined && presetIndex < builtInPresets.length) {
        event.preventDefault()
        const preset = builtInPresets[presetIndex]
        applyPreset(preset.id)
      }
    },
    [applyPreset]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

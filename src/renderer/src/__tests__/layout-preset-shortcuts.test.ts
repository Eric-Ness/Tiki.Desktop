import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLayoutPresetShortcuts } from '../hooks/useLayoutPresetShortcuts'
import { useLayoutPresetsStore, builtInPresets } from '../stores/layout-presets'

// Helper to simulate keydown events
function simulateKeyDown(options: Partial<KeyboardEventInit>) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...options
  })
  document.dispatchEvent(event)
  return event
}

describe('useLayoutPresetShortcuts', () => {
  beforeEach(() => {
    // Reset store state
    useLayoutPresetsStore.setState({
      activePresetId: 'default',
      presets: [],
      currentPanelSizes: {
        sidebarSize: 20,
        mainSize: 55,
        detailPanelSize: 25
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Ctrl+1 - Apply Default preset', () => {
    it('should apply Default preset (first built-in)', () => {
      useLayoutPresetsStore.setState({ activePresetId: 'focus' })
      renderHook(() => useLayoutPresetShortcuts())

      simulateKeyDown({ key: '1', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')
    })

    it('should prevent default behavior', () => {
      renderHook(() => useLayoutPresetShortcuts())

      const event = simulateKeyDown({ key: '1', ctrlKey: true })

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('Ctrl+2 - Apply Focus preset', () => {
    it('should apply Focus preset (second built-in)', () => {
      renderHook(() => useLayoutPresetShortcuts())

      simulateKeyDown({ key: '2', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('focus')
    })
  })

  describe('Ctrl+3 - Apply Planning preset', () => {
    it('should apply Planning preset (third built-in)', () => {
      renderHook(() => useLayoutPresetShortcuts())

      simulateKeyDown({ key: '3', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('planning')
    })
  })

  describe('Ctrl+4 - Apply Review preset', () => {
    it('should apply Review preset (fourth built-in)', () => {
      renderHook(() => useLayoutPresetShortcuts())

      simulateKeyDown({ key: '4', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('review')
    })
  })

  describe('Keyboard shortcut guards', () => {
    it('should not trigger without Ctrl key', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      simulateKeyDown({ key: '2', ctrlKey: false })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)
    })

    it('should not trigger with Ctrl+Shift', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      simulateKeyDown({ key: '2', ctrlKey: true, shiftKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)
    })

    it('should not trigger with Ctrl+Alt', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      simulateKeyDown({ key: '2', ctrlKey: true, altKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)
    })

    it('should not trigger for keys beyond preset count', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      simulateKeyDown({ key: '5', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)
    })

    it('should not trigger for non-number keys', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      simulateKeyDown({ key: 'a', ctrlKey: true })

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)
    })
  })

  describe('Input focus handling', () => {
    it('should not trigger when typing in input', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      // Create and focus an input element
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      const event = new KeyboardEvent('keydown', {
        key: '2',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      input.dispatchEvent(event)

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)

      // Cleanup
      document.body.removeChild(input)
    })

    it('should not trigger when typing in textarea', () => {
      renderHook(() => useLayoutPresetShortcuts())
      const initialPresetId = useLayoutPresetsStore.getState().activePresetId

      // Create and focus a textarea element
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      const event = new KeyboardEvent('keydown', {
        key: '2',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      textarea.dispatchEvent(event)

      expect(useLayoutPresetsStore.getState().activePresetId).toBe(initialPresetId)

      // Cleanup
      document.body.removeChild(textarea)
    })
  })

  describe('Event listener cleanup', () => {
    it('should add event listener on mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')

      renderHook(() => useLayoutPresetShortcuts())

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should remove event listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useLayoutPresetShortcuts())
      unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not respond to shortcuts after unmount', () => {
      const { unmount } = renderHook(() => useLayoutPresetShortcuts())

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')

      unmount()

      simulateKeyDown({ key: '2', ctrlKey: true })

      // Should still be 'default' because listener was removed
      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')
    })
  })

  describe('Multiple shortcut presses', () => {
    it('should switch between presets correctly', () => {
      renderHook(() => useLayoutPresetShortcuts())

      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')

      simulateKeyDown({ key: '2', ctrlKey: true })
      expect(useLayoutPresetsStore.getState().activePresetId).toBe('focus')

      simulateKeyDown({ key: '3', ctrlKey: true })
      expect(useLayoutPresetsStore.getState().activePresetId).toBe('planning')

      simulateKeyDown({ key: '4', ctrlKey: true })
      expect(useLayoutPresetsStore.getState().activePresetId).toBe('review')

      simulateKeyDown({ key: '1', ctrlKey: true })
      expect(useLayoutPresetsStore.getState().activePresetId).toBe('default')
    })
  })

  describe('Built-in preset mapping', () => {
    it('should map shortcuts to correct built-in presets', () => {
      // Verify that builtInPresets has the expected order
      expect(builtInPresets[0].id).toBe('default')
      expect(builtInPresets[1].id).toBe('focus')
      expect(builtInPresets[2].id).toBe('planning')
      expect(builtInPresets[3].id).toBe('review')
    })
  })
})

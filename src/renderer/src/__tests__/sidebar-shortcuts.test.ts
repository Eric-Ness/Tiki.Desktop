import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSidebarShortcuts } from '../hooks/useSidebarShortcuts'
import { useTikiStore } from '../stores/tiki-store'

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

describe('useSidebarShortcuts', () => {
  beforeEach(() => {
    // Reset store state
    useTikiStore.setState({
      sidebarCollapsed: false
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Ctrl+B - Toggle sidebar', () => {
    it('should toggle sidebar from expanded to collapsed', () => {
      renderHook(() => useSidebarShortcuts())

      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(true)
    })

    it('should toggle sidebar from collapsed to expanded', () => {
      useTikiStore.setState({ sidebarCollapsed: true })
      renderHook(() => useSidebarShortcuts())

      expect(useTikiStore.getState().sidebarCollapsed).toBe(true)

      simulateKeyDown({ key: 'b', ctrlKey: true })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)
    })

    it('should work with uppercase B', () => {
      renderHook(() => useSidebarShortcuts())

      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)

      simulateKeyDown({ key: 'B', ctrlKey: true })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(true)
    })

    it('should not trigger without Ctrl key', () => {
      renderHook(() => useSidebarShortcuts())

      const initialState = useTikiStore.getState().sidebarCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: false })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(initialState)
    })

    it('should not trigger with Ctrl+Shift+B', () => {
      renderHook(() => useSidebarShortcuts())

      const initialState = useTikiStore.getState().sidebarCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(initialState)
    })

    it('should prevent default behavior', () => {
      renderHook(() => useSidebarShortcuts())

      const event = simulateKeyDown({ key: 'b', ctrlKey: true })

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('Event listener cleanup', () => {
    it('should add event listener on mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')

      renderHook(() => useSidebarShortcuts())

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should remove event listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useSidebarShortcuts())
      unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not respond to shortcuts after unmount', () => {
      const { unmount } = renderHook(() => useSidebarShortcuts())

      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)

      unmount()

      simulateKeyDown({ key: 'b', ctrlKey: true })

      // Should still be false because listener was removed
      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)
    })
  })

  describe('Toggle multiple times', () => {
    it('should toggle correctly on multiple presses', () => {
      renderHook(() => useSidebarShortcuts())

      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true })
      expect(useTikiStore.getState().sidebarCollapsed).toBe(true)

      simulateKeyDown({ key: 'b', ctrlKey: true })
      expect(useTikiStore.getState().sidebarCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true })
      expect(useTikiStore.getState().sidebarCollapsed).toBe(true)
    })
  })
})

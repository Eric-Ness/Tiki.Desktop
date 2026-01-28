import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDetailPanelShortcuts } from '../hooks/useDetailPanelShortcuts'
import { useTikiStore } from '../stores/tiki-store'

// Helper to simulate keydown events
function simulateKeyDown(options: Partial<KeyboardEventInit>, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...options
  })
  // Override target if provided
  if (target) {
    Object.defineProperty(event, 'target', { value: target, writable: false })
  }
  document.dispatchEvent(event)
  return event
}

describe('useDetailPanelShortcuts', () => {
  beforeEach(() => {
    // Reset store state
    useTikiStore.setState({
      detailPanelCollapsed: false,
      sidebarCollapsed: false
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Ctrl+Shift+B - Toggle detail panel', () => {
    it('should toggle detail panel from expanded to collapsed', () => {
      renderHook(() => useDetailPanelShortcuts())

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)
    })

    it('should toggle detail panel from collapsed to expanded', () => {
      useTikiStore.setState({ detailPanelCollapsed: true })
      renderHook(() => useDetailPanelShortcuts())

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)
    })

    it('should work with uppercase B', () => {
      renderHook(() => useDetailPanelShortcuts())

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      simulateKeyDown({ key: 'B', ctrlKey: true, shiftKey: true })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)
    })

    it('should prevent default behavior', () => {
      renderHook(() => useDetailPanelShortcuts())

      const event = simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('Does NOT trigger on Ctrl+B (sidebar shortcut)', () => {
    it('should NOT toggle detail panel with Ctrl+B (without shift)', () => {
      renderHook(() => useDetailPanelShortcuts())

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: false })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)
    })

    it('should NOT affect sidebar state when Ctrl+Shift+B is pressed', () => {
      renderHook(() => useDetailPanelShortcuts())

      const initialSidebarState = useTikiStore.getState().sidebarCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      expect(useTikiStore.getState().sidebarCollapsed).toBe(initialSidebarState)
    })
  })

  describe('Does NOT trigger when typing in input fields', () => {
    it('should NOT toggle when focus is on INPUT element', () => {
      renderHook(() => useDetailPanelShortcuts())

      const input = document.createElement('input')
      document.body.appendChild(input)

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true }, input)

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)

      document.body.removeChild(input)
    })

    it('should NOT toggle when focus is on TEXTAREA element', () => {
      renderHook(() => useDetailPanelShortcuts())

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true }, textarea)

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)

      document.body.removeChild(textarea)
    })

    it('should toggle when focus is on non-input element', () => {
      renderHook(() => useDetailPanelShortcuts())

      const div = document.createElement('div')
      document.body.appendChild(div)

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true }, div)

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)

      document.body.removeChild(div)
    })
  })

  describe('Other modifier key combinations', () => {
    it('should NOT trigger without Ctrl key', () => {
      renderHook(() => useDetailPanelShortcuts())

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: false, shiftKey: true })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)
    })

    it('should NOT trigger without Shift key', () => {
      renderHook(() => useDetailPanelShortcuts())

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: false })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)
    })

    it('should NOT trigger with Alt key', () => {
      renderHook(() => useDetailPanelShortcuts())

      const initialState = useTikiStore.getState().detailPanelCollapsed

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true, altKey: true })

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(initialState)
    })
  })

  describe('Event listener cleanup', () => {
    it('should add event listener on mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')

      renderHook(() => useDetailPanelShortcuts())

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should remove event listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useDetailPanelShortcuts())
      unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not respond to shortcuts after unmount', () => {
      const { unmount } = renderHook(() => useDetailPanelShortcuts())

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      unmount()

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })

      // Should still be false because listener was removed
      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)
    })
  })

  describe('Toggle multiple times', () => {
    it('should toggle correctly on multiple presses', () => {
      renderHook(() => useDetailPanelShortcuts())

      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })
      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })
      expect(useTikiStore.getState().detailPanelCollapsed).toBe(false)

      simulateKeyDown({ key: 'b', ctrlKey: true, shiftKey: true })
      expect(useTikiStore.getState().detailPanelCollapsed).toBe(true)
    })
  })
})

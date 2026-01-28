import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTerminalShortcuts } from '../hooks/useTerminalShortcuts'
import { useTikiStore } from '../stores/tiki-store'

describe('useTerminalShortcuts', () => {
  // Mock functions for the store
  let mockCreateTab: ReturnType<typeof vi.fn>
  let mockCloseTab: ReturnType<typeof vi.fn>
  let mockSetActiveTab: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockCreateTab = vi.fn().mockReturnValue('new-tab-id')
    mockCloseTab = vi.fn()
    mockSetActiveTab = vi.fn()

    // Reset store state
    useTikiStore.setState({
      terminals: [
        { id: 'tab-1', name: 'Terminal 1', status: 'active' },
        { id: 'tab-2', name: 'Terminal 2', status: 'active' },
        { id: 'tab-3', name: 'Terminal 3', status: 'active' }
      ],
      activeTerminal: 'tab-1',
      createTab: mockCreateTab as unknown as (name?: string) => string,
      closeTab: mockCloseTab as unknown as (id: string) => void,
      setActiveTerminalTab: mockSetActiveTab as unknown as (id: string) => void,
      getTabByIndex: (index: number) => {
        const terminals = useTikiStore.getState().terminals
        return terminals[index]
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const simulateKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      bubbles: true,
      ...options
    })
    document.dispatchEvent(event)
    return event
  }

  describe('Ctrl+Shift+T - Create new terminal', () => {
    it('should create a new terminal when Ctrl+Shift+T is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('T', { ctrlKey: true, shiftKey: true })

      expect(mockCreateTab).toHaveBeenCalled()
    })

    it('should not trigger on just Ctrl+T', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('T', { ctrlKey: true, shiftKey: false })

      expect(mockCreateTab).not.toHaveBeenCalled()
    })

    it('should not trigger on just Shift+T', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('T', { ctrlKey: false, shiftKey: true })

      expect(mockCreateTab).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+W - Close active terminal', () => {
    it('should close the active terminal when Ctrl+W is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('w', { ctrlKey: true })

      expect(mockCloseTab).toHaveBeenCalledWith('tab-1')
    })

    it('should not trigger when no terminal is active', () => {
      useTikiStore.setState({
        activeTerminal: null
      })

      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('w', { ctrlKey: true })

      expect(mockCloseTab).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+1-9 - Switch to terminal by index', () => {
    it('should switch to first terminal on Ctrl+1', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('1', { ctrlKey: true })

      expect(mockSetActiveTab).toHaveBeenCalledWith('tab-1')
    })

    it('should switch to second terminal on Ctrl+2', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('2', { ctrlKey: true })

      expect(mockSetActiveTab).toHaveBeenCalledWith('tab-2')
    })

    it('should switch to third terminal on Ctrl+3', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('3', { ctrlKey: true })

      expect(mockSetActiveTab).toHaveBeenCalledWith('tab-3')
    })

    it('should not switch if terminal at index does not exist', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('9', { ctrlKey: true })

      expect(mockSetActiveTab).not.toHaveBeenCalled()
    })

    it('should handle all number keys 1-9', () => {
      renderHook(() => useTerminalShortcuts())

      // Test keys 4-9 which don't have tabs
      for (let i = 4; i <= 9; i++) {
        mockSetActiveTab.mockClear()
        simulateKeyDown(String(i), { ctrlKey: true })
        expect(mockSetActiveTab).not.toHaveBeenCalled()
      }
    })
  })

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useTerminalShortcuts())
      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
    })
  })

  describe('Event prevention', () => {
    it('should prevent default for handled shortcuts', () => {
      renderHook(() => useTerminalShortcuts())

      const event = new KeyboardEvent('keydown', {
        key: 'T',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})

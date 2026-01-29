import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTerminalShortcuts } from '../hooks/useTerminalShortcuts'
import { useTikiStore } from '../stores/tiki-store'

describe('Terminal Split Shortcuts', () => {
  let mockSplitTerminal: ReturnType<typeof vi.fn>
  let mockCloseSplit: ReturnType<typeof vi.fn>
  let mockMoveFocusBetweenPanes: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSplitTerminal = vi.fn()
    mockCloseSplit = vi.fn()
    mockMoveFocusBetweenPanes = vi.fn()

    // Reset store state with split functionality
    useTikiStore.setState({
      terminals: [
        { id: 'tab-1', name: 'Terminal 1', status: 'active' },
        { id: 'tab-2', name: 'Terminal 2', status: 'active' }
      ],
      activeTerminal: 'tab-1',
      terminalLayout: {
        direction: 'horizontal',
        panes: [
          { id: 'pane-1', terminalId: 'tab-1', size: 50 },
          { id: 'pane-2', terminalId: 'tab-2', size: 50 }
        ]
      },
      focusedPaneId: 'pane-1',
      splitTerminal: mockSplitTerminal as unknown as (direction: 'horizontal' | 'vertical') => void,
      closeSplit: mockCloseSplit as unknown as (paneId: string) => void,
      moveFocusBetweenPanes: mockMoveFocusBetweenPanes as unknown as (
        direction: 'left' | 'right' | 'up' | 'down'
      ) => void,
      // Keep existing shortcuts functional
      createTab: vi.fn().mockReturnValue('new-tab-id') as unknown as (name?: string) => string,
      closeTab: vi.fn() as unknown as (id: string) => void,
      setActiveTerminalTab: vi.fn() as unknown as (id: string) => void,
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
      cancelable: true,
      ...options
    })
    document.dispatchEvent(event)
    return event
  }

  describe('Ctrl+\\ - Split horizontally', () => {
    it('should split terminal horizontally when Ctrl+\\ is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('\\', { ctrlKey: true })

      expect(mockSplitTerminal).toHaveBeenCalledWith('horizontal')
    })

    it('should prevent default behavior', () => {
      renderHook(() => useTerminalShortcuts())

      const event = new KeyboardEvent('keydown', {
        key: '\\',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Ctrl+Shift+\\ - Split vertically', () => {
    it('should split terminal vertically when Ctrl+Shift+\\ is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('\\', { ctrlKey: true, shiftKey: true })

      expect(mockSplitTerminal).toHaveBeenCalledWith('vertical')
    })
  })

  describe('Ctrl+Alt+Arrow - Move focus between panes', () => {
    it('should move focus left when Ctrl+Alt+ArrowLeft is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('ArrowLeft', { ctrlKey: true, altKey: true })

      expect(mockMoveFocusBetweenPanes).toHaveBeenCalledWith('left')
    })

    it('should move focus right when Ctrl+Alt+ArrowRight is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('ArrowRight', { ctrlKey: true, altKey: true })

      expect(mockMoveFocusBetweenPanes).toHaveBeenCalledWith('right')
    })

    it('should move focus up when Ctrl+Alt+ArrowUp is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('ArrowUp', { ctrlKey: true, altKey: true })

      expect(mockMoveFocusBetweenPanes).toHaveBeenCalledWith('up')
    })

    it('should move focus down when Ctrl+Alt+ArrowDown is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('ArrowDown', { ctrlKey: true, altKey: true })

      expect(mockMoveFocusBetweenPanes).toHaveBeenCalledWith('down')
    })

    it('should not trigger without Alt key', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('ArrowLeft', { ctrlKey: true, altKey: false })

      expect(mockMoveFocusBetweenPanes).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+Shift+W - Close current pane', () => {
    it('should close the focused pane when Ctrl+Shift+W is pressed', () => {
      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('W', { ctrlKey: true, shiftKey: true })

      expect(mockCloseSplit).toHaveBeenCalledWith('pane-1')
    })

    it('should not close if focusedPaneId is null', () => {
      useTikiStore.setState({ focusedPaneId: null })

      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('W', { ctrlKey: true, shiftKey: true })

      expect(mockCloseSplit).not.toHaveBeenCalled()
    })
  })

  describe('existing shortcuts still work', () => {
    it('Ctrl+Shift+T should still create new terminal', () => {
      const mockCreateTab = vi.fn()
      useTikiStore.setState({
        createTab: mockCreateTab as unknown as (name?: string) => string
      })

      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('T', { ctrlKey: true, shiftKey: true })

      expect(mockCreateTab).toHaveBeenCalled()
    })

    it('Ctrl+W should still close active terminal (not split pane)', () => {
      const mockCloseTab = vi.fn()
      useTikiStore.setState({
        closeTab: mockCloseTab as unknown as (id: string) => void
      })

      renderHook(() => useTerminalShortcuts())

      simulateKeyDown('w', { ctrlKey: true })

      expect(mockCloseTab).toHaveBeenCalledWith('tab-1')
    })
  })
})

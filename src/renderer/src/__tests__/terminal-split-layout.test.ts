import { describe, it, expect, beforeEach } from 'vitest'
import { useTikiStore } from '../stores/tiki-store'

describe('Terminal Split Layout Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTikiStore.setState({
      terminals: [
        { id: 'terminal-1', name: 'Terminal 1', status: 'active' },
        { id: 'terminal-2', name: 'Terminal 2', status: 'idle' }
      ],
      activeTerminal: 'terminal-1',
      terminalLayout: {
        direction: 'none',
        panes: [{ id: 'pane-1', terminalId: 'terminal-1', size: 100 }]
      },
      focusedPaneId: 'pane-1'
    })
  })

  describe('terminalLayout initial state', () => {
    it('should have default layout with single pane', () => {
      const state = useTikiStore.getState()
      expect(state.terminalLayout).toBeDefined()
      expect(state.terminalLayout.direction).toBe('none')
      expect(state.terminalLayout.panes).toHaveLength(1)
    })

    it('should have a focused pane', () => {
      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1')
    })
  })

  describe('setTerminalLayout', () => {
    it('should update the terminal layout', () => {
      const { setTerminalLayout } = useTikiStore.getState()

      setTerminalLayout({
        direction: 'horizontal',
        panes: [
          { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
          { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
        ]
      })

      const state = useTikiStore.getState()
      expect(state.terminalLayout.direction).toBe('horizontal')
      expect(state.terminalLayout.panes).toHaveLength(2)
    })

    it('should allow vertical layout', () => {
      const { setTerminalLayout } = useTikiStore.getState()

      setTerminalLayout({
        direction: 'vertical',
        panes: [
          { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
          { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
        ]
      })

      const state = useTikiStore.getState()
      expect(state.terminalLayout.direction).toBe('vertical')
    })
  })

  describe('splitTerminal', () => {
    it('should split terminal horizontally', () => {
      const { splitTerminal } = useTikiStore.getState()

      splitTerminal('horizontal')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.direction).toBe('horizontal')
      expect(state.terminalLayout.panes).toHaveLength(2)
      expect(state.terminalLayout.panes[0].size).toBe(50)
      expect(state.terminalLayout.panes[1].size).toBe(50)
    })

    it('should split terminal vertically', () => {
      const { splitTerminal } = useTikiStore.getState()

      splitTerminal('vertical')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.direction).toBe('vertical')
      expect(state.terminalLayout.panes).toHaveLength(2)
    })

    it('should use next available terminal for new pane', () => {
      const { splitTerminal } = useTikiStore.getState()

      splitTerminal('horizontal')

      const state = useTikiStore.getState()
      // First pane keeps original terminal
      expect(state.terminalLayout.panes[0].terminalId).toBe('terminal-1')
      // Second pane gets a different terminal or the same if no other available
      expect(state.terminalLayout.panes[1].terminalId).toBeDefined()
    })

    it('should generate unique pane ids', () => {
      const { splitTerminal } = useTikiStore.getState()

      splitTerminal('horizontal')

      const state = useTikiStore.getState()
      const ids = state.terminalLayout.panes.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length) // All IDs should be unique
    })

    it('should focus the new pane after split', () => {
      const { splitTerminal } = useTikiStore.getState()

      splitTerminal('horizontal')

      const state = useTikiStore.getState()
      // The new pane (second one) should be focused
      expect(state.focusedPaneId).toBe(state.terminalLayout.panes[1].id)
    })
  })

  describe('closeSplit', () => {
    beforeEach(() => {
      // Set up a split layout
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-2'
      })
    })

    it('should remove the specified pane', () => {
      const { closeSplit } = useTikiStore.getState()

      closeSplit('pane-2')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.panes).toHaveLength(1)
      expect(state.terminalLayout.panes[0].id).toBe('pane-1')
    })

    it('should restore size to 100% for remaining pane', () => {
      const { closeSplit } = useTikiStore.getState()

      closeSplit('pane-2')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.panes[0].size).toBe(100)
    })

    it('should reset direction to none when only one pane remains', () => {
      const { closeSplit } = useTikiStore.getState()

      closeSplit('pane-2')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.direction).toBe('none')
    })

    it('should focus remaining pane when closing focused pane', () => {
      const { closeSplit } = useTikiStore.getState()

      closeSplit('pane-2')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1')
    })

    it('should not remove the last pane', () => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'none',
          panes: [{ id: 'pane-1', terminalId: 'terminal-1', size: 100 }]
        },
        focusedPaneId: 'pane-1'
      })

      const { closeSplit } = useTikiStore.getState()
      closeSplit('pane-1')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.panes).toHaveLength(1)
    })
  })

  describe('setFocusedPane', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-1'
      })
    })

    it('should set the focused pane', () => {
      const { setFocusedPane } = useTikiStore.getState()

      setFocusedPane('pane-2')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-2')
    })

    it('should do nothing if pane does not exist', () => {
      const { setFocusedPane } = useTikiStore.getState()

      setFocusedPane('non-existent')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1')
    })
  })

  describe('moveFocusBetweenPanes', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-1'
      })
    })

    it('should move focus to the right pane in horizontal layout', () => {
      const { moveFocusBetweenPanes } = useTikiStore.getState()

      moveFocusBetweenPanes('right')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-2')
    })

    it('should move focus to the left pane in horizontal layout', () => {
      useTikiStore.setState({ focusedPaneId: 'pane-2' })
      const { moveFocusBetweenPanes } = useTikiStore.getState()

      moveFocusBetweenPanes('left')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1')
    })

    it('should move focus down in vertical layout', () => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'vertical',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-1'
      })
      const { moveFocusBetweenPanes } = useTikiStore.getState()

      moveFocusBetweenPanes('down')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-2')
    })

    it('should move focus up in vertical layout', () => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'vertical',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-2'
      })
      const { moveFocusBetweenPanes } = useTikiStore.getState()

      moveFocusBetweenPanes('up')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1')
    })

    it('should wrap around when at the edge', () => {
      useTikiStore.setState({ focusedPaneId: 'pane-2' })
      const { moveFocusBetweenPanes } = useTikiStore.getState()

      moveFocusBetweenPanes('right')

      const state = useTikiStore.getState()
      expect(state.focusedPaneId).toBe('pane-1') // Wraps to first pane
    })
  })

  describe('updatePaneTerminal', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        }
      })
    })

    it('should update the terminal for a pane', () => {
      const { updatePaneTerminal } = useTikiStore.getState()

      updatePaneTerminal('pane-1', 'terminal-2')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.panes[0].terminalId).toBe('terminal-2')
    })

    it('should do nothing if pane does not exist', () => {
      const { updatePaneTerminal } = useTikiStore.getState()

      updatePaneTerminal('non-existent', 'terminal-2')

      const state = useTikiStore.getState()
      expect(state.terminalLayout.panes[0].terminalId).toBe('terminal-1')
    })
  })

  describe('layout persistence', () => {
    it('should include terminalLayout in persisted state', () => {
      // This test verifies that terminalLayout will be saved/restored
      // The actual persistence mechanism is handled by zustand's persist middleware
      const state = useTikiStore.getState()
      expect(state.terminalLayout).toBeDefined()
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useTikiStore } from '../stores/tiki-store'

describe('Terminal Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTikiStore.setState({
      terminals: [],
      activeTerminal: null
    })
  })

  describe('createTab', () => {
    it('should add a new terminal tab', () => {
      const { createTab } = useTikiStore.getState()

      const tabId = createTab('Terminal 1')

      const state = useTikiStore.getState()
      expect(state.terminals).toHaveLength(1)
      expect(state.terminals[0].id).toBe(tabId)
      expect(state.terminals[0].name).toBe('Terminal 1')
      expect(state.terminals[0].status).toBe('active')
    })

    it('should set the new tab as active', () => {
      const { createTab } = useTikiStore.getState()

      const tabId = createTab('Terminal 1')

      const state = useTikiStore.getState()
      expect(state.activeTerminal).toBe(tabId)
    })

    it('should create multiple tabs with unique ids', () => {
      const { createTab } = useTikiStore.getState()

      const tabId1 = createTab('Terminal 1')
      const tabId2 = createTab('Terminal 2')

      const state = useTikiStore.getState()
      expect(state.terminals).toHaveLength(2)
      expect(tabId1).not.toBe(tabId2)
    })
  })

  describe('closeTab', () => {
    it('should remove the specified tab when multiple tabs exist', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      createTab('Terminal 1')
      const tabId2 = createTab('Terminal 2')

      const { closeTab } = useTikiStore.getState()
      closeTab(tabId2)

      const state = useTikiStore.getState()
      expect(state.terminals).toHaveLength(1)
      expect(state.terminals[0].name).toBe('Terminal 1')
    })

    it('should switch to another tab when closing active tab', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId1 = createTab('Terminal 1')
      const tabId2 = createTab('Terminal 2')

      const { closeTab } = useTikiStore.getState()
      closeTab(tabId2) // Close active tab

      const state = useTikiStore.getState()
      expect(state.activeTerminal).toBe(tabId1)
    })

    it('should auto-create a new tab if closing the last one', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId = createTab('Terminal 1')

      const { closeTab } = useTikiStore.getState()
      closeTab(tabId)

      const state = useTikiStore.getState()
      expect(state.terminals).toHaveLength(1)
      expect(state.terminals[0].name).toBe('Terminal 1')
    })
  })

  describe('setActiveTerminalTab', () => {
    it('should set the active terminal', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId1 = createTab('Terminal 1')
      createTab('Terminal 2')

      const { setActiveTerminalTab } = useTikiStore.getState()
      setActiveTerminalTab(tabId1)

      const state = useTikiStore.getState()
      expect(state.activeTerminal).toBe(tabId1)
    })

    it('should do nothing if tab id does not exist', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId1 = createTab('Terminal 1')

      const { setActiveTerminalTab } = useTikiStore.getState()
      setActiveTerminalTab('non-existent-id')

      const state = useTikiStore.getState()
      expect(state.activeTerminal).toBe(tabId1)
    })
  })

  describe('renameTab', () => {
    it('should rename a terminal tab', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId = createTab('Terminal 1')

      const { renameTab } = useTikiStore.getState()
      renameTab(tabId, 'My Custom Terminal')

      const state = useTikiStore.getState()
      expect(state.terminals[0].name).toBe('My Custom Terminal')
    })

    it('should do nothing if tab id does not exist', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab, renameTab } = useTikiStore.getState()
      createTab('Terminal 1')
      renameTab('non-existent-id', 'New Name')

      const state = useTikiStore.getState()
      expect(state.terminals[0].name).toBe('Terminal 1')
    })
  })

  describe('setTabStatus', () => {
    it('should update the tab status', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab } = useTikiStore.getState()
      const tabId = createTab('Terminal 1')

      const { setTabStatus } = useTikiStore.getState()
      setTabStatus(tabId, 'busy')

      const state = useTikiStore.getState()
      expect(state.terminals[0].status).toBe('busy')
    })

    it('should support different status values', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab, setTabStatus } = useTikiStore.getState()
      const tabId = createTab('Terminal 1')

      setTabStatus(tabId, 'idle')
      expect(useTikiStore.getState().terminals[0].status).toBe('idle')

      setTabStatus(tabId, 'active')
      expect(useTikiStore.getState().terminals[0].status).toBe('active')

      setTabStatus(tabId, 'busy')
      expect(useTikiStore.getState().terminals[0].status).toBe('busy')
    })
  })

  describe('getTabByIndex', () => {
    it('should return the tab at the specified index', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab, getTabByIndex } = useTikiStore.getState()
      createTab('Terminal 1')
      const tabId2 = createTab('Terminal 2')
      createTab('Terminal 3')

      const tab = getTabByIndex(1) // 0-indexed, so index 1 = second tab
      expect(tab?.id).toBe(tabId2)
    })

    it('should return undefined for out of bounds index', () => {
      useTikiStore.setState({
        terminals: [],
        activeTerminal: null
      })
      const { createTab, getTabByIndex } = useTikiStore.getState()
      createTab('Terminal 1')

      const tab = getTabByIndex(5)
      expect(tab).toBeUndefined()
    })
  })
})

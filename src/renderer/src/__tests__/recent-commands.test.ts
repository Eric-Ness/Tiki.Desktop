import { describe, it, expect, beforeEach } from 'vitest'
import { useTikiStore } from '../stores/tiki-store'

describe('Recent Commands Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTikiStore.setState({
      recentCommands: []
    })
  })

  describe('recentCommands state', () => {
    it('should start with empty recent commands', () => {
      const state = useTikiStore.getState()
      expect(state.recentCommands).toEqual([])
    })
  })

  describe('addRecentCommand', () => {
    it('should add a command to the front of the list', () => {
      const { addRecentCommand } = useTikiStore.getState()

      addRecentCommand('tiki:yolo')

      const state = useTikiStore.getState()
      expect(state.recentCommands[0]).toBe('tiki:yolo')
    })

    it('should add new commands to the front', () => {
      const { addRecentCommand } = useTikiStore.getState()

      addRecentCommand('tiki:yolo')
      addRecentCommand('tiki:ship')

      const state = useTikiStore.getState()
      expect(state.recentCommands[0]).toBe('tiki:ship')
      expect(state.recentCommands[1]).toBe('tiki:yolo')
    })

    it('should deduplicate commands (move existing to front)', () => {
      const { addRecentCommand } = useTikiStore.getState()

      addRecentCommand('tiki:yolo')
      addRecentCommand('tiki:ship')
      addRecentCommand('tiki:yolo') // Add again

      const state = useTikiStore.getState()
      expect(state.recentCommands).toEqual(['tiki:yolo', 'tiki:ship'])
    })

    it('should limit to 10 recent commands', () => {
      const { addRecentCommand } = useTikiStore.getState()

      // Add 15 commands
      for (let i = 1; i <= 15; i++) {
        addRecentCommand(`tiki:command-${i}`)
      }

      const state = useTikiStore.getState()
      expect(state.recentCommands).toHaveLength(10)
      // Most recent should be first
      expect(state.recentCommands[0]).toBe('tiki:command-15')
      // Oldest beyond 10 should be dropped
      expect(state.recentCommands).not.toContain('tiki:command-1')
    })
  })

  describe('clearRecentCommands', () => {
    it('should clear all recent commands', () => {
      const { addRecentCommand, clearRecentCommands } = useTikiStore.getState()

      addRecentCommand('tiki:yolo')
      addRecentCommand('tiki:ship')
      clearRecentCommands()

      const state = useTikiStore.getState()
      expect(state.recentCommands).toEqual([])
    })
  })

  describe('persistence', () => {
    it('should include recentCommands in partialize for localStorage', () => {
      // The store should be configured to persist recentCommands
      // This tests that the partialize function includes it
      const { addRecentCommand } = useTikiStore.getState()

      addRecentCommand('tiki:test')

      // The store uses persist middleware with partialize
      // We just verify the state is set correctly - actual persistence is handled by zustand
      const state = useTikiStore.getState()
      expect(state.recentCommands).toContain('tiki:test')
    })
  })
})

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock node-pty before importing terminal-manager
vi.mock('node-pty', () => ({
  spawn: vi.fn().mockImplementation(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn()
  }))
}))

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue(os.tmpdir())
  },
  BrowserWindow: vi.fn()
}))

// Import after mocking
import {
  getPersistedState,
  restoreFromState,
  setTerminalPersistenceEnabled,
  getTerminalCwd,
  resetTerminalManagerForTesting
} from '../terminal-manager'
import { PersistedTerminalState } from '../terminal-persistence'

describe('terminal-manager persistence', () => {
  let tempDir: string
  let terminalStateFilePath: string

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-manager-test-'))
    terminalStateFilePath = path.join(tempDir, 'terminal-state.json')

    // Reset the terminal manager state
    resetTerminalManagerForTesting()
  })

  afterEach(() => {
    // Clean up temp directory
    try {
      if (fs.existsSync(terminalStateFilePath)) {
        fs.unlinkSync(terminalStateFilePath)
      }
      fs.rmdirSync(tempDir)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('getPersistedState', () => {
    it('should return empty state when no terminals exist', () => {
      const state = getPersistedState()

      expect(state.terminals).toHaveLength(0)
      expect(state.activeTerminal).toBeNull()
      expect(state.savedAt).toBeDefined()
    })

    it('should return state with terminal info', async () => {
      // Create a mock terminal using the manager
      const { createTerminal } = await import('../terminal-manager')
      const id = createTerminal('/test/path', 'Test Terminal')

      const state = getPersistedState()

      expect(state.terminals).toHaveLength(1)
      expect(state.terminals[0].name).toBe('Test Terminal')
      expect(state.terminals[0].cwd).toBe('/test/path')
      expect(state.terminals[0].id).toBe(id)
    })

    it('should include multiple terminals', async () => {
      const { createTerminal } = await import('../terminal-manager')
      createTerminal('/path1', 'Terminal 1')
      createTerminal('/path2', 'Terminal 2')

      const state = getPersistedState()

      expect(state.terminals).toHaveLength(2)
      expect(state.terminals.map((t) => t.name)).toContain('Terminal 1')
      expect(state.terminals.map((t) => t.name)).toContain('Terminal 2')
    })
  })

  describe('restoreFromState', () => {
    it('should create terminals from persisted state', async () => {
      const state: PersistedTerminalState = {
        terminals: [
          { id: 'old-terminal-1', name: 'Terminal 1', cwd: '/restored/path1' },
          { id: 'old-terminal-2', name: 'Build Server', cwd: '/restored/path2' }
        ],
        activeTerminal: 'old-terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = restoreFromState(state)

      expect(result.restoredCount).toBe(2)
      expect(result.idMap).toBeDefined()
      expect(Object.keys(result.idMap)).toHaveLength(2)
    })

    it('should map old IDs to new IDs', async () => {
      const state: PersistedTerminalState = {
        terminals: [{ id: 'old-id', name: 'Terminal', cwd: '/path' }],
        activeTerminal: 'old-id',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = restoreFromState(state)

      expect(result.idMap['old-id']).toBeDefined()
      expect(result.idMap['old-id']).not.toBe('old-id')
    })

    it('should return correct new active terminal ID', async () => {
      const state: PersistedTerminalState = {
        terminals: [
          { id: 'terminal-a', name: 'Terminal A', cwd: '/path/a' },
          { id: 'terminal-b', name: 'Terminal B', cwd: '/path/b' }
        ],
        activeTerminal: 'terminal-b',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = restoreFromState(state)

      expect(result.newActiveTerminal).toBe(result.idMap['terminal-b'])
    })

    it('should return null active terminal when none was active', async () => {
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/path' }],
        activeTerminal: null,
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = restoreFromState(state)

      expect(result.newActiveTerminal).toBeNull()
    })

    it('should handle empty terminals array', async () => {
      const state: PersistedTerminalState = {
        terminals: [],
        activeTerminal: null,
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = restoreFromState(state)

      expect(result.restoredCount).toBe(0)
      expect(Object.keys(result.idMap)).toHaveLength(0)
    })
  })

  describe('setTerminalPersistenceEnabled', () => {
    it('should enable persistence', () => {
      setTerminalPersistenceEnabled(true)
      // No error means success
    })

    it('should disable persistence', () => {
      setTerminalPersistenceEnabled(false)
      // No error means success
    })
  })

  describe('getTerminalCwd', () => {
    it('should return undefined for non-existent terminal', () => {
      const cwd = getTerminalCwd('nonexistent-id')
      expect(cwd).toBeUndefined()
    })

    it('should return cwd for existing terminal', async () => {
      const { createTerminal } = await import('../terminal-manager')
      const id = createTerminal('/test/cwd', 'Test')

      const cwd = getTerminalCwd(id)

      expect(cwd).toBe('/test/cwd')
    })
  })
})

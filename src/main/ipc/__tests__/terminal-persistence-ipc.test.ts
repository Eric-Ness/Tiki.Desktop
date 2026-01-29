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
  BrowserWindow: vi.fn(),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

// Import after mocking
import { terminalPersistence } from '../../services/terminal-persistence'
import * as terminalManager from '../../services/terminal-manager'

describe('terminal persistence IPC handlers', () => {
  let tempDir: string
  let terminalStateFilePath: string

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-ipc-test-'))
    terminalStateFilePath = path.join(tempDir, 'terminal-state.json')

    // Reset terminal manager
    terminalManager.resetTerminalManagerForTesting()

    // Clear any existing persisted state
    terminalPersistence.clear()
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

  describe('terminal:get-persisted-state handler', () => {
    it('should return null when no persisted state exists', () => {
      const result = terminalPersistence.load()
      expect(result).toBeNull()
    })

    it('should return persisted state when it exists', () => {
      const state = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/test/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      terminalPersistence.save(state)

      const result = terminalPersistence.load()

      expect(result).not.toBeNull()
      expect(result!.terminals).toHaveLength(1)
      expect(result!.terminals[0].name).toBe('Terminal 1')
    })
  })

  describe('terminal:restore-session handler', () => {
    it('should restore terminals from persisted state', () => {
      const state = {
        terminals: [
          { id: 'old-terminal-1', name: 'Terminal 1', cwd: '/test/path1' },
          { id: 'old-terminal-2', name: 'Terminal 2', cwd: '/test/path2' }
        ],
        activeTerminal: 'old-terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      terminalPersistence.save(state)

      const loaded = terminalPersistence.load()
      expect(loaded).not.toBeNull()

      const result = terminalManager.restoreFromState(loaded!)

      expect(result.restoredCount).toBe(2)
      expect(Object.keys(result.idMap)).toHaveLength(2)
    })

    it('should return false when no persisted state exists', () => {
      const loaded = terminalPersistence.load()
      expect(loaded).toBeNull()
    })
  })

  describe('terminal:clear-persisted-state handler', () => {
    it('should clear persisted state', () => {
      const state = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/test/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      terminalPersistence.save(state)

      // Verify state exists
      expect(terminalPersistence.load()).not.toBeNull()

      // Clear state
      terminalPersistence.clear()

      // Verify state is cleared
      expect(terminalPersistence.load()).toBeNull()
    })
  })

  describe('terminal:is-restored handler', () => {
    it('should return true for restored terminal', () => {
      const state = {
        terminals: [{ id: 'old-terminal-1', name: 'Terminal 1', cwd: '/test/path' }],
        activeTerminal: 'old-terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      const result = terminalManager.restoreFromState(state)
      const newId = result.idMap['old-terminal-1']

      expect(terminalManager.isTerminalRestored(newId)).toBe(true)
    })

    it('should return false for new terminal', () => {
      const id = terminalManager.createTerminal('/test/path', 'New Terminal')

      expect(terminalManager.isTerminalRestored(id)).toBe(false)
    })

    it('should return false for non-existent terminal', () => {
      expect(terminalManager.isTerminalRestored('nonexistent')).toBe(false)
    })
  })
})

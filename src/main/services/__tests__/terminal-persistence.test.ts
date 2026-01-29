/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  TerminalPersistenceService,
  PersistedTerminalState
} from '../terminal-persistence'

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue(os.tmpdir())
  }
}))

describe('terminal-persistence', () => {
  let tempDir: string
  let terminalStateFilePath: string
  let service: TerminalPersistenceService

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-persistence-test-'))
    terminalStateFilePath = path.join(tempDir, 'terminal-state.json')
    service = new TerminalPersistenceService(terminalStateFilePath)
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

  describe('save', () => {
    it('should save terminal state to file', () => {
      const state: PersistedTerminalState = {
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', cwd: '/home/user/project' },
          { id: 'terminal-2', name: 'Build', cwd: '/home/user/project/src' }
        ],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      service.save(state)

      expect(fs.existsSync(terminalStateFilePath)).toBe(true)
      const savedData = JSON.parse(fs.readFileSync(terminalStateFilePath, 'utf8'))
      expect(savedData.terminals).toHaveLength(2)
      expect(savedData.terminals[0].id).toBe('terminal-1')
      expect(savedData.terminals[0].name).toBe('Terminal 1')
      expect(savedData.terminals[0].cwd).toBe('/home/user/project')
      expect(savedData.activeTerminal).toBe('terminal-1')
      expect(savedData.savedAt).toBe('2024-01-15T12:00:00.000Z')
    })

    it('should overwrite existing state file', () => {
      const initialState: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Old', cwd: '/old/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-14T12:00:00.000Z'
      }
      service.save(initialState)

      const newState: PersistedTerminalState = {
        terminals: [{ id: 'terminal-2', name: 'New', cwd: '/new/path' }],
        activeTerminal: 'terminal-2',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      service.save(newState)

      const savedData = JSON.parse(fs.readFileSync(terminalStateFilePath, 'utf8'))
      expect(savedData.terminals).toHaveLength(1)
      expect(savedData.terminals[0].id).toBe('terminal-2')
      expect(savedData.terminals[0].name).toBe('New')
    })

    it('should save empty terminals array', () => {
      const state: PersistedTerminalState = {
        terminals: [],
        activeTerminal: null,
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      service.save(state)

      const savedData = JSON.parse(fs.readFileSync(terminalStateFilePath, 'utf8'))
      expect(savedData.terminals).toHaveLength(0)
      expect(savedData.activeTerminal).toBeNull()
    })

    it('should handle save errors gracefully', () => {
      // Create service with invalid path
      const invalidService = new TerminalPersistenceService('/nonexistent/path/state.json')
      const state: PersistedTerminalState = {
        terminals: [],
        activeTerminal: null,
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      // Should not throw
      expect(() => invalidService.save(state)).not.toThrow()
    })
  })

  describe('load', () => {
    it('should load terminal state from file', () => {
      const state: PersistedTerminalState = {
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', cwd: '/home/user/project' }
        ],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      fs.writeFileSync(terminalStateFilePath, JSON.stringify(state))

      const loaded = service.load()

      expect(loaded).not.toBeNull()
      expect(loaded!.terminals).toHaveLength(1)
      expect(loaded!.terminals[0].id).toBe('terminal-1')
      expect(loaded!.terminals[0].name).toBe('Terminal 1')
      expect(loaded!.terminals[0].cwd).toBe('/home/user/project')
      expect(loaded!.activeTerminal).toBe('terminal-1')
    })

    it('should return null if file does not exist', () => {
      const loaded = service.load()

      expect(loaded).toBeNull()
    })

    it('should return null for corrupted JSON', () => {
      fs.writeFileSync(terminalStateFilePath, 'invalid json {{{')

      const loaded = service.load()

      expect(loaded).toBeNull()
    })

    it('should return null for invalid state structure', () => {
      fs.writeFileSync(terminalStateFilePath, JSON.stringify({ invalid: 'structure' }))

      const loaded = service.load()

      expect(loaded).toBeNull()
    })

    it('should return null if terminals is not an array', () => {
      fs.writeFileSync(
        terminalStateFilePath,
        JSON.stringify({
          terminals: 'not-an-array',
          activeTerminal: null,
          savedAt: '2024-01-15T12:00:00.000Z'
        })
      )

      const loaded = service.load()

      expect(loaded).toBeNull()
    })

    it('should filter out terminals with missing required fields', () => {
      const state = {
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', cwd: '/valid/path' },
          { id: 'terminal-2', cwd: '/missing/name' }, // missing name
          { name: 'No ID', cwd: '/missing/id' }, // missing id
          { id: 'terminal-4', name: 'No CWD' } // missing cwd
        ],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      fs.writeFileSync(terminalStateFilePath, JSON.stringify(state))

      const loaded = service.load()

      expect(loaded).not.toBeNull()
      expect(loaded!.terminals).toHaveLength(1)
      expect(loaded!.terminals[0].id).toBe('terminal-1')
    })

    it('should handle terminal with optional scrollback', () => {
      const state: PersistedTerminalState = {
        terminals: [
          {
            id: 'terminal-1',
            name: 'Terminal 1',
            cwd: '/home/user/project',
            scrollback: ['line 1', 'line 2']
          }
        ],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      fs.writeFileSync(terminalStateFilePath, JSON.stringify(state))

      const loaded = service.load()

      expect(loaded).not.toBeNull()
      expect(loaded!.terminals[0].scrollback).toEqual(['line 1', 'line 2'])
    })
  })

  describe('clear', () => {
    it('should delete the state file', () => {
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      service.save(state)
      expect(fs.existsSync(terminalStateFilePath)).toBe(true)

      service.clear()

      expect(fs.existsSync(terminalStateFilePath)).toBe(false)
    })

    it('should not throw if file does not exist', () => {
      expect(() => service.clear()).not.toThrow()
    })

    it('should allow loading after clear returns null', () => {
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      service.save(state)
      service.clear()

      const loaded = service.load()

      expect(loaded).toBeNull()
    })
  })

  describe('validation', () => {
    it('should reset activeTerminal to null if it references non-existent terminal', () => {
      const state = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: '/path' }],
        activeTerminal: 'terminal-nonexistent',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      fs.writeFileSync(terminalStateFilePath, JSON.stringify(state))

      const loaded = service.load()

      expect(loaded).not.toBeNull()
      expect(loaded!.activeTerminal).toBeNull()
    })

    it('should keep activeTerminal if it references existing terminal', () => {
      const state = {
        terminals: [
          { id: 'terminal-1', name: 'Terminal 1', cwd: '/path' },
          { id: 'terminal-2', name: 'Terminal 2', cwd: '/path2' }
        ],
        activeTerminal: 'terminal-2',
        savedAt: '2024-01-15T12:00:00.000Z'
      }
      fs.writeFileSync(terminalStateFilePath, JSON.stringify(state))

      const loaded = service.load()

      expect(loaded).not.toBeNull()
      expect(loaded!.activeTerminal).toBe('terminal-2')
    })
  })

  describe('edge cases', () => {
    it('should handle very long terminal names', () => {
      const longName = 'A'.repeat(1000)
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: longName, cwd: '/path' }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      service.save(state)
      const loaded = service.load()

      expect(loaded!.terminals[0].name).toBe(longName)
    })

    it('should handle paths with special characters', () => {
      const specialPath = '/home/user/my project (1)/src'
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: specialPath }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      service.save(state)
      const loaded = service.load()

      expect(loaded!.terminals[0].cwd).toBe(specialPath)
    })

    it('should handle Windows-style paths', () => {
      const windowsPath = 'C:\\Users\\user\\Documents\\project'
      const state: PersistedTerminalState = {
        terminals: [{ id: 'terminal-1', name: 'Terminal 1', cwd: windowsPath }],
        activeTerminal: 'terminal-1',
        savedAt: '2024-01-15T12:00:00.000Z'
      }

      service.save(state)
      const loaded = service.load()

      expect(loaded!.terminals[0].cwd).toBe(windowsPath)
    })
  })
})

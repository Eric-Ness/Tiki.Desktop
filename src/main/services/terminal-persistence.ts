import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { logger } from './logger'

export interface PersistedTerminal {
  id: string
  name: string
  cwd: string
  projectPath: string
  scrollback?: string[]
}

export interface PersistedTerminalState {
  terminals: PersistedTerminal[]
  activeTerminal: string | null
  savedAt: string
}

export class TerminalPersistenceService {
  private storagePath: string

  constructor(storagePath?: string) {
    this.storagePath = storagePath || path.join(app.getPath('userData'), 'terminal-state.json')
  }

  save(state: PersistedTerminalState): void {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(state, null, 2))
    } catch (error) {
      logger.error('Failed to save terminal state:', error)
    }
  }

  load(): PersistedTerminalState | null {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return null
      }

      const data = fs.readFileSync(this.storagePath, 'utf8')
      const parsed = JSON.parse(data)

      // Validate basic structure
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      if (!Array.isArray(parsed.terminals)) {
        return null
      }

      // Filter out invalid terminals (missing required fields)
      const validTerminals = parsed.terminals.filter(
        (t: unknown): t is PersistedTerminal => {
          if (typeof t !== 'object' || t === null) return false
          const record = t as Record<string, unknown>
          return (
            typeof record.id === 'string' &&
            typeof record.name === 'string' &&
            typeof record.cwd === 'string'
          )
        }
      )

      // Validate activeTerminal references an existing terminal
      const terminalIds = new Set(validTerminals.map((t: PersistedTerminal) => t.id))
      const activeTerminal =
        typeof parsed.activeTerminal === 'string' && terminalIds.has(parsed.activeTerminal)
          ? parsed.activeTerminal
          : null

      return {
        terminals: validTerminals,
        activeTerminal,
        savedAt: parsed.savedAt || new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to load terminal state:', error)
      return null
    }
  }

  clear(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        fs.unlinkSync(this.storagePath)
      }
    } catch (error) {
      logger.error('Failed to clear terminal state:', error)
    }
  }
}

// Singleton instance for the application
export const terminalPersistence = new TerminalPersistenceService()

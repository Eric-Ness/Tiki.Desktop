import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { platform } from 'os'
import {
  terminalPersistence,
  PersistedTerminalState,
  PersistedTerminal
} from './terminal-persistence'

export type TerminalStatus = 'idle' | 'running'

export interface TerminalInstance {
  id: string
  name: string
  cwd: string
  process: pty.IPty
  cols: number
  rows: number
  status: TerminalStatus
  idleTimer: ReturnType<typeof setTimeout> | null
  isRestored?: boolean
}

const terminals: Map<string, TerminalInstance> = new Map()
let mainWindow: BrowserWindow | null = null
let terminalCounter = 0
let persistenceEnabled = true
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Debounce delay for transitioning from running to idle
const IDLE_DEBOUNCE_MS = 300
// Debounce delay for saving state (1 second)
const SAVE_DEBOUNCE_MS = 1000

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

export function createTerminal(cwd: string, name?: string): string {
  const id = `terminal-${++terminalCounter}`
  const shell = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as { [key: string]: string }
  })

  const terminal: TerminalInstance = {
    id,
    name: name || `Terminal ${terminalCounter}`,
    cwd,
    process: ptyProcess,
    cols: 80,
    rows: 24,
    status: 'idle',
    idleTimer: null
  }

  // Helper to update and emit status changes
  const updateStatus = (newStatus: TerminalStatus) => {
    if (terminal.status !== newStatus) {
      terminal.status = newStatus
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:status-changed', { id, status: newStatus })
      }
    }
  }

  // Forward data from PTY to renderer and track activity
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', { id, data })
    }

    // Mark as running when data is received
    updateStatus('running')

    // Reset idle timer
    if (terminal.idleTimer) {
      clearTimeout(terminal.idleTimer)
    }

    // Set timer to transition back to idle after debounce period
    terminal.idleTimer = setTimeout(() => {
      updateStatus('idle')
      terminal.idleTimer = null
    }, IDLE_DEBOUNCE_MS)
  })

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', { id, code: exitCode })
    }
    terminals.delete(id)
  })

  terminals.set(id, terminal)

  // Auto-save state after creating terminal
  saveTerminalState()

  return id
}

export function writeTerminal(id: string, data: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.process.write(data)
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.process.resize(cols, rows)
    terminal.cols = cols
    terminal.rows = rows
  }
}

export function killTerminal(id: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    // Clear idle timer if exists
    if (terminal.idleTimer) {
      clearTimeout(terminal.idleTimer)
    }
    terminal.process.kill()
    terminals.delete(id)

    // Auto-save state after killing terminal
    saveTerminalState()
  }
}

export function getTerminalStatus(id: string): TerminalStatus | undefined {
  return terminals.get(id)?.status
}

export function getTerminal(id: string): TerminalInstance | undefined {
  return terminals.get(id)
}

export function renameTerminal(id: string, name: string): boolean {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.name = name
    // Auto-save state after renaming terminal
    saveTerminalState()
    return true
  }
  return false
}

export function getAllTerminals(): TerminalInstance[] {
  return Array.from(terminals.values())
}

export function cleanupAllTerminals(): void {
  for (const terminal of terminals.values()) {
    terminal.process.kill()
  }
  terminals.clear()
}

// ============ Persistence Functions ============

/**
 * Enable or disable terminal persistence
 */
export function setTerminalPersistenceEnabled(enabled: boolean): void {
  persistenceEnabled = enabled
}

/**
 * Get terminal cwd by id
 */
export function getTerminalCwd(id: string): string | undefined {
  return terminals.get(id)?.cwd
}

/**
 * Get the current state of all terminals for persistence
 */
export function getPersistedState(): PersistedTerminalState {
  const persistedTerminals: PersistedTerminal[] = Array.from(terminals.values()).map(
    (terminal) => ({
      id: terminal.id,
      name: terminal.name,
      cwd: terminal.cwd
    })
  )

  return {
    terminals: persistedTerminals,
    activeTerminal: null, // Active terminal is managed by renderer
    savedAt: new Date().toISOString()
  }
}

/**
 * Restore terminals from persisted state
 * Returns mapping of old IDs to new IDs
 */
export function restoreFromState(state: PersistedTerminalState): {
  restoredCount: number
  idMap: Record<string, string>
  newActiveTerminal: string | null
} {
  const idMap: Record<string, string> = {}

  for (const persistedTerminal of state.terminals) {
    const newId = createTerminal(persistedTerminal.cwd, persistedTerminal.name)
    idMap[persistedTerminal.id] = newId

    // Mark terminal as restored
    const terminal = terminals.get(newId)
    if (terminal) {
      terminal.isRestored = true
    }
  }

  const newActiveTerminal = state.activeTerminal ? idMap[state.activeTerminal] || null : null

  return {
    restoredCount: state.terminals.length,
    idMap,
    newActiveTerminal
  }
}

/**
 * Check if a terminal was restored from a previous session
 */
export function isTerminalRestored(id: string): boolean {
  return terminals.get(id)?.isRestored === true
}

/**
 * Save terminal state (debounced)
 */
export function saveTerminalState(): void {
  if (!persistenceEnabled) return

  // Clear existing debounce timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  // Debounce the save
  saveDebounceTimer = setTimeout(() => {
    const state = getPersistedState()
    terminalPersistence.save(state)
    saveDebounceTimer = null
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Save terminal state immediately (for app quit)
 */
export function saveTerminalStateImmediate(): void {
  if (!persistenceEnabled) return

  // Clear any pending debounced save
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }

  const state = getPersistedState()
  terminalPersistence.save(state)
}

/**
 * Load persisted terminal state
 */
export function loadPersistedState(): PersistedTerminalState | null {
  return terminalPersistence.load()
}

/**
 * Clear persisted terminal state
 */
export function clearPersistedState(): void {
  terminalPersistence.clear()
}

/**
 * Reset terminal manager state (for testing)
 */
export function resetTerminalManagerForTesting(): void {
  // Kill all terminals without triggering exit handlers
  for (const terminal of terminals.values()) {
    if (terminal.idleTimer) {
      clearTimeout(terminal.idleTimer)
    }
    try {
      terminal.process.kill()
    } catch {
      // Ignore kill errors in tests
    }
  }
  terminals.clear()
  terminalCounter = 0
  persistenceEnabled = true
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
}

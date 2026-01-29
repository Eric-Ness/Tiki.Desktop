import { ipcMain } from 'electron'
import {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  killTerminal,
  renameTerminal,
  loadPersistedState,
  restoreFromState,
  clearPersistedState,
  isTerminalRestored,
  setTerminalPersistenceEnabled
} from '../services/terminal-manager'

export function registerTerminalHandlers(): void {
  // Create a new terminal
  ipcMain.handle('terminal:create', (_, { cwd, name }: { cwd: string; name?: string }) => {
    return createTerminal(cwd, name)
  })

  // Write data to terminal
  ipcMain.on('terminal:write', (_, { id, data }: { id: string; data: string }) => {
    writeTerminal(id, data)
  })

  // Resize terminal
  ipcMain.on('terminal:resize', (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    resizeTerminal(id, cols, rows)
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', (_, { id }: { id: string }) => {
    killTerminal(id)
  })

  // Rename terminal
  ipcMain.handle('terminal:rename', (_, { id, name }: { id: string; name: string }) => {
    return renameTerminal(id, name)
  })

  // Get persisted terminal state
  ipcMain.handle('terminal:get-persisted-state', () => {
    return loadPersistedState()
  })

  // Restore terminal session from persisted state
  ipcMain.handle('terminal:restore-session', () => {
    const state = loadPersistedState()
    if (state && state.terminals.length > 0) {
      const result = restoreFromState(state)
      return {
        success: true,
        ...result
      }
    }
    return { success: false, restoredCount: 0, idMap: {}, newActiveTerminal: null }
  })

  // Clear persisted terminal state
  ipcMain.handle('terminal:clear-persisted-state', () => {
    clearPersistedState()
    return { success: true }
  })

  // Check if a terminal was restored from a previous session
  ipcMain.handle('terminal:is-restored', (_, { id }: { id: string }) => {
    return isTerminalRestored(id)
  })

  // Enable or disable terminal persistence
  ipcMain.handle('terminal:set-persistence-enabled', (_, { enabled }: { enabled: boolean }) => {
    setTerminalPersistenceEnabled(enabled)
    return { success: true }
  })
}

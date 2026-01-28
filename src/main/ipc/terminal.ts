import { ipcMain } from 'electron'
import {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  killTerminal
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
}

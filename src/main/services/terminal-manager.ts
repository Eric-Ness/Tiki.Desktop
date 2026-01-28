import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { platform } from 'os'

export interface TerminalInstance {
  id: string
  name: string
  cwd: string
  process: pty.IPty
  cols: number
  rows: number
}

const terminals: Map<string, TerminalInstance> = new Map()
let mainWindow: BrowserWindow | null = null
let terminalCounter = 0

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
    rows: 24
  }

  // Forward data from PTY to renderer
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', { id, data })
    }
  })

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', { id, code: exitCode })
    }
    terminals.delete(id)
  })

  terminals.set(id, terminal)
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
    terminal.process.kill()
    terminals.delete(id)
  }
}

export function getTerminal(id: string): TerminalInstance | undefined {
  return terminals.get(id)
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

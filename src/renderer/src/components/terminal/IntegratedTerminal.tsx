/**
 * IntegratedTerminal Component
 *
 * A simplified terminal component for the Development layout, providing a single
 * embedded terminal instance in the bottom pane. Uses xterm.js for terminal emulation
 * with PTY backend communication via IPC.
 *
 * @module components/terminal/IntegratedTerminal
 *
 * ## IPC Dependencies (window.tikiDesktop.terminal)
 *
 * - `create(cwd: string)` - Creates a new PTY session with the specified working directory.
 *   Returns a unique terminal ID used for all subsequent operations.
 *
 * - `write(id: string, data: string)` - Sends user input (keystrokes) to the PTY process.
 *   Called on every xterm.onData event to forward input to the shell.
 *
 * - `resize(id: string, cols: number, rows: number)` - Synchronizes terminal dimensions
 *   with the PTY. Called on initial creation and whenever the container resizes.
 *
 * - `kill(id: string)` - Destroys the PTY session and cleans up resources.
 *   Called during component unmount.
 *
 * - `onData(callback: (id, data) => void)` - Subscribes to PTY output data.
 *   Returns an unsubscribe function. Output is written to xterm for display.
 *
 * ## Terminal Lifecycle
 *
 * 1. **Initialization**:
 *    - Creates XTerm instance with custom dark theme
 *    - Loads FitAddon (responsive sizing) and WebLinksAddon (clickable URLs)
 *    - Opens terminal in container element
 *    - Creates PTY session via IPC with initial resize
 *
 * 2. **Data Flow**:
 *    - User input: xterm.onData -> IPC write -> PTY
 *    - PTY output: IPC onData -> xterm.write -> display
 *
 * 3. **Resize Handling**:
 *    - ResizeObserver monitors container size changes
 *    - FitAddon.fit() recalculates dimensions
 *    - IPC resize syncs PTY with new dimensions
 *
 * 4. **Cleanup**:
 *    - Disposes xterm input listener
 *    - Disconnects ResizeObserver
 *    - Disposes xterm instance
 *    - Kills PTY session via IPC
 *
 * ## XTerm Addons
 *
 * - **FitAddon**: Automatically fits terminal to container size. Essential for
 *   responsive layouts and proper dimension synchronization with PTY.
 *
 * - **WebLinksAddon**: Makes URLs in terminal output clickable, opening in
 *   default browser. Improves UX for CLI tools that output links.
 *
 * ## UI Controls
 *
 * - **Clear button** (RotateCcw): Clears terminal scrollback and viewport
 * - **Minimize/Expand** (ChevronDown/ChevronUp): Toggles terminal content visibility
 *
 * @example
 * ```tsx
 * <IntegratedTerminal cwd="/path/to/project" />
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

interface IntegratedTerminalProps {
  cwd: string
}

export function IntegratedTerminal({ cwd }: IntegratedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const terminalIdRef = useRef<string | null>(null)

  // Keep terminalId ref in sync
  useEffect(() => {
    terminalIdRef.current = terminalId
  }, [terminalId])

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new XTerm({
      theme: {
        background: '#0f0f0f',
        foreground: '#e2e8f0',
        cursor: '#f59e0b',
        cursorAccent: '#0f0f0f',
        selectionBackground: '#f59e0b33',
        black: '#0f0f0f',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#64748b',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc'
      },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)

    // Delay fit to ensure container is sized
    setTimeout(() => fitAddon.fit(), 0)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Create PTY session
    const createSession = async () => {
      try {
        const id = await window.tikiDesktop.terminal.create(cwd)
        setTerminalId(id)
        terminalIdRef.current = id

        // Resize to match terminal dimensions
        window.tikiDesktop.terminal.resize(id, terminal.cols, terminal.rows)
      } catch (error) {
        console.error('Failed to create terminal:', error)
      }
    }

    createSession()

    // Handle user input
    const inputDisposable = terminal.onData((data) => {
      if (terminalIdRef.current) {
        window.tikiDesktop.terminal.write(terminalIdRef.current, data)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        if (terminalIdRef.current) {
          window.tikiDesktop.terminal.resize(
            terminalIdRef.current,
            terminalRef.current.cols,
            terminalRef.current.rows
          )
        }
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      inputDisposable.dispose()
      resizeObserver.disconnect()
      terminal.dispose()
      if (terminalIdRef.current) {
        window.tikiDesktop.terminal.kill(terminalIdRef.current)
      }
    }
  }, [cwd])

  // Subscribe to terminal data
  useEffect(() => {
    if (!terminalId || !terminalRef.current) return

    const unsubscribe = window.tikiDesktop.terminal.onData((id: string, data: string) => {
      if (id === terminalId && terminalRef.current) {
        terminalRef.current.write(data)
      }
    })

    return unsubscribe
  }, [terminalId])

  const handleClear = useCallback(() => {
    terminalRef.current?.clear()
  }, [])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Terminal header */}
      <div className="flex-shrink-0 h-8 px-2 flex items-center justify-between border-b border-border bg-background-secondary">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">TERMINAL</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-white hover:bg-background-tertiary rounded"
            title="Clear terminal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white hover:bg-background-tertiary rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className={`flex-1 ${isMinimized ? 'hidden' : ''}`}
        style={{ padding: '4px 8px' }}
      />
    </div>
  )
}

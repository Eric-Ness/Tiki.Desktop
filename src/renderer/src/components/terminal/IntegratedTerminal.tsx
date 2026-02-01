/**
 * IntegratedTerminal Component
 *
 * A simplified terminal component for the Development layout.
 * Shows a single terminal instance in the bottom pane.
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

import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface TerminalProps {
  terminalId: string | null
  onReady?: () => void
}

export function Terminal({ terminalId, onReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  // Handle resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current && terminalId) {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      window.tikiDesktop.terminal.resize(terminalId, cols, rows)
    }
  }, [terminalId])

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const terminal = new XTerm({
      theme: {
        background: '#0f0f0f',
        foreground: '#e2e8f0',
        cursor: '#f59e0b',
        cursorAccent: '#0f0f0f',
        selectionBackground: '#f59e0b4d',
        black: '#1a1a1a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc'
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    onReady?.()

    return () => {
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [onReady])

  // Handle terminal ID changes (connect/disconnect PTY)
  useEffect(() => {
    if (!terminalRef.current || !terminalId) return

    const terminal = terminalRef.current

    // Send initial size
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = terminal
      window.tikiDesktop.terminal.resize(terminalId, cols, rows)
    }

    // Handle data from PTY
    const cleanupData = window.tikiDesktop.terminal.onData((id, data) => {
      if (id === terminalId) {
        terminal.write(data)
      }
    })

    // Handle PTY exit
    const cleanupExit = window.tikiDesktop.terminal.onExit((id, code) => {
      if (id === terminalId) {
        terminal.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`)
      }
    })

    // Send data to PTY
    const dataDisposable = terminal.onData((data) => {
      window.tikiDesktop.terminal.write(terminalId, data)
    })

    cleanupRef.current = [cleanupData, cleanupExit, () => dataDisposable.dispose()]

    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup())
      cleanupRef.current = []
    }
  }, [terminalId])

  // Handle resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background p-2"
      style={{ minHeight: 0 }}
    />
  )
}

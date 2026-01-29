import { useEffect, useRef, useCallback, useMemo } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useSettingsCategory, TerminalSettings } from '../../hooks/useSettings'

interface RestoredTerminalInfo {
  id: string
  savedAt: string
}

interface TerminalProps {
  terminalId: string | null
  onReady?: () => void
  restoredInfo?: RestoredTerminalInfo
}

// Default terminal settings used when settings haven't loaded yet
const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  fontSize: 13,
  fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 10000,
  copyOnSelect: false,
  shell: ''
}

export function Terminal({ terminalId, onReady, restoredInfo }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const restoredMessageShownRef = useRef(false)
  const isTerminalReadyRef = useRef(false)

  // Get terminal settings from the settings store
  const { settings: terminalSettings } = useSettingsCategory('terminal')

  // Use settings with fallback to defaults
  const effectiveSettings = useMemo(
    () => terminalSettings ?? DEFAULT_TERMINAL_SETTINGS,
    [terminalSettings]
  )

  // Handle resize
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current && terminalId && isTerminalReadyRef.current) {
      try {
        fitAddonRef.current.fit()
        const { cols, rows } = terminalRef.current
        window.tikiDesktop.terminal.resize(terminalId, cols, rows)
      } catch (e) {
        // Terminal may not be fully initialized
        console.debug('Terminal resize skipped:', e)
      }
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
      // Apply terminal settings from user preferences
      fontFamily: effectiveSettings.fontFamily,
      fontSize: effectiveSettings.fontSize,
      lineHeight: 1.2,
      cursorBlink: effectiveSettings.cursorBlink,
      cursorStyle: effectiveSettings.cursorStyle,
      scrollback: effectiveSettings.scrollback,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Delay fit() to ensure terminal is fully initialized
    // xterm.js needs time to set up its internal renderer before dimensions can be calculated
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
        isTerminalReadyRef.current = true
      } catch (e) {
        // Terminal may not be fully ready, will be resized on next resize event
        console.debug('Initial terminal fit skipped:', e)
      }
      onReady?.()
    })

    return () => {
      isTerminalReadyRef.current = false
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [onReady])

  // Apply settings changes to the existing terminal
  // This effect updates terminal options dynamically when settings change
  // without recreating the terminal, avoiding flicker
  useEffect(() => {
    const terminal = terminalRef.current
    const fitAddon = fitAddonRef.current
    if (!terminal) return

    // Update cursor settings - these can be changed dynamically
    terminal.options.cursorStyle = effectiveSettings.cursorStyle
    terminal.options.cursorBlink = effectiveSettings.cursorBlink

    // Update font settings - these can be changed dynamically
    // xterm.js handles font changes gracefully
    terminal.options.fontFamily = effectiveSettings.fontFamily
    terminal.options.fontSize = effectiveSettings.fontSize

    // Update scrollback - this can be changed dynamically
    // Note: Reducing scrollback may truncate existing buffer content
    terminal.options.scrollback = effectiveSettings.scrollback

    // After font changes, we need to re-fit the terminal
    // to recalculate dimensions based on new character size
    if (fitAddon && isTerminalReadyRef.current) {
      // Use requestAnimationFrame to ensure font metrics are calculated
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
          // If connected to a PTY, notify it of the new dimensions
          if (terminalId && terminalRef.current) {
            const { cols, rows } = terminalRef.current
            window.tikiDesktop.terminal.resize(terminalId, cols, rows)
          }
        } catch (e) {
          console.debug('Terminal settings resize skipped:', e)
        }
      })
    }
  }, [effectiveSettings, terminalId])

  // Handle terminal ID changes (connect/disconnect PTY)
  useEffect(() => {
    if (!terminalRef.current || !terminalId) return

    const terminal = terminalRef.current

    // Send initial size
    if (fitAddonRef.current && isTerminalReadyRef.current) {
      try {
        fitAddonRef.current.fit()
        const { cols, rows } = terminal
        window.tikiDesktop.terminal.resize(terminalId, cols, rows)
      } catch (e) {
        console.debug('Terminal initial size skipped:', e)
      }
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

  // Handle focus events from command execution
  useEffect(() => {
    const handleFocus = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      if (customEvent.detail.id === terminalId && terminalRef.current) {
        terminalRef.current.focus()
      }
    }

    window.addEventListener('terminal:focus', handleFocus)
    return () => window.removeEventListener('terminal:focus', handleFocus)
  }, [terminalId])

  // Show "Session restored" message for restored terminals
  useEffect(() => {
    if (
      restoredInfo &&
      terminalRef.current &&
      terminalId &&
      !restoredMessageShownRef.current
    ) {
      restoredMessageShownRef.current = true

      // Format the timestamp
      const savedDate = new Date(restoredInfo.savedAt)
      const formattedDate = savedDate.toLocaleString()

      // Write the session restored message to the terminal
      const message = `\r\n\x1b[36m[Session restored from ${formattedDate}]\x1b[0m\r\n\r\n`
      terminalRef.current.write(message)
    }
  }, [restoredInfo, terminalId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background p-2"
      style={{ minHeight: 0 }}
    />
  )
}

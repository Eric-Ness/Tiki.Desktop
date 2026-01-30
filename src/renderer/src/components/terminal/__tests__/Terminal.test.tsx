import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Terminal } from '../Terminal'

// Track the custom key event handler
let capturedKeyHandler: ((event: KeyboardEvent) => boolean) | null = null

// Mock xterm.js with a factory function - class must be defined inside
vi.mock('@xterm/xterm', () => {
  return {
    Terminal: class MockTerminal {
      options = {}
      cols = 80
      rows = 24

      loadAddon = vi.fn()
      open = vi.fn()
      write = vi.fn()
      onData = vi.fn(() => ({ dispose: vi.fn() }))
      focus = vi.fn()
      dispose = vi.fn()
      attachCustomKeyEventHandler = (handler: (event: KeyboardEvent) => boolean) => {
        capturedKeyHandler = handler
      }
    }
  }
})

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn()
  }
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class {}
}))

// Mock useSettings hook
vi.mock('../../../hooks/useSettings', () => ({
  useSettingsCategory: vi.fn(() => ({
    settings: {
      fontSize: 13,
      fontFamily: 'monospace',
      cursorStyle: 'bar',
      cursorBlink: true,
      scrollback: 10000,
      copyOnSelect: false,
      shell: ''
    }
  }))
}))

// Mock window.tikiDesktop
const mockTikiDesktop = {
  terminal: {
    resize: vi.fn(),
    write: vi.fn(),
    onData: vi.fn(() => vi.fn()),
    onExit: vi.fn(() => vi.fn())
  }
}

// Mock navigator.clipboard
const mockClipboard = {
  readText: vi.fn(() => Promise.resolve('pasted text'))
}

describe('Terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedKeyHandler = null
    ;(window as unknown as { tikiDesktop: typeof mockTikiDesktop }).tikiDesktop = mockTikiDesktop
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('attaches custom key event handler for paste support', () => {
    render(<Terminal terminalId="test-1" />)

    // Verify a handler was captured
    expect(capturedKeyHandler).not.toBeNull()
    expect(typeof capturedKeyHandler).toBe('function')
  })

  it('paste handler returns false for Ctrl+V to prevent default', () => {
    render(<Terminal terminalId="test-1" />)

    expect(capturedKeyHandler).not.toBeNull()

    // Simulate Ctrl+V keydown event
    const ctrlVEvent = {
      ctrlKey: true,
      metaKey: false,
      key: 'v',
      type: 'keydown'
    } as unknown as KeyboardEvent

    const result = capturedKeyHandler!(ctrlVEvent)
    expect(result).toBe(false)
  })

  it('paste handler returns false for Cmd+V (Mac) to prevent default', () => {
    render(<Terminal terminalId="test-1" />)

    expect(capturedKeyHandler).not.toBeNull()

    // Simulate Cmd+V keydown event (Mac)
    const cmdVEvent = {
      ctrlKey: false,
      metaKey: true,
      key: 'v',
      type: 'keydown'
    } as unknown as KeyboardEvent

    const result = capturedKeyHandler!(cmdVEvent)
    expect(result).toBe(false)
  })

  it('paste handler returns true for other keys', () => {
    render(<Terminal terminalId="test-1" />)

    expect(capturedKeyHandler).not.toBeNull()

    // Simulate regular key event
    const regularKeyEvent = {
      ctrlKey: false,
      metaKey: false,
      key: 'a',
      type: 'keydown'
    } as unknown as KeyboardEvent

    const result = capturedKeyHandler!(regularKeyEvent)
    expect(result).toBe(true)
  })
})

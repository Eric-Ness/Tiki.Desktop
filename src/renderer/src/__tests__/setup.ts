import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.tikiDesktop for terminal API
Object.defineProperty(window, 'tikiDesktop', {
  value: {
    terminal: {
      create: vi.fn().mockResolvedValue('mock-terminal-id'),
      kill: vi.fn().mockResolvedValue(undefined),
      write: vi.fn(),
      resize: vi.fn(),
      rename: vi.fn().mockResolvedValue(true),
      onData: vi.fn().mockReturnValue(() => {}),
      onExit: vi.fn().mockReturnValue(() => {}),
      onStatusChange: vi.fn().mockReturnValue(() => {})
    }
  },
  writable: true,
  configurable: true
})

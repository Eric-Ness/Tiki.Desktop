import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver for cmdk and other components
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock scrollIntoView for cmdk
Element.prototype.scrollIntoView = vi.fn()

// Mock window.tikiDesktop for terminal API
Object.defineProperty(window, 'tikiDesktop', {
  value: {
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
    getCwd: vi.fn().mockResolvedValue('/mock/path'),
    getGitBranch: vi.fn().mockResolvedValue('main'),
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

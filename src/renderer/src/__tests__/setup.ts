import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Only run browser-specific setup if we're in a browser environment
// This allows node environment tests (like git-service.test.ts) to skip these mocks
const isBrowserEnv = typeof window !== 'undefined' && typeof Element !== 'undefined'

if (isBrowserEnv) {
  // Mock matchMedia for xterm.js
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
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
        onStatusChange: vi.fn().mockReturnValue(() => {}),
        // Session persistence
        getPersistedState: vi.fn().mockResolvedValue(null),
        restoreSession: vi.fn().mockResolvedValue({
          success: false,
          restoredCount: 0,
          idMap: {},
          newActiveTerminal: null
        }),
        clearPersistedState: vi.fn().mockResolvedValue({ success: true }),
        isRestored: vi.fn().mockResolvedValue(false),
        setPersistenceEnabled: vi.fn().mockResolvedValue({ success: true })
      },
      git: {
        getFileDiff: vi.fn().mockResolvedValue(''),
        getChangedFiles: vi.fn().mockResolvedValue([]),
        getDiffStats: vi.fn().mockResolvedValue({
          files: [],
          totalAdditions: 0,
          totalDeletions: 0,
          totalFiles: 0
        })
      },
      github: {
        checkCli: vi.fn().mockResolvedValue({ available: true, authenticated: true }),
        getIssues: vi.fn().mockResolvedValue([]),
        getIssue: vi.fn().mockResolvedValue(null),
        refresh: vi.fn().mockResolvedValue(undefined),
        openInBrowser: vi.fn().mockResolvedValue(undefined),
        getPRForIssue: vi.fn().mockResolvedValue(null),
        getPRChecks: vi.fn().mockResolvedValue([]),
        onIssuesUpdated: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {})
      },
      shell: {
        openExternal: vi.fn().mockResolvedValue(undefined)
      },
      settings: {
        get: vi.fn().mockResolvedValue({
          appearance: { theme: 'dark', fontSize: 14, fontFamily: 'monospace', accentColor: '#f59e0b' },
          terminal: { fontSize: 14, fontFamily: 'monospace', cursorStyle: 'block', cursorBlink: true, scrollback: 1000, copyOnSelect: false, shell: '' },
          notifications: { enabled: true, sound: true, phaseComplete: true, issuePlanned: true, issueShipped: true, errors: true },
          keyboardShortcuts: { toggleSidebar: 'Ctrl+B', toggleDetailPanel: 'Ctrl+D', commandPalette: 'Ctrl+K', openSettings: 'Ctrl+,', newTerminal: 'Ctrl+T', closeTerminal: 'Ctrl+W' },
          github: { autoRefresh: true, refreshInterval: 60, defaultIssueState: 'open' },
          dataPrivacy: { telemetry: false, crashReports: false, clearDataOnExit: false }
        }),
        set: vi.fn().mockResolvedValue({}),
        reset: vi.fn().mockResolvedValue({}),
        export: vi.fn().mockResolvedValue({ success: true }),
        import: vi.fn().mockResolvedValue({ success: true }),
        onChange: vi.fn().mockReturnValue(() => {})
      },
      usage: {
        addRecord: vi.fn().mockResolvedValue(undefined),
        getSummary: vi.fn().mockResolvedValue({
          totalInputTokens: 0,
          totalOutputTokens: 0,
          estimatedCost: 0,
          recordCount: 0
        }),
        getRecords: vi.fn().mockResolvedValue([]),
        clear: vi.fn().mockResolvedValue(undefined),
        getIssueUsage: vi.fn().mockResolvedValue({
          totalInputTokens: 0,
          totalOutputTokens: 0,
          estimatedCost: 0,
          recordCount: 0
        }),
        getSessionUsage: vi.fn().mockResolvedValue({
          totalInputTokens: 0,
          totalOutputTokens: 0,
          estimatedCost: 0,
          recordCount: 0
        }),
        getDailyUsage: vi.fn().mockResolvedValue([])
      }
    },
    writable: true,
    configurable: true
  })
}

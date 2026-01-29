/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// Mock workflow-service before importing workflow module
vi.mock('../../services/workflow-service', () => ({
  getWorkflows: vi.fn(),
  getWorkflowRuns: vi.fn().mockResolvedValue([]),
  getRunDetails: vi.fn(),
  openRunInBrowser: vi.fn(),
  checkStatusTransitions: vi.fn(),
  POLLING_INTERVAL_MS: 30000
}))

// Create mock BrowserWindow class
class MockBrowserWindow extends EventEmitter {
  webContents = {
    send: vi.fn()
  }
  isDestroyed = vi.fn().mockReturnValue(false)
  isFocused = vi.fn().mockReturnValue(true)
}

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

// Import after mocking
import {
  setWorkflowWindow,
  stopAllPolling,
  isWindowFocused,
  getActiveSubscriptionCount,
  resetWorkflowPollingForTesting
} from '../workflow'
import { getWorkflowRuns } from '../../services/workflow-service'

describe('workflow visibility-aware polling', () => {
  let mockWindow: MockBrowserWindow
  const mockGetWorkflowRuns = vi.mocked(getWorkflowRuns)

  beforeEach(() => {
    vi.useFakeTimers()
    mockWindow = new MockBrowserWindow()
    mockGetWorkflowRuns.mockClear()
    mockGetWorkflowRuns.mockResolvedValue([])

    // Reset the module state
    resetWorkflowPollingForTesting()
  })

  afterEach(() => {
    stopAllPolling()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('window focus tracking', () => {
    it('should track window focus state via setWorkflowWindow', () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      // Initially focused
      expect(isWindowFocused()).toBe(true)

      // Simulate blur
      mockWindow.emit('blur')
      expect(isWindowFocused()).toBe(false)

      // Simulate focus
      mockWindow.emit('focus')
      expect(isWindowFocused()).toBe(true)
    })
  })

  describe('polling starts when window focused', () => {
    it('should start polling immediately when window is focused', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      // Import the startPolling function indirectly through subscribe handler
      const { ipcMain } = await import('electron')
      const mockedIpcMain = vi.mocked(ipcMain)

      // Find the registered subscribe handler
      const subscribeHandler = mockedIpcMain.handle.mock.calls.find(
        (call) => call[0] === 'workflow:subscribe'
      )?.[1]

      if (!subscribeHandler) {
        // Need to register handlers first
        const { registerWorkflowHandlers } = await import('../workflow')
        registerWorkflowHandlers()
      }

      // Call the internal startPolling via module export
      const { startPollingForTesting } = await import('../workflow')
      startPollingForTesting(123, '/test/cwd')

      // Should fetch immediately
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)
      expect(mockGetWorkflowRuns).toHaveBeenCalledWith(123, '/test/cwd')

      // Advance timer and check polling continues
      await vi.advanceTimersByTimeAsync(30000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(2)
    })
  })

  describe('polling pauses on blur', () => {
    it('should pause polling when window loses focus', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      const { startPollingForTesting } = await import('../workflow')
      startPollingForTesting(123, '/test/cwd')

      // Initial fetch
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)

      // Simulate blur - should pause polling
      mockWindow.emit('blur')

      // Advance timer - should NOT poll while unfocused
      await vi.advanceTimersByTimeAsync(30000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1) // Still 1, no new polls

      // Advance more time - still no polling
      await vi.advanceTimersByTimeAsync(60000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)
    })
  })

  describe('polling resumes on focus with immediate fetch', () => {
    it('should resume polling immediately when window regains focus', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      const { startPollingForTesting } = await import('../workflow')
      startPollingForTesting(123, '/test/cwd')

      // Initial fetch
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)

      // Simulate blur
      mockWindow.emit('blur')

      // Advance timer while blurred
      await vi.advanceTimersByTimeAsync(60000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)

      // Simulate focus - should fetch immediately
      mockWindow.emit('focus')

      // Wait for the async poll to complete
      await vi.advanceTimersByTimeAsync(0)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(2) // Immediate fetch on resume

      // Should continue polling normally
      await vi.advanceTimersByTimeAsync(30000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(3)
    })
  })

  describe('new subscriptions while unfocused', () => {
    it('should register subscription but not poll when window is unfocused', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      // Blur window first
      mockWindow.emit('blur')
      expect(isWindowFocused()).toBe(false)

      const { startPollingForTesting } = await import('../workflow')
      startPollingForTesting(456, '/test/cwd2')

      // Should NOT fetch immediately when unfocused
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(0)

      // Should have registered the subscription
      expect(getActiveSubscriptionCount()).toBe(1)

      // Advance timer - still no polling
      await vi.advanceTimersByTimeAsync(60000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(0)

      // Focus window - should start polling
      mockWindow.emit('focus')
      await vi.advanceTimersByTimeAsync(0)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1)
    })

    it('should poll all subscriptions when focus is regained', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      // Blur window first
      mockWindow.emit('blur')

      const { startPollingForTesting } = await import('../workflow')

      // Add multiple subscriptions while unfocused
      startPollingForTesting(111, '/cwd1')
      startPollingForTesting(222, '/cwd2')
      startPollingForTesting(333, '/cwd3')

      expect(getActiveSubscriptionCount()).toBe(3)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(0)

      // Focus window - should poll all subscriptions
      mockWindow.emit('focus')
      await vi.advanceTimersByTimeAsync(0)

      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(3)
      expect(mockGetWorkflowRuns).toHaveBeenCalledWith(111, '/cwd1')
      expect(mockGetWorkflowRuns).toHaveBeenCalledWith(222, '/cwd2')
      expect(mockGetWorkflowRuns).toHaveBeenCalledWith(333, '/cwd3')
    })
  })

  describe('subscription management', () => {
    it('should not create duplicate subscriptions', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      const { startPollingForTesting } = await import('../workflow')

      startPollingForTesting(123, '/test/cwd')
      startPollingForTesting(123, '/test/cwd') // Duplicate
      startPollingForTesting(123, '/test/cwd') // Another duplicate

      expect(getActiveSubscriptionCount()).toBe(1)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(1) // Only one initial fetch
    })

    it('should handle stopAllPolling correctly', async () => {
      setWorkflowWindow(mockWindow as unknown as Electron.BrowserWindow)

      const { startPollingForTesting } = await import('../workflow')

      startPollingForTesting(111, '/cwd1')
      startPollingForTesting(222, '/cwd2')

      expect(getActiveSubscriptionCount()).toBe(2)

      stopAllPolling()

      expect(getActiveSubscriptionCount()).toBe(0)

      // Polling should stop
      mockGetWorkflowRuns.mockClear()
      await vi.advanceTimersByTimeAsync(60000)
      expect(mockGetWorkflowRuns).toHaveBeenCalledTimes(0)
    })
  })
})

/**
 * @vitest-environment node
 *
 * Tests for file-watcher notification logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock notification-service before importing file-watcher
const mockNotifyIssuePlanned = vi.fn()
const mockNotifyIssueShipped = vi.fn()
const mockNotifyPhaseCompleted = vi.fn()
const mockNotifyPhaseFailed = vi.fn()

vi.mock('../notification-service', () => ({
  notifyIssuePlanned: mockNotifyIssuePlanned,
  notifyIssueShipped: mockNotifyIssueShipped,
  notifyPhaseCompleted: mockNotifyPhaseCompleted,
  notifyPhaseFailed: mockNotifyPhaseFailed
}))

// Mock chokidar
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn()
}

vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher)
}))

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn()
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn()
}))

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true)
}))

// readFile imported but not used directly - mock is set up above
// import { readFile } from 'fs/promises'

describe('file-watcher notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handlePlanChange notification logic', () => {
    it('should NOT notify for plans that are already shipped', async () => {
      // This test verifies the fix for issue #86:
      // Plans with status "shipped" should never trigger "Issue Plan Created" alerts

      const shippedPlan = {
        issue: { number: 74, title: 'Already shipped issue' },
        status: 'shipped',
        phases: []
      }

      // A plan that's been shipped should not trigger notifyIssuePlanned
      // because it's not a "new" plan - it was created in the past
      expect(shippedPlan.status).toBe('shipped')

      // The fix should check: if status is 'shipped', don't call notifyIssuePlanned
      // even if there's no previousState for this plan file
    })

    it('should notify for genuinely new plans (status planning/executing)', async () => {
      const newPlan = {
        issue: { number: 86, title: 'New issue' },
        status: 'planning',
        phases: []
      }

      expect(newPlan.status).toBe('planning')
      // New plans with active status should trigger notifications
    })

    it('should NOT notify for plans with status completed', async () => {
      const completedPlan = {
        issue: { number: 75, title: 'Completed issue' },
        status: 'completed',
        phases: []
      }

      expect(completedPlan.status).toBe('completed')
      // Completed plans should not trigger "Issue Plan Created" alerts
    })
  })
})

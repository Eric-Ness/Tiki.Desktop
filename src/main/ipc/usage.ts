import { ipcMain } from 'electron'
import { usageService } from '../services/usage-service'

export function registerUsageHandlers(): void {
  // Add a new usage record
  ipcMain.handle(
    'usage:add-record',
    async (
      _,
      record: {
        inputTokens: number
        outputTokens: number
        model: string
        sessionId: string
        issueNumber?: number
      }
    ) => {
      usageService.addRecord(record)
    }
  )

  // Get usage summary (optionally filtered by date)
  ipcMain.handle('usage:get-summary', async (_, since?: string) => {
    return usageService.getSummary(since ? new Date(since) : undefined)
  })

  // Get all usage records (optionally filtered by date)
  ipcMain.handle('usage:get-records', async (_, since?: string) => {
    return usageService.getRecords(since ? new Date(since) : undefined)
  })

  // Clear all usage history
  ipcMain.handle('usage:clear', async () => {
    usageService.clearHistory()
  })

  // Get usage for a specific issue
  ipcMain.handle('usage:get-issue-usage', async (_, issueNumber: number) => {
    return usageService.getIssueUsage(issueNumber)
  })

  // Get usage for a specific session
  ipcMain.handle('usage:get-session-usage', async (_, sessionId: string) => {
    return usageService.getSessionUsage(sessionId)
  })

  // Get daily usage history (optionally filtered by number of days)
  ipcMain.handle('usage:get-daily-usage', async (_, days?: number) => {
    return usageService.getDailyUsage(days)
  })
}

import { ipcMain } from 'electron'
import { claudeStatsService } from '../services/claude-stats-service'

export function registerClaudeStatsHandlers(): void {
  // Get current plan usage (session + weekly)
  ipcMain.handle(
    'claude-stats:get-plan-usage',
    async (_, options?: { sessionLimit?: number; weeklyLimit?: number }) => {
      return claudeStatsService.getPlanUsage(options?.sessionLimit, options?.weeklyLimit)
    }
  )

  // Get raw stats cache
  ipcMain.handle('claude-stats:get-raw', async () => {
    return claudeStatsService.getRawStats()
  })

  // Get daily token history
  ipcMain.handle('claude-stats:get-daily-tokens', async (_, days?: number) => {
    return claudeStatsService.getDailyTokens(days)
  })

  // Check if Claude stats are available
  ipcMain.handle('claude-stats:is-available', async () => {
    return claudeStatsService.isAvailable()
  })
}

import { ipcMain } from 'electron'
import { claudeStatsService } from '../services/claude-stats-service'
import { claudeApiService } from '../services/claude-api-service'

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

  // ========== Claude API (direct API calls to claude.ai) ==========

  // Fetch usage from Claude.ai API
  ipcMain.handle('claude-api:fetch-usage', async () => {
    return claudeApiService.fetchUsage()
  })

  // Test connection with session key
  ipcMain.handle('claude-api:test-connection', async (_, sessionKey: string) => {
    return claudeApiService.testConnection(sessionKey)
  })

  // Save session key
  ipcMain.handle('claude-api:save-session-key', async (_, sessionKey: string) => {
    claudeApiService.saveSessionKey(sessionKey)
    claudeApiService.clearCache() // Clear cached org ID when key changes
    return true
  })

  // Get session key (masked)
  ipcMain.handle('claude-api:get-session-key', async () => {
    return claudeApiService.getSessionKeyMasked()
  })

  // Check if session key is configured
  ipcMain.handle('claude-api:has-session-key', async () => {
    return claudeApiService.hasSessionKey()
  })

  // Clear session key
  ipcMain.handle('claude-api:clear-session-key', async () => {
    claudeApiService.clearSessionKey()
    return true
  })

  // Get/set usage data source preference
  ipcMain.handle('claude-api:get-data-source', async () => {
    return claudeApiService.getDataSource()
  })

  ipcMain.handle('claude-api:set-data-source', async (_, source: 'files' | 'api') => {
    claudeApiService.setDataSource(source)
    return true
  })
}

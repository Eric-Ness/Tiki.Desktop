/**
 * Claude Stats Service
 *
 * Reads usage statistics from Claude Code's local files:
 * - stats-cache.json for daily/weekly aggregates
 * - Session JSONL files for real-time 5-hour window usage
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'

export interface DailyModelTokens {
  date: string
  tokensByModel: Record<string, number>
}

export interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  webSearchRequests: number
  costUSD: number
  contextWindow: number
  maxOutputTokens: number
}

export interface ClaudeStatsCache {
  version: number
  lastComputedDate: string
  dailyActivity: Array<{
    date: string
    messageCount: number
    sessionCount: number
    toolCallCount: number
  }>
  dailyModelTokens: DailyModelTokens[]
  modelUsage: Record<string, ModelUsage>
  totalSessions: number
  totalMessages: number
  longestSession?: {
    sessionId: string
    duration: number
    messageCount: number
    timestamp: string
  }
  firstSessionDate: string
  hourCounts: Record<string, number>
  totalSpeculationTimeSavedMs: number
}

export interface SessionUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

export interface ClaudePlanUsage {
  // Session usage (5-hour window)
  sessionTokens: number
  sessionLimit: number
  sessionPercent: number
  sessionResetTime: Date

  // Weekly usage
  weeklyTokens: number
  weeklyLimit: number
  weeklyPercent: number
  weeklyResetTime: Date

  // Totals
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCacheCreationTokens: number

  // Metadata
  lastUpdated: string
  dataSource: 'claude-stats' | 'jsonl' | 'none'
}

// Default limits (these are estimates - Anthropic doesn't publish exact numbers)
const DEFAULT_SESSION_LIMIT = 500000
const DEFAULT_WEEKLY_LIMIT = 3500000
const SESSION_HOURS = 5

export class ClaudeStatsService {
  private claudeDir: string
  private statsPath: string
  private cachedStats: ClaudeStatsCache | null = null
  private lastReadTime: number = 0
  private cacheTimeoutMs = 5000 // Re-read file every 5 seconds max

  // Session usage cache
  private cachedSessionUsage: SessionUsage | null = null
  private lastSessionReadTime: number = 0
  private sessionCacheTimeoutMs = 30000 // Re-parse JSONL files every 30 seconds

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude')
    this.statsPath = path.join(this.claudeDir, 'stats-cache.json')
  }

  private readStats(): ClaudeStatsCache | null {
    const now = Date.now()

    // Use cached version if recent enough
    if (this.cachedStats && now - this.lastReadTime < this.cacheTimeoutMs) {
      return this.cachedStats
    }

    try {
      if (!fs.existsSync(this.statsPath)) {
        return null
      }

      const data = fs.readFileSync(this.statsPath, 'utf8')
      this.cachedStats = JSON.parse(data) as ClaudeStatsCache
      this.lastReadTime = now
      return this.cachedStats
    } catch {
      return null
    }
  }

  /**
   * Get the start of the current 5-hour session window
   */
  private getSessionStart(): Date {
    const now = new Date()
    const sessionLengthMs = SESSION_HOURS * 60 * 60 * 1000
    const currentPeriod = Math.floor(now.getTime() / sessionLengthMs)
    return new Date(currentPeriod * sessionLengthMs)
  }

  /**
   * Get the start of the current week (Monday 00:00)
   */
  private getWeekStart(): Date {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(now)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  /**
   * Calculate tokens used since a given date from daily token data
   */
  private getTokensSince(stats: ClaudeStatsCache, since: Date): number {
    const sinceStr = since.toISOString().split('T')[0]

    let total = 0
    for (const day of stats.dailyModelTokens) {
      if (day.date >= sinceStr) {
        for (const tokens of Object.values(day.tokensByModel)) {
          total += tokens
        }
      }
    }

    return total
  }

  /**
   * Find all project directories in ~/.claude/projects/
   */
  private getProjectDirs(): string[] {
    const projectsDir = path.join(this.claudeDir, 'projects')
    if (!fs.existsSync(projectsDir)) {
      return []
    }

    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true })
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => path.join(projectsDir, e.name))
    } catch {
      return []
    }
  }

  /**
   * Find JSONL files modified within the session window
   */
  private getRecentJsonlFiles(sessionStart: Date): string[] {
    const projectDirs = this.getProjectDirs()
    const recentFiles: string[] = []
    const sessionStartMs = sessionStart.getTime()

    for (const dir of projectDirs) {
      try {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue

          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)

          // Include files modified since session start
          if (stat.mtimeMs >= sessionStartMs) {
            recentFiles.push(filePath)
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    return recentFiles
  }

  /**
   * Parse usage data from a JSONL file for entries within the session window
   */
  private async parseJsonlUsage(filePath: string, sessionStart: Date): Promise<SessionUsage> {
    const usage: SessionUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0
    }

    const sessionStartMs = sessionStart.getTime()

    return new Promise((resolve) => {
      try {
        const fileStream = fs.createReadStream(filePath)
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        })

        rl.on('line', (line) => {
          try {
            const entry = JSON.parse(line)

            // Usage data is nested under entry.message.usage for assistant messages
            const usageData = entry.message?.usage || entry.usage

            // Check if this entry has usage data and is within our window
            if (usageData) {
              // Check timestamp if available
              if (entry.timestamp) {
                const entryTime = new Date(entry.timestamp).getTime()
                if (entryTime < sessionStartMs) {
                  return // Skip entries before session start
                }
              }

              // Sum up the usage
              usage.inputTokens += usageData.input_tokens || 0
              usage.outputTokens += usageData.output_tokens || 0
              usage.cacheReadInputTokens += usageData.cache_read_input_tokens || 0
              usage.cacheCreationInputTokens += usageData.cache_creation_input_tokens || 0
            }
          } catch {
            // Skip unparseable lines
          }
        })

        rl.on('close', () => {
          resolve(usage)
        })

        rl.on('error', () => {
          resolve(usage)
        })
      } catch {
        resolve(usage)
      }
    })
  }

  /**
   * Get session usage by parsing recent JSONL files
   */
  async getSessionUsageFromJsonl(): Promise<SessionUsage> {
    const now = Date.now()

    // Use cached version if recent enough
    if (this.cachedSessionUsage && now - this.lastSessionReadTime < this.sessionCacheTimeoutMs) {
      return this.cachedSessionUsage
    }

    const sessionStart = this.getSessionStart()
    const recentFiles = this.getRecentJsonlFiles(sessionStart)

    const totalUsage: SessionUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0
    }

    // Parse all recent files in parallel
    const usagePromises = recentFiles.map((file) => this.parseJsonlUsage(file, sessionStart))
    const usages = await Promise.all(usagePromises)

    for (const usage of usages) {
      totalUsage.inputTokens += usage.inputTokens
      totalUsage.outputTokens += usage.outputTokens
      totalUsage.cacheReadInputTokens += usage.cacheReadInputTokens
      totalUsage.cacheCreationInputTokens += usage.cacheCreationInputTokens
    }

    this.cachedSessionUsage = totalUsage
    this.lastSessionReadTime = now

    return totalUsage
  }

  /**
   * Get current plan usage summary
   */
  async getPlanUsage(
    sessionLimit = DEFAULT_SESSION_LIMIT,
    weeklyLimit = DEFAULT_WEEKLY_LIMIT
  ): Promise<ClaudePlanUsage> {
    const stats = this.readStats()
    const sessionStart = this.getSessionStart()
    const weekStart = this.getWeekStart()

    // Get session usage from JSONL files for accurate 5-hour window
    const sessionUsage = await this.getSessionUsageFromJsonl()
    // Only count input + output tokens against the limit
    // Cache read/creation tokens are "free" and don't count against plan limits
    const sessionTokens = sessionUsage.inputTokens + sessionUsage.outputTokens

    if (!stats) {
      const sessionEnd = new Date(sessionStart.getTime() + SESSION_HOURS * 60 * 60 * 1000)
      const weeklyReset = new Date(weekStart)
      weeklyReset.setDate(weeklyReset.getDate() + 7)

      return {
        sessionTokens,
        sessionLimit,
        sessionPercent: Math.min(100, (sessionTokens / sessionLimit) * 100),
        sessionResetTime: sessionEnd,
        weeklyTokens: 0,
        weeklyLimit,
        weeklyPercent: 0,
        weeklyResetTime: weeklyReset,
        totalInputTokens: sessionUsage.inputTokens,
        totalOutputTokens: sessionUsage.outputTokens,
        totalCacheReadTokens: sessionUsage.cacheReadInputTokens,
        totalCacheCreationTokens: sessionUsage.cacheCreationInputTokens,
        lastUpdated: new Date().toISOString(),
        dataSource: sessionTokens > 0 ? 'jsonl' : 'none'
      }
    }

    const weeklyTokens = this.getTokensSince(stats, weekStart)

    // Calculate totals from modelUsage
    let totalInput = 0
    let totalOutput = 0
    let totalCacheRead = 0
    let totalCacheCreation = 0

    for (const usage of Object.values(stats.modelUsage)) {
      totalInput += usage.inputTokens
      totalOutput += usage.outputTokens
      totalCacheRead += usage.cacheReadInputTokens
      totalCacheCreation += usage.cacheCreationInputTokens
    }

    const sessionEnd = new Date(sessionStart.getTime() + SESSION_HOURS * 60 * 60 * 1000)

    // Weekly reset is next Monday
    const weeklyReset = new Date(weekStart)
    weeklyReset.setDate(weeklyReset.getDate() + 7)

    return {
      sessionTokens,
      sessionLimit,
      sessionPercent: Math.min(100, (sessionTokens / sessionLimit) * 100),
      sessionResetTime: sessionEnd,
      weeklyTokens,
      weeklyLimit,
      weeklyPercent: Math.min(100, (weeklyTokens / weeklyLimit) * 100),
      weeklyResetTime: weeklyReset,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCacheReadTokens: totalCacheRead,
      totalCacheCreationTokens: totalCacheCreation,
      lastUpdated: stats.lastComputedDate,
      dataSource: sessionTokens > 0 ? 'jsonl' : 'claude-stats'
    }
  }

  /**
   * Get raw stats cache for advanced usage
   */
  getRawStats(): ClaudeStatsCache | null {
    return this.readStats()
  }

  /**
   * Get daily token history
   */
  getDailyTokens(days?: number): DailyModelTokens[] {
    const stats = this.readStats()
    if (!stats) return []

    let data = stats.dailyModelTokens

    if (days) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      data = data.filter((d) => d.date >= cutoffStr)
    }

    return data
  }

  /**
   * Check if Claude stats file exists
   */
  isAvailable(): boolean {
    return fs.existsSync(this.statsPath) || this.getProjectDirs().length > 0
  }
}

export const claudeStatsService = new ClaudeStatsService()

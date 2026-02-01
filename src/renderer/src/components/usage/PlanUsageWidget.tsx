import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Settings, Zap } from 'lucide-react'
import { logger } from '../../lib/logger'

interface ClaudePlanUsage {
  // 5-hour limit (API only)
  fiveHourPercent?: number
  fiveHourResetsAt?: string | null
  // Weekly usage
  weeklyPercent: number
  weeklyResetsAt?: string | null
  // Additional limits (API only)
  opusPercent?: number
  opusResetsAt?: string | null
  sonnetPercent?: number
  sonnetResetsAt?: string | null
  // Token totals (files only)
  weeklyTokens?: number
  weeklyLimit?: number
  totalInputTokens?: number
  totalOutputTokens?: number
  totalCacheReadTokens?: number
  // Meta
  lastUpdated: string
  dataSource: 'files' | 'api'
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`
  }
  return tokens.toString()
}

function formatResetTime(resetsAt: string | null | undefined): string {
  if (!resetsAt) return 'Unknown'
  const date = new Date(resetsAt)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return 'Resetting soon'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h`
  }

  return `${hours}h ${minutes}m`
}

export function PlanUsageWidget() {
  const [usage, setUsage] = useState<ClaudePlanUsage | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<'files' | 'api'>('files')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const refreshFromFiles = useCallback(async () => {
    const available = await window.tikiDesktop.claudeStats.isAvailable()
    if (!available) {
      setIsAvailable(false)
      return
    }

    const data = await window.tikiDesktop.claudeStats.getPlanUsage()
    setUsage({
      weeklyPercent: data.weeklyPercent,
      weeklyTokens: data.weeklyTokens,
      weeklyLimit: data.weeklyLimit,
      totalInputTokens: data.totalInputTokens,
      totalOutputTokens: data.totalOutputTokens,
      totalCacheReadTokens: data.totalCacheReadTokens,
      lastUpdated: data.lastUpdated,
      dataSource: 'files'
    })
    setIsAvailable(true)
    setApiError(null)
  }, [])

  const refreshFromApi = useCallback(async () => {
    try {
      const data = await window.tikiDesktop.claudeStats.fetchFromApi()
      setUsage({
        fiveHourPercent: data.fiveHour?.utilization,
        fiveHourResetsAt: data.fiveHour?.resetsAt,
        weeklyPercent: data.sevenDay?.utilization ?? 0,
        weeklyResetsAt: data.sevenDay?.resetsAt,
        opusPercent: data.sevenDayOpus?.utilization,
        opusResetsAt: data.sevenDayOpus?.resetsAt,
        sonnetPercent: data.sevenDaySonnet?.utilization,
        sonnetResetsAt: data.sevenDaySonnet?.resetsAt,
        lastUpdated: new Date().toISOString(),
        dataSource: 'api'
      })
      setIsAvailable(true)
      setApiError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch from API'
      setApiError(errorMsg)
      logger.error('Claude API error:', err)
      // Fall back to files
      await refreshFromFiles()
    }
  }, [refreshFromFiles])

  const refresh = useCallback(async () => {
    try {
      const source = await window.tikiDesktop.claudeStats.getDataSource()
      const hasKey = await window.tikiDesktop.claudeStats.hasSessionKey()
      setDataSource(source)
      setHasApiKey(hasKey)

      if (source === 'api' && hasKey) {
        await refreshFromApi()
      } else {
        await refreshFromFiles()
      }
    } catch (err) {
      logger.error('Failed to fetch Claude stats:', err)
      setIsAvailable(false)
    }
  }, [refreshFromApi, refreshFromFiles])

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }, [refresh])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  // Don't render if stats aren't available
  if (isAvailable === false) {
    return (
      <div className="text-xs text-slate-500" title="Claude Code stats not found">
        No stats
      </div>
    )
  }

  if (!usage) {
    return <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getUsageTextColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400'
    if (percent >= 70) return 'text-amber-400'
    return 'text-emerald-400'
  }

  // Primary display: 5-hour if from API, weekly otherwise
  const primaryPercent =
    usage.dataSource === 'api' && usage.fiveHourPercent !== undefined
      ? usage.fiveHourPercent
      : usage.weeklyPercent

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        title={
          usage.dataSource === 'api'
            ? 'Claude usage (from API)'
            : 'Claude Max weekly usage (from local files)'
        }
      >
        <div className="flex items-center gap-1.5">
          {usage.dataSource === 'api' && (
            <Zap className="w-3 h-3 text-amber-400" title="Live API data" />
          )}
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor(primaryPercent)} transition-all`}
              style={{ width: `${Math.min(primaryPercent, 100)}%` }}
            />
          </div>
          <span className={getUsageTextColor(primaryPercent)}>{primaryPercent.toFixed(0)}%</span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-background-secondary border border-border rounded-lg shadow-xl p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-slate-200">Claude Usage</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                title="Refresh usage data"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {usage.dataSource === 'api' ? (
                <div className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Zap className="w-2.5 h-2.5" />
                  API
                </div>
              ) : (
                <div className="text-[10px] text-emerald-500">Files</div>
              )}
            </div>
          </div>

          {apiError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {apiError}
            </div>
          )}

          {/* API Mode: Show all limits */}
          {usage.dataSource === 'api' && (
            <>
              {/* 5-Hour Limit */}
              {usage.fiveHourPercent !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">5-Hour Limit</span>
                    <span className={getUsageTextColor(usage.fiveHourPercent)}>
                      {usage.fiveHourPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(usage.fiveHourPercent)} transition-all`}
                      style={{ width: `${Math.min(usage.fiveHourPercent, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Resets in: {formatResetTime(usage.fiveHourResetsAt)}
                  </div>
                </div>
              )}

              {/* 7-Day Limit */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">7-Day Limit</span>
                  <span className={getUsageTextColor(usage.weeklyPercent)}>
                    {usage.weeklyPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(usage.weeklyPercent)} transition-all`}
                    style={{ width: `${Math.min(usage.weeklyPercent, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Resets in: {formatResetTime(usage.weeklyResetsAt)}
                </div>
              </div>

              {/* Opus Limit */}
              {usage.opusPercent !== undefined && usage.opusPercent > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">7-Day Opus</span>
                    <span className={getUsageTextColor(usage.opusPercent)}>
                      {usage.opusPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(usage.opusPercent)} transition-all`}
                      style={{ width: `${Math.min(usage.opusPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sonnet Limit */}
              {usage.sonnetPercent !== undefined && usage.sonnetPercent > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">7-Day Sonnet</span>
                    <span className={getUsageTextColor(usage.sonnetPercent)}>
                      {usage.sonnetPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getUsageColor(usage.sonnetPercent)} transition-all`}
                      style={{ width: `${Math.min(usage.sonnetPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Files Mode: Show token totals */}
          {usage.dataSource === 'files' && (
            <>
              {/* Weekly Usage */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Weekly</span>
                  <span className={getUsageTextColor(usage.weeklyPercent)}>
                    {usage.weeklyTokens !== undefined && usage.weeklyLimit !== undefined
                      ? `${formatTokenCount(usage.weeklyTokens)} / ${formatTokenCount(usage.weeklyLimit)}`
                      : `${usage.weeklyPercent.toFixed(1)}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(usage.weeklyPercent)} transition-all`}
                    style={{ width: `${Math.min(usage.weeklyPercent, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {usage.weeklyPercent.toFixed(1)}% used - Rolling 7-day window
                </div>
              </div>

              {/* Token Breakdown */}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                  All-Time Totals
                </div>
                {usage.totalInputTokens !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Input tokens</span>
                    <span className="text-slate-300">
                      {formatTokenCount(usage.totalInputTokens)}
                    </span>
                  </div>
                )}
                {usage.totalOutputTokens !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Output tokens</span>
                    <span className="text-slate-300">
                      {formatTokenCount(usage.totalOutputTokens)}
                    </span>
                  </div>
                )}
                {usage.totalCacheReadTokens !== undefined && usage.totalCacheReadTokens > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cache read</span>
                    <span className="text-slate-300">
                      {formatTokenCount(usage.totalCacheReadTokens)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Data source info & settings link */}
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <div className="text-[10px] text-slate-500">
              {usage.dataSource === 'api' ? 'Source: Claude.ai API' : 'Source: ~/.claude/ files'}
            </div>
            <button
              onClick={() => {
                // Navigate to settings - you can customize this based on your app's navigation
                window.dispatchEvent(
                  new CustomEvent('navigate-to-settings', { detail: { section: 'claude-api' } })
                )
              }}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Configure data source"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {/* Hint if no API key configured */}
          {dataSource === 'files' && !hasApiKey && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400">
              Tip: Configure a session key in Settings to get real-time usage data from Claude.ai
            </div>
          )}
        </div>
      )}
    </div>
  )
}

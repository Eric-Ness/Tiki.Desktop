import { useState, useEffect } from 'react'
import { logger } from '../../lib/logger'

interface ClaudePlanUsage {
  sessionTokens: number
  sessionLimit: number
  sessionPercent: number
  sessionResetTime: Date
  weeklyTokens: number
  weeklyLimit: number
  weeklyPercent: number
  weeklyResetTime: Date
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCacheCreationTokens: number
  lastUpdated: string
  dataSource: 'claude-stats' | 'none'
}

function formatTimeRemaining(resetTime: Date): string {
  const ms = new Date(resetTime).getTime() - Date.now()
  if (ms <= 0) return 'now'

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
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

export function PlanUsageWidget() {
  const [usage, setUsage] = useState<ClaudePlanUsage | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const refresh = async () => {
      try {
        const available = await window.tikiDesktop.claudeStats.isAvailable()
        setIsAvailable(available)

        if (available) {
          const data = await window.tikiDesktop.claudeStats.getPlanUsage()
          setUsage(data)
        }
      } catch (err) {
        logger.error('Failed to fetch Claude stats:', err)
        setIsAvailable(false)
      }
    }

    refresh()
    const interval = setInterval(refresh, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Don't render if Claude stats aren't available
  if (isAvailable === false) {
    return (
      <div className="text-xs text-slate-500" title="Claude Code stats not found">
        No stats
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="text-xs text-slate-500 animate-pulse">
        Loading...
      </div>
    )
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        title="Claude Max plan usage (from ~/.claude/stats-cache.json)"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor(usage.sessionPercent)} transition-all`}
              style={{ width: `${usage.sessionPercent}%` }}
            />
          </div>
          <span className={getUsageTextColor(usage.sessionPercent)}>
            {usage.sessionPercent.toFixed(0)}%
          </span>
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
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-background-secondary border border-border rounded-lg shadow-xl p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-slate-200">Claude Max Usage</div>
            {usage.dataSource === 'claude-stats' && (
              <div className="text-[10px] text-emerald-500">Live</div>
            )}
          </div>

          {/* Session Usage (Today) */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Today</span>
              <span className={getUsageTextColor(usage.sessionPercent)}>
                {formatTokenCount(usage.sessionTokens)} / {formatTokenCount(usage.sessionLimit)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(usage.sessionPercent)} transition-all`}
                style={{ width: `${usage.sessionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
              <span>{usage.sessionPercent.toFixed(1)}% used</span>
              <span>Resets in {formatTimeRemaining(usage.sessionResetTime)}</span>
            </div>
          </div>

          {/* Weekly Usage */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Weekly</span>
              <span className={getUsageTextColor(usage.weeklyPercent)}>
                {formatTokenCount(usage.weeklyTokens)} / {formatTokenCount(usage.weeklyLimit)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(usage.weeklyPercent)} transition-all`}
                style={{ width: `${usage.weeklyPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
              <span>{usage.weeklyPercent.toFixed(1)}% used</span>
              <span>Resets {formatTimeRemaining(usage.weeklyResetTime)}</span>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
              All-Time Totals
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Input tokens</span>
              <span className="text-slate-300">{formatTokenCount(usage.totalInputTokens)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Output tokens</span>
              <span className="text-slate-300">{formatTokenCount(usage.totalOutputTokens)}</span>
            </div>
            {usage.totalCacheReadTokens > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cache read</span>
                <span className="text-slate-300">{formatTokenCount(usage.totalCacheReadTokens)}</span>
              </div>
            )}
          </div>

          {/* Data source info */}
          <div className="border-t border-border pt-2 mt-2">
            <div className="text-[10px] text-slate-500">
              Source: ~/.claude/stats-cache.json
            </div>
            <div className="text-[10px] text-slate-500">
              Last updated: {usage.lastUpdated}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

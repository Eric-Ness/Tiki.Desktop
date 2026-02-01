import { useState, useEffect, useMemo } from 'react'

interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

interface PlanLimits {
  sessionTokenLimit: number
  weeklyTokenLimit: number
  sessionResetHours: number
}

const DEFAULT_LIMITS: PlanLimits = {
  sessionTokenLimit: 500000,
  weeklyTokenLimit: 3500000,
  sessionResetHours: 5
}

function getSessionStart(): Date {
  const now = new Date()
  const sessionLength = DEFAULT_LIMITS.sessionResetHours * 60 * 60 * 1000
  const currentPeriod = Math.floor(now.getTime() / sessionLength)
  return new Date(currentPeriod * sessionLength)
}

function getWeekStart(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function PlanUsageWidget() {
  const [sessionUsage, setSessionUsage] = useState<UsageSummary | null>(null)
  const [weeklyUsage, setWeeklyUsage] = useState<UsageSummary | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const refresh = async () => {
      const sessionStart = getSessionStart()
      const weekStart = getWeekStart()

      const [sessionResult, weeklyResult] = await Promise.all([
        window.tikiDesktop.usage.getSummary(sessionStart.toISOString()),
        window.tikiDesktop.usage.getSummary(weekStart.toISOString())
      ])

      setSessionUsage(sessionResult)
      setWeeklyUsage(weeklyResult)

      const sessionEnd =
        sessionStart.getTime() + DEFAULT_LIMITS.sessionResetHours * 60 * 60 * 1000
      setTimeRemaining(Math.max(0, sessionEnd - Date.now()))
    }

    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const sessionStart = getSessionStart()
      const sessionEnd =
        sessionStart.getTime() + DEFAULT_LIMITS.sessionResetHours * 60 * 60 * 1000
      setTimeRemaining(Math.max(0, sessionEnd - Date.now()))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const sessionTokens = useMemo(() => {
    if (!sessionUsage) return 0
    return sessionUsage.totalInputTokens + sessionUsage.totalOutputTokens
  }, [sessionUsage])

  const weeklyTokens = useMemo(() => {
    if (!weeklyUsage) return 0
    return weeklyUsage.totalInputTokens + weeklyUsage.totalOutputTokens
  }, [weeklyUsage])

  const sessionPercent = Math.min(100, (sessionTokens / DEFAULT_LIMITS.sessionTokenLimit) * 100)
  const weeklyPercent = Math.min(100, (weeklyTokens / DEFAULT_LIMITS.weeklyTokenLimit) * 100)

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
        title="Claude plan usage"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor(sessionPercent)} transition-all`}
              style={{ width: `${sessionPercent}%` }}
            />
          </div>
          <span className={getUsageTextColor(sessionPercent)}>{sessionPercent.toFixed(0)}%</span>
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
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-background-secondary border border-border rounded-lg shadow-xl p-3 z-50">
          <div className="text-xs font-medium text-slate-200 mb-3">Claude Plan Usage</div>

          {/* Session Usage */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Session</span>
              <span className={getUsageTextColor(sessionPercent)}>
                {(sessionTokens / 1000).toFixed(0)}K / {(DEFAULT_LIMITS.sessionTokenLimit / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(sessionPercent)} transition-all`}
                style={{ width: `${sessionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
              <span>{sessionPercent.toFixed(1)}% used</span>
              <span>Resets in {formatTimeRemaining(timeRemaining)}</span>
            </div>
          </div>

          {/* Weekly Usage */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Weekly</span>
              <span className={getUsageTextColor(weeklyPercent)}>
                {(weeklyTokens / 1000).toFixed(0)}K / {(DEFAULT_LIMITS.weeklyTokenLimit / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(weeklyPercent)} transition-all`}
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
              <span>{weeklyPercent.toFixed(1)}% used</span>
              <span>Resets Monday</span>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Est. Cost (Session)</span>
              <span className="text-slate-300">${sessionUsage?.estimatedCost.toFixed(2) ?? '0.00'}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-400">Est. Cost (Weekly)</span>
              <span className="text-slate-300">${weeklyUsage?.estimatedCost.toFixed(2) ?? '0.00'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

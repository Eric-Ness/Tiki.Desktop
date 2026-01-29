import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

interface DailyUsage {
  date: string
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

type TimePeriod = 'today' | 'week' | 'month' | 'all'

export function UsagePanel() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [period, setPeriod] = useState<TimePeriod>('today')
  const [isClearing, setIsClearing] = useState(false)

  const getSinceDate = useCallback((p: TimePeriod): string | undefined => {
    const now = new Date()
    switch (p) {
      case 'today':
        now.setHours(0, 0, 0, 0)
        return now.toISOString()
      case 'week':
        now.setDate(now.getDate() - 7)
        now.setHours(0, 0, 0, 0)
        return now.toISOString()
      case 'month':
        now.setDate(now.getDate() - 30)
        now.setHours(0, 0, 0, 0)
        return now.toISOString()
      case 'all':
        return undefined
    }
  }, [])

  const getDays = useCallback((p: TimePeriod): number | undefined => {
    switch (p) {
      case 'today':
        return 1
      case 'week':
        return 7
      case 'month':
        return 30
      case 'all':
        return undefined
    }
  }, [])

  const refresh = useCallback(async () => {
    const [summaryResult, dailyResult] = await Promise.all([
      window.tikiDesktop.usage.getSummary(getSinceDate(period)),
      window.tikiDesktop.usage.getDailyUsage(getDays(period))
    ])
    setSummary(summaryResult)
    setDailyUsage(dailyResult)
  }, [period, getSinceDate, getDays])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleClear = async () => {
    setIsClearing(true)
    try {
      await window.tikiDesktop.usage.clear()
      await refresh()
    } finally {
      setIsClearing(false)
    }
  }

  const totalTokens = summary
    ? summary.totalInputTokens + summary.totalOutputTokens
    : 0

  // Find max for chart scaling
  const maxTokens = Math.max(
    ...dailyUsage.map((d) => d.totalInputTokens + d.totalOutputTokens),
    1
  )

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Usage Statistics</h2>
        <button
          onClick={handleClear}
          disabled={isClearing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
          aria-label="Clear History"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </button>
      </div>

      {/* Time Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              period === p
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} />
        <StatCard label="Input Tokens" value={summary?.totalInputTokens.toLocaleString() ?? '0'} />
        <StatCard label="Output Tokens" value={summary?.totalOutputTokens.toLocaleString() ?? '0'} />
        <StatCard label="Estimated Cost" value={`$${summary?.estimatedCost.toFixed(2) ?? '0.00'}`} />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="API Calls" value={summary?.recordCount.toLocaleString() ?? '0'} />
        <StatCard
          label="Avg Tokens/Call"
          value={
            summary && summary.recordCount > 0
              ? Math.round(totalTokens / summary.recordCount).toLocaleString()
              : '0'
          }
        />
      </div>

      {/* Daily Usage Chart */}
      {dailyUsage.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400">Daily Usage</h3>
          <div className="space-y-1">
            {dailyUsage.map((day) => {
              const dayTotal = day.totalInputTokens + day.totalOutputTokens
              const percentage = (dayTotal / maxTokens) * 100
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0">{day.date}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-500/50"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {dayTotal.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-200">{value}</div>
    </div>
  )
}

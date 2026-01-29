import { useState, useEffect } from 'react'

interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

export function UsageWidget() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)

  useEffect(() => {
    const refresh = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const result = await window.tikiDesktop.usage.getSummary(today.toISOString())
      setSummary(result)
    }

    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalTokens = summary
    ? summary.totalInputTokens + summary.totalOutputTokens
    : 0

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>{totalTokens.toLocaleString()} tokens</span>
      <span className="text-slate-500">~${summary?.estimatedCost.toFixed(2) ?? '0.00'}</span>
    </div>
  )
}

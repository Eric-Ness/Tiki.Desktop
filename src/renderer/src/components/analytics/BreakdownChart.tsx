import { useMemo } from 'react'

export interface BreakdownDataItem {
  label: string
  value: number
  percentage: number
}

export interface BreakdownChartProps {
  data: Array<BreakdownDataItem>
  title?: string
  loading?: boolean
}

// Color gradient from amber to slate based on position
const getBarColor = (index: number, total: number): string => {
  // Gradient from amber-500 to amber-700 to slate-500
  if (total <= 1) return 'bg-amber-500'
  const position = index / (total - 1)
  if (position < 0.33) return 'bg-amber-500'
  if (position < 0.66) return 'bg-amber-600'
  return 'bg-amber-700'
}

export function BreakdownChart({
  data,
  title,
  loading = false
}: BreakdownChartProps) {
  // Sort data by value descending
  const sortedData = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.value - a.value)
  }, [data])

  if (loading) {
    return (
      <div
        data-testid="breakdown-chart-loading"
        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
      >
        {title && (
          <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
        )}
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-slate-700 rounded w-24" />
              <div className="h-6 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        data-testid="breakdown-chart-empty"
        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
      >
        {title && (
          <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
        )}
        <div className="flex items-center justify-center text-slate-500 h-32">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="breakdown-chart"
      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
    >
      {title && (
        <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
      )}

      <div className="space-y-3">
        {sortedData.map((item, index) => (
          <div key={item.label} data-testid={`breakdown-item-${index}`}>
            {/* Label row */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-slate-300 truncate flex-1 mr-2">
                {item.label}
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">{item.value}</span>
                <span className="text-slate-500 w-12 text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                data-testid={`breakdown-bar-${index}`}
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(index, sortedData.length)}`}
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

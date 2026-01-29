import type { ReactNode } from 'react'

export interface MetricCardProps {
  title: string
  value: number | string
  unit?: string
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  unit,
  delta,
  deltaLabel,
  icon,
  loading = false
}: MetricCardProps) {
  const getDeltaColor = (delta: number): string => {
    if (delta > 0) return 'text-green-400'
    if (delta < 0) return 'text-red-400'
    return 'text-slate-400'
  }

  const formatDelta = (delta: number): string => {
    if (delta > 0) return `+${delta}%`
    if (delta < 0) return `${delta}%`
    return '0%'
  }

  const DeltaArrow = ({ delta }: { delta: number }) => {
    if (delta > 0) {
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      )
    }
    if (delta < 0) {
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      )
    }
    return null
  }

  return (
    <div
      data-testid="metric-card"
      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            {title}
          </h3>

          {loading ? (
            <div data-testid="metric-loading" className="animate-pulse">
              <div className="h-8 bg-slate-700 rounded w-20 mb-2" />
              {delta !== undefined && (
                <div className="h-4 bg-slate-700 rounded w-16" />
              )}
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{value}</span>
                {unit && <span className="text-sm text-slate-400">{unit}</span>}
              </div>

              {delta !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <span
                    data-testid="metric-delta"
                    className={`flex items-center gap-0.5 text-sm ${getDeltaColor(delta)}`}
                  >
                    <DeltaArrow delta={delta} />
                    {formatDelta(delta)}
                  </span>
                  {deltaLabel && (
                    <span className="text-xs text-slate-500">{deltaLabel}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {icon && (
          <div data-testid="metric-icon" className="text-slate-500 ml-2">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

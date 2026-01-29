interface CostBreakdownProps {
  breakdown: {
    planning: number
    execution: number
    verification: number
    fixes: number
  }
  totalTokens: number
}

interface BreakdownSegment {
  key: keyof CostBreakdownProps['breakdown']
  label: string
  color: string
  bgColor: string
}

const segments: BreakdownSegment[] = [
  { key: 'planning', label: 'Planning', color: 'bg-blue-500', bgColor: 'bg-blue-500/20' },
  { key: 'execution', label: 'Execution', color: 'bg-green-500', bgColor: 'bg-green-500/20' },
  { key: 'verification', label: 'Verification', color: 'bg-purple-500', bgColor: 'bg-purple-500/20' },
  { key: 'fixes', label: 'Fixes', color: 'bg-red-500', bgColor: 'bg-red-500/20' }
]

export function CostBreakdown({ breakdown, totalTokens }: CostBreakdownProps) {
  // Calculate percentages
  const getPercentage = (value: number): number => {
    if (totalTokens === 0) return 0
    return Math.round((value / totalTokens) * 100)
  }

  // Format token count
  const formatTokens = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`
    }
    return count.toString()
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 font-medium">Token Breakdown</div>

      {/* Stacked bar chart */}
      <div
        className="h-4 rounded-full overflow-hidden flex bg-slate-700/50"
        role="img"
        aria-label="Token breakdown chart"
      >
        {segments.map((segment) => {
          const percentage = getPercentage(breakdown[segment.key])
          if (percentage === 0) return null
          return (
            <div
              key={segment.key}
              className={`${segment.color} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
              title={`${segment.label}: ${percentage}%`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {segments.map((segment) => {
          const value = breakdown[segment.key]
          const percentage = getPercentage(value)
          return (
            <div
              key={segment.key}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${segment.color}`} />
                <span className="text-slate-400">{segment.label}</span>
              </div>
              <span className="text-slate-300">
                {formatTokens(value)} ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

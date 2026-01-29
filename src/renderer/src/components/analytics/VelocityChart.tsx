import { useMemo } from 'react'

export interface VelocityChartProps {
  data: Array<{ date: string; value: number }>
  title?: string
  height?: number
  color?: string
  loading?: boolean
}

export function VelocityChart({
  data,
  title,
  height = 200,
  color = '#f59e0b', // amber-500
  loading = false
}: VelocityChartProps) {
  const padding = { top: 20, right: 20, bottom: 30, left: 45 }

  const { points, yLabels, xLabels, pathD, areaD } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], yLabels: [], xLabels: [], pathD: '', areaD: '' }
    }

    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)

    // Add some padding to the range
    const range = max - min || 1
    const paddedMin = Math.max(0, min - range * 0.1)
    const paddedMax = max + range * 0.1

    // Calculate chart dimensions
    const chartHeight = height - padding.top - padding.bottom

    // Calculate points as percentages
    const calculatedPoints = data.map((d, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50
      const y = ((paddedMax - d.value) / (paddedMax - paddedMin)) * chartHeight + padding.top
      return { x, y, ...d }
    })

    // Generate Y-axis labels (5 labels)
    const yLabelCount = 5
    const yLabelValues = Array.from({ length: yLabelCount }, (_, i) => {
      return paddedMin + (paddedMax - paddedMin) * (1 - i / (yLabelCount - 1))
    })

    // Generate X-axis labels (show first, middle, and last dates)
    const xLabelData: Array<{ date: string; x: number }> = []
    if (data.length > 0) {
      xLabelData.push({ date: data[0].date, x: 0 })
      if (data.length > 2) {
        const midIndex = Math.floor(data.length / 2)
        xLabelData.push({ date: data[midIndex].date, x: 50 })
      }
      if (data.length > 1) {
        xLabelData.push({ date: data[data.length - 1].date, x: 100 })
      }
    }

    // Generate path for line
    let linePath = ''
    let areaPath = ''
    if (calculatedPoints.length > 0) {
      linePath = calculatedPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}`)
        .join(' ')

      // Area path: line + close to bottom
      const bottomY = chartHeight + padding.top
      areaPath = linePath + ` L 100% ${bottomY} L 0% ${bottomY} Z`
    }

    return {
      points: calculatedPoints,
      yLabels: yLabelValues,
      xLabels: xLabelData,
      pathD: linePath,
      areaD: areaPath
    }
  }, [data, height, padding.top, padding.bottom])

  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toFixed(0)
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div
        data-testid="velocity-chart-loading"
        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
      >
        {title && (
          <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
        )}
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        data-testid="velocity-chart-empty"
        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
      >
        {title && (
          <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
        )}
        <div
          className="flex items-center justify-center text-slate-500"
          style={{ height }}
        >
          No data available
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="velocity-chart"
      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
    >
      {title && (
        <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
      )}

      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div
          className="absolute left-0 top-0 flex flex-col justify-between text-xs text-slate-500"
          style={{
            height: height - padding.bottom,
            paddingTop: padding.top
          }}
        >
          {yLabels.map((value, i) => (
            <span key={i} className="leading-none">
              {formatValue(value)}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <svg
          className="w-full h-full"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          style={{ marginLeft: padding.left }}
        >
          {/* Grid lines */}
          {yLabels.map((_, i) => {
            const y = padding.top + (i / (yLabels.length - 1)) * (height - padding.top - padding.bottom)
            return (
              <line
                key={i}
                x1="0%"
                y1={y}
                x2="100%"
                y2={y}
                stroke="#334155"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {/* Area fill */}
          <path
            d={areaD}
            fill={color}
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={`${point.x}%`}
              cy={point.y}
              r="4"
              fill={color}
              stroke="#1e293b"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className="hover:r-6 transition-all"
            >
              <title>{`${formatDate(point.date)}: ${point.value}`}</title>
            </circle>
          ))}
        </svg>

        {/* X-axis labels */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500"
          style={{ marginLeft: padding.left, marginRight: padding.right }}
        >
          {xLabels.map((label, i) => (
            <span key={i}>{formatDate(label.date)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export interface Insight {
  id: string
  type: 'positive' | 'improvement' | 'warning'
  category: string
  title: string
  description: string
  priority: number
}

export interface InsightsPanelProps {
  insights: Insight[]
  loading?: boolean
}

const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
)

const LightbulbIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
)

const WarningIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
)

const getIconComponent = (type: Insight['type']) => {
  switch (type) {
    case 'positive':
      return CheckIcon
    case 'improvement':
      return LightbulbIcon
    case 'warning':
      return WarningIcon
  }
}

const getIconColorClass = (type: Insight['type']): string => {
  switch (type) {
    case 'positive':
      return 'text-green-400'
    case 'improvement':
      return 'text-amber-400'
    case 'warning':
      return 'text-red-400'
  }
}

const getGroupLabel = (type: Insight['type']): string => {
  switch (type) {
    case 'positive':
      return 'What\'s Going Well'
    case 'improvement':
      return 'Areas for Improvement'
    case 'warning':
      return 'Warnings'
  }
}

export function InsightsPanel({ insights, loading = false }: InsightsPanelProps) {
  if (loading) {
    return (
      <div data-testid="insights-panel-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} data-testid="insights-skeleton" className="animate-pulse mb-4">
            <div className="h-4 bg-slate-700 rounded w-32 mb-2" />
            <div className="bg-slate-800/50 rounded-lg p-3 mb-2">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div
        data-testid="insights-panel-empty"
        className="text-center py-8 text-slate-400"
      >
        <svg
          className="w-12 h-12 mx-auto mb-3 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p>No insights available</p>
      </div>
    )
  }

  // Group insights by type
  const groupedInsights = insights.reduce(
    (acc, insight) => {
      if (!acc[insight.type]) {
        acc[insight.type] = []
      }
      acc[insight.type].push(insight)
      return acc
    },
    {} as Record<Insight['type'], Insight[]>
  )

  // Define order of groups
  const typeOrder: Insight['type'][] = ['positive', 'improvement', 'warning']

  return (
    <div data-testid="insights-panel">
      {typeOrder.map((type) => {
        const insightsOfType = groupedInsights[type]
        if (!insightsOfType || insightsOfType.length === 0) {
          return null
        }

        return (
          <div key={type} data-testid={`insights-group-${type}`} className="mb-4">
            <h3
              data-testid={`insights-header-${type}`}
              className="text-sm font-semibold text-slate-300 mb-2"
            >
              {getGroupLabel(type)}
            </h3>
            {insightsOfType.map((insight) => {
              const IconComponent = getIconComponent(insight.type)
              return (
                <div
                  key={insight.id}
                  data-testid={`insight-card-${insight.id}`}
                  className="bg-slate-800/50 rounded-lg p-3 mb-2"
                >
                  <div className="flex items-start gap-2">
                    <span
                      data-testid={`insight-icon-${insight.type}-${insight.id}`}
                      className={`flex-shrink-0 mt-0.5 ${getIconColorClass(insight.type)}`}
                    >
                      <IconComponent />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

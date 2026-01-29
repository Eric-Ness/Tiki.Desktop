import { useState, useEffect } from 'react'

interface BudgetSettings {
  dailyBudget: number | null
  weeklyBudget: number | null
  warnThreshold: number
}

interface BudgetData {
  settings: BudgetSettings
  dailySpend: number
  weeklySpend: number
}

interface BudgetTrackerProps {
  cwd: string
  estimatedCost?: number
}

export function BudgetTracker({ cwd, estimatedCost }: BudgetTrackerProps) {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchBudget = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await window.tikiDesktop.prediction.getBudget(cwd)
        if (mounted) {
          setBudgetData(data)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch budget')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchBudget()

    return () => {
      mounted = false
    }
  }, [cwd])

  if (loading) {
    return (
      <div className="p-3 flex items-center justify-center" data-testid="budget-loading">
        <div className="flex items-center gap-2 text-slate-400">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xs">Loading budget...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3" data-testid="budget-error">
        <div className="flex items-center gap-2 text-red-400">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className="text-xs">{error}</span>
        </div>
      </div>
    )
  }

  if (!budgetData) {
    return null
  }

  const { settings, dailySpend, weeklySpend } = budgetData
  const { dailyBudget, weeklyBudget } = settings

  // Check if any budget is configured
  const hasBudget = dailyBudget !== null || weeklyBudget !== null

  if (!hasBudget) {
    return (
      <div className="p-3" data-testid="budget-not-configured">
        <div className="text-xs text-slate-500 text-center">
          No budget configured.{' '}
          <button
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={() => {
              // TODO: Open settings
            }}
            data-testid="configure-budget-link"
          >
            Set budget limits
          </button>
        </div>
      </div>
    )
  }

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(2)}`
  }

  const calculatePercentage = (spent: number, budget: number | null): number => {
    if (!budget || budget <= 0) return 0
    return Math.min((spent / budget) * 100, 100)
  }

  const getProgressColor = (percentage: number, wouldExceed: boolean): string => {
    if (wouldExceed) return 'bg-red-500'
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const dailyPercentage = calculatePercentage(dailySpend, dailyBudget)
  const weeklyPercentage = calculatePercentage(weeklySpend, weeklyBudget)

  // Calculate projected spend after this issue
  const projectedDaily = dailySpend + (estimatedCost || 0)
  const projectedWeekly = weeklySpend + (estimatedCost || 0)

  const dailyWouldExceed = dailyBudget !== null && projectedDaily > dailyBudget
  const weeklyWouldExceed = weeklyBudget !== null && projectedWeekly > weeklyBudget

  const projectedDailyPercentage = calculatePercentage(projectedDaily, dailyBudget)
  const projectedWeeklyPercentage = calculatePercentage(projectedWeekly, weeklyBudget)

  return (
    <div className="p-3 space-y-3" data-testid="budget-tracker">
      {/* Daily Budget */}
      {dailyBudget !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Daily Budget</span>
            <span className="text-xs text-slate-300" data-testid="daily-usage">
              {formatCost(dailySpend)} / {formatCost(dailyBudget)}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(dailyPercentage, dailyWouldExceed)}`}
              style={{ width: `${dailyPercentage}%` }}
              data-testid="daily-progress"
            />
          </div>
          <div className="text-xs text-slate-500" data-testid="daily-percentage">
            {dailyPercentage.toFixed(0)}% used
          </div>
          {estimatedCost !== undefined && estimatedCost > 0 && (
            <div
              className={`text-xs ${dailyWouldExceed ? 'text-red-400' : 'text-slate-400'}`}
              data-testid="daily-projected"
            >
              After this issue: {formatCost(projectedDaily)} ({projectedDailyPercentage.toFixed(0)}%)
              {dailyWouldExceed && (
                <span className="ml-1 font-medium" data-testid="daily-exceed-warning">
                  - Exceeds budget!
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Weekly Budget */}
      {weeklyBudget !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Weekly Budget</span>
            <span className="text-xs text-slate-300" data-testid="weekly-usage">
              {formatCost(weeklySpend)} / {formatCost(weeklyBudget)}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressColor(weeklyPercentage, weeklyWouldExceed)}`}
              style={{ width: `${weeklyPercentage}%` }}
              data-testid="weekly-progress"
            />
          </div>
          <div className="text-xs text-slate-500" data-testid="weekly-percentage">
            {weeklyPercentage.toFixed(0)}% used
          </div>
          {estimatedCost !== undefined && estimatedCost > 0 && (
            <div
              className={`text-xs ${weeklyWouldExceed ? 'text-red-400' : 'text-slate-400'}`}
              data-testid="weekly-projected"
            >
              After this issue: {formatCost(projectedWeekly)} ({projectedWeeklyPercentage.toFixed(0)}
              %)
              {weeklyWouldExceed && (
                <span className="ml-1 font-medium" data-testid="weekly-exceed-warning">
                  - Exceeds budget!
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Budget Warning */}
      {(dailyWouldExceed || weeklyWouldExceed) && (
        <div
          className="flex items-start gap-2 p-2 rounded bg-red-900/20 border border-red-500/30"
          data-testid="budget-warning"
        >
          <svg
            className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="text-xs text-red-300">
            This issue would exceed your{' '}
            {dailyWouldExceed && weeklyWouldExceed
              ? 'daily and weekly'
              : dailyWouldExceed
                ? 'daily'
                : 'weekly'}{' '}
            budget. Consider breaking it into smaller tasks.
          </div>
        </div>
      )}
    </div>
  )
}

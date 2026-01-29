import { useState, useEffect } from 'react'
import { CostBreakdown } from './CostBreakdown'
import { BudgetTracker } from './BudgetTracker'

interface CostPredictionData {
  estimatedTokens: {
    low: number
    expected: number
    high: number
  }
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  factors: PredictionFactor[]
  comparisons: {
    vsAverage: number
    vsSimilar: number | null
    vsRecent: number | null
  }
  breakdown: {
    planning: number
    execution: number
    verification: number
    fixes: number
  }
  similarIssues: Array<{
    number: number
    title: string
    actualCost: number
    similarity: number
  }>
}

interface PredictionFactor {
  name: string
  impact: 'increases' | 'decreases' | 'neutral'
  weight: number
  reason: string
}

interface CachedPrediction {
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  cachedAt: number
}

interface CostPredictionProps {
  cwd: string
  issue: {
    number: number
    title: string
    body?: string
    labels?: Array<{ name: string }>
  }
  plan?: {
    phases: Array<{ files: string[]; verification: string[] }>
  }
  onPredictionLoaded?: (prediction: CachedPrediction) => void
}

export function CostPrediction({ cwd, issue, plan, onPredictionLoaded }: CostPredictionProps) {
  const [prediction, setPrediction] = useState<CostPredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHighCost, setIsHighCost] = useState(false)
  const [averageCost, setAverageCost] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchPrediction = async () => {
      setLoading(true)
      setError(null)

      try {
        let result: CostPredictionData
        if (plan) {
          result = await window.tikiDesktop.prediction.estimatePlan(cwd, plan, issue)
        } else {
          result = await window.tikiDesktop.prediction.estimateIssue(cwd, issue)
        }

        if (mounted) {
          setPrediction(result)

          // Check if this is a high cost issue
          try {
            const highCost = await window.tikiDesktop.prediction.isHighCost(cwd, {
              estimatedCost: result.estimatedCost,
              confidence: result.confidence,
              cachedAt: Date.now()
            })
            if (mounted) {
              setIsHighCost(highCost)
            }

            // Get average cost for comparison
            const avgData = await window.tikiDesktop.prediction.getAverageCost(cwd)
            if (mounted && avgData.average !== null) {
              setAverageCost(avgData.average)
            }
          } catch {
            // Silently fail for high cost check - non-critical
          }

          // Notify parent of loaded prediction for caching
          if (onPredictionLoaded) {
            onPredictionLoaded({
              estimatedCost: result.estimatedCost,
              confidence: result.confidence,
              cachedAt: Date.now()
            })
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to get prediction')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchPrediction()

    return () => {
      mounted = false
    }
  }, [cwd, issue.number, plan, onPredictionLoaded])

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center" data-testid="prediction-loading">
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
          <span className="text-sm">Estimating cost...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4" data-testid="prediction-error">
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
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!prediction) {
    return null
  }

  const confidenceColors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(2)}`
  }

  const formatComparison = (ratio: number): string => {
    if (ratio === 1) return 'Same as average'
    if (ratio < 1) return `${((1 - ratio) * 100).toFixed(0)}% below average`
    return `${ratio.toFixed(1)}x average`
  }

  const totalTokens =
    prediction.breakdown.planning +
    prediction.breakdown.execution +
    prediction.breakdown.verification +
    prediction.breakdown.fixes

  return (
    <div className="p-4 space-y-4" data-testid="cost-prediction">
      {/* High Cost Warning Banner */}
      {isHighCost && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30"
          data-testid="high-cost-banner"
        >
          <svg
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-400">High Cost Estimate</div>
            <div className="text-xs text-slate-300 mt-0.5">
              This issue is estimated to cost more than your average.
              {averageCost !== null && prediction.comparisons.vsAverage > 1 && (
                <span>
                  {' '}
                  ({prediction.comparisons.vsAverage.toFixed(1)}x your typical issue cost)
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Consider breaking into smaller issues or reviewing the scope.
            </div>
          </div>
        </div>
      )}

      {/* Cost Range */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Estimated Cost</span>
          <span
            className={`text-xs px-2 py-0.5 rounded border ${confidenceColors[prediction.confidence]}`}
            data-testid="confidence-badge"
          >
            {prediction.confidence} confidence
          </span>
        </div>
        <div className="text-lg font-medium text-slate-200" data-testid="cost-range">
          {formatCost(prediction.estimatedCost.low)} - {formatCost(prediction.estimatedCost.high)}
          <span className="text-amber-400 ml-2">
            (expected: ~{formatCost(prediction.estimatedCost.expected)})
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {prediction.estimatedTokens.expected.toLocaleString()} tokens expected
        </div>
      </div>

      {/* Token Breakdown */}
      <CostBreakdown breakdown={prediction.breakdown} totalTokens={totalTokens} />

      {/* Contributing Factors */}
      {prediction.factors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">Contributing Factors</div>
          <div className="space-y-1">
            {prediction.factors.map((factor, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
                data-testid="prediction-factor"
              >
                <span
                  className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded ${
                    factor.impact === 'increases'
                      ? 'bg-red-500/20 text-red-400'
                      : factor.impact === 'decreases'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {factor.impact === 'increases' ? '+' : factor.impact === 'decreases' ? '-' : '='}
                </span>
                <div>
                  <span className="text-slate-300">{factor.name}</span>
                  <span className="text-slate-500 ml-1">- {factor.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparisons */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-medium">Comparisons</div>
        <div className="flex flex-wrap gap-2">
          <div
            className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300"
            data-testid="comparison-average"
          >
            {formatComparison(prediction.comparisons.vsAverage)}
          </div>
          {prediction.comparisons.vsSimilar !== null && (
            <div
              className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300"
              data-testid="comparison-similar"
            >
              {prediction.comparisons.vsSimilar.toFixed(1)}x similar issues
            </div>
          )}
          {prediction.comparisons.vsRecent !== null && (
            <div
              className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300"
              data-testid="comparison-recent"
            >
              {prediction.comparisons.vsRecent.toFixed(1)}x recent average
            </div>
          )}
        </div>
      </div>

      {/* Similar Issues */}
      {prediction.similarIssues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">Similar Issues</div>
          <div className="space-y-1">
            {prediction.similarIssues.slice(0, 3).map((issue) => (
              <div
                key={issue.number}
                className="flex items-center justify-between text-xs"
                data-testid="similar-issue"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-500">#{issue.number}</span>
                  <span className="text-slate-300 truncate">{issue.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-amber-400">{formatCost(issue.actualCost)}</span>
                  <span className="text-slate-500">
                    {Math.round(issue.similarity * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Tracker */}
      <div className="border-t border-slate-700 pt-3 -mx-4 px-4">
        <div className="text-xs text-slate-400 font-medium mb-2">Budget Status</div>
        <BudgetTracker cwd={cwd} estimatedCost={prediction.estimatedCost.expected} />
      </div>
    </div>
  )
}

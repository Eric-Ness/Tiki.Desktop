interface CostPredictionData {
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  factors?: Array<{
    name: string
    impact: 'increases' | 'decreases' | 'neutral'
    weight: number
    reason: string
  }>
}

interface HighCostWarningProps {
  prediction: CostPredictionData
  averageCost: number | null
  onProceed: () => void
  onReview: () => void
  onCancel: () => void
}

export function HighCostWarning({
  prediction,
  averageCost,
  onProceed,
  onReview,
  onCancel
}: HighCostWarningProps) {
  const expectedCost = prediction.estimatedCost.expected
  const multiplier = averageCost && averageCost > 0 ? expectedCost / averageCost : null

  // Get factors that increase cost
  const increasingFactors =
    prediction.factors?.filter((f) => f.impact === 'increases').slice(0, 3) || []

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(2)}`
  }

  return (
    <div
      className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 space-y-4"
      data-testid="high-cost-warning"
    >
      {/* Warning Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-amber-400"
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
        </div>
        <div className="flex-1">
          <h3 className="text-amber-400 font-medium text-sm" data-testid="warning-title">
            High Cost Estimate
          </h3>
          <p className="text-slate-300 text-sm mt-1" data-testid="warning-message">
            This issue is estimated to cost{' '}
            <span className="font-medium text-amber-400">{formatCost(expectedCost)}</span>
            {multiplier !== null && multiplier > 1 && (
              <span>
                , which is{' '}
                <span className="font-medium text-amber-400">{multiplier.toFixed(1)}x</span> higher
                than your average
              </span>
            )}
            .
          </p>
        </div>
      </div>

      {/* Cost Range */}
      <div className="bg-slate-800/50 rounded px-3 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Estimated range:</span>
          <span className="text-slate-200" data-testid="cost-range">
            {formatCost(prediction.estimatedCost.low)} - {formatCost(prediction.estimatedCost.high)}
          </span>
        </div>
      </div>

      {/* Contributing Factors */}
      {increasingFactors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">Top cost factors:</div>
          <div className="space-y-1">
            {increasingFactors.map((factor, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
                data-testid="cost-factor"
              >
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded bg-red-500/20 text-red-400">
                  +
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

      {/* Suggestions */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-medium">Suggestions:</div>
        <ul className="space-y-1 text-xs text-slate-300">
          <li className="flex items-start gap-2" data-testid="suggestion-break">
            <span className="text-blue-400">-</span>
            <span>Consider breaking into smaller issues</span>
          </li>
          <li className="flex items-start gap-2" data-testid="suggestion-scope">
            <span className="text-blue-400">-</span>
            <span>Review and narrow the scope first</span>
          </li>
          <li className="flex items-start gap-2" data-testid="suggestion-limit">
            <span className="text-blue-400">-</span>
            <span>Set a cost limit for this execution</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onProceed}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          data-testid="proceed-button"
        >
          Proceed Anyway
        </button>
        <button
          onClick={onReview}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-slate-600 hover:bg-slate-500 text-white transition-colors"
          data-testid="review-button"
        >
          Review Scope
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

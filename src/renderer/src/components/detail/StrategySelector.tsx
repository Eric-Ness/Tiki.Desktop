/**
 * StrategySelector Component
 *
 * Displays available retry strategies sorted by confidence, with the
 * recommended (highest confidence) strategy highlighted.
 */
import type { RetryStrategy, RetryAction } from '../../../../preload/index'

interface StrategySelectorProps {
  strategies: RetryStrategy[]
  onSelect: (strategy: RetryStrategy) => void
  disabled?: boolean
}

// Action type icons and colors
const actionConfig: Record<
  RetryAction,
  { icon: JSX.Element; color: string; label: string }
> = {
  redo: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    color: 'text-cyan-400',
    label: 'Redo'
  },
  'redo-with-context': {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'text-blue-400',
    label: 'Redo + Context'
  },
  skip: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      </svg>
    ),
    color: 'text-amber-400',
    label: 'Skip'
  },
  'rollback-and-redo': {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
    ),
    color: 'text-purple-400',
    label: 'Rollback + Redo'
  },
  manual: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    color: 'text-orange-400',
    label: 'Manual'
  }
}

// Confidence badge colors based on confidence level
function getConfidenceBadgeStyle(confidence: number): string {
  if (confidence >= 0.8) {
    return 'bg-green-600 text-green-100'
  } else if (confidence >= 0.5) {
    return 'bg-amber-600 text-amber-100'
  } else {
    return 'bg-slate-600 text-slate-200'
  }
}

// Format confidence as percentage
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// Star icon for recommended strategy
function StarIcon() {
  return (
    <svg
      className="w-4 h-4 text-amber-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

// Strategy card component
function StrategyCard({
  strategy,
  isRecommended,
  onSelect,
  disabled
}: {
  strategy: RetryStrategy
  isRecommended: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const action = actionConfig[strategy.action]
  const confidenceBadgeStyle = getConfidenceBadgeStyle(strategy.confidence)

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${
          isRecommended
            ? 'bg-slate-800/70 border-cyan-600 hover:border-cyan-500'
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/50 cursor-pointer'}
      `}
      data-testid="strategy-card"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={action.color}>{action.icon}</span>
          <span className="text-sm font-medium text-slate-100">{strategy.name}</span>
          {isRecommended && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30">
              <StarIcon />
              Recommended
            </span>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceBadgeStyle}`}
          data-testid="confidence-badge"
        >
          {formatConfidence(strategy.confidence)}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-2">{strategy.description}</p>

      {/* Action type label */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${action.color}`}>{action.label}</span>
        {strategy.contextHints && strategy.contextHints.length > 0 && (
          <span className="text-xs text-slate-500">
            +{strategy.contextHints.length} context{' '}
            {strategy.contextHints.length === 1 ? 'hint' : 'hints'}
          </span>
        )}
      </div>
    </button>
  )
}

export function StrategySelector({ strategies, onSelect, disabled }: StrategySelectorProps) {
  // Strategies are expected to be sorted by confidence (highest first)
  // The first one is the recommended strategy
  const recommendedStrategy = strategies[0]

  if (strategies.length === 0) {
    return (
      <div
        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-center"
        data-testid="strategy-selector-empty"
      >
        <p className="text-sm text-slate-400">No retry strategies available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="strategy-selector">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Retry Strategies</h3>
        <span className="text-xs text-slate-400">
          {strategies.length} {strategies.length === 1 ? 'option' : 'options'}
        </span>
      </div>

      {/* Strategy list */}
      <div className="space-y-2">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            isRecommended={strategy.id === recommendedStrategy?.id}
            onSelect={() => onSelect(strategy)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Disabled state message */}
      {disabled && (
        <p className="text-xs text-slate-500 text-center">
          Strategy selection is disabled during execution
        </p>
      )}
    </div>
  )
}

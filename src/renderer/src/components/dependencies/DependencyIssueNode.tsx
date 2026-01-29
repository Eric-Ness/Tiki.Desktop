import { Handle, Position } from '@xyflow/react'

export interface DependencyIssueNodeData {
  number: number
  title: string
  state: string
  hasCircularDep: boolean
  [key: string]: unknown // Required for @xyflow/react v12 compatibility
}

interface DependencyIssueNodeProps {
  data: DependencyIssueNodeData
}

/**
 * Custom node component for dependency graph issues.
 * Shows issue number, title, and state with visual indicators.
 * Highlights circular dependencies with an orange ring.
 */
export function DependencyIssueNode({ data }: DependencyIssueNodeProps) {
  const { number, title, state, hasCircularDep } = data

  // State-specific styling
  const stateStyles = {
    OPEN: {
      border: 'border-green-500',
      bg: 'bg-green-900/20',
      numberColor: 'text-green-400'
    },
    CLOSED: {
      border: 'border-slate-500',
      bg: 'bg-slate-800/50',
      numberColor: 'text-slate-400'
    }
  }

  const styles = stateStyles[state as keyof typeof stateStyles] || stateStyles.OPEN

  return (
    <>
      {/* Target handle at top (receives edges from dependencies) */}
      <Handle type="target" position={Position.Top} />

      {/* Node container */}
      <div
        data-testid="dependency-issue-node"
        className={`
          px-3 py-2 rounded-lg border-2
          min-w-[180px] max-w-[200px]
          ${styles.border}
          ${styles.bg}
          ${hasCircularDep ? 'ring-2 ring-orange-500' : ''}
          transition-all duration-150
          hover:shadow-lg hover:shadow-black/20
        `}
      >
        {/* Issue number and circular dep indicator */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-mono ${styles.numberColor}`}>
            #{number}
          </span>

          {/* Circular dependency warning indicator */}
          {hasCircularDep && (
            <div
              data-testid="circular-dep-indicator"
              className="text-orange-500"
              title="Part of a circular dependency"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Issue title */}
        <div className="text-sm text-white truncate" title={title}>
          {title}
        </div>
      </div>

      {/* Source handle at bottom (sends edges to dependents) */}
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

import { Handle, Position } from '@xyflow/react'

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface PhaseNodeData {
  number: number
  title: string
  status: PhaseStatus
  files: string[]
  verification: string[]
  selected?: boolean // Whether this node is currently selected
  [key: string]: unknown // Required for @xyflow/react v12 compatibility
}

// Props type for the PhaseNode component
interface PhaseNodeProps {
  data: PhaseNodeData
}

// Status-specific styling configuration
const statusStyles: Record<
  PhaseStatus,
  { border: string; bg: string; numberBg: string; extra?: string }
> = {
  pending: {
    border: 'border-slate-500 border-dashed',
    bg: 'bg-slate-800/50',
    numberBg: 'bg-slate-500'
  },
  in_progress: {
    border: 'border-amber-500',
    bg: 'bg-amber-900/20',
    numberBg: 'bg-amber-500',
    extra: 'node-running'
  },
  completed: {
    border: 'border-green-500 border-solid',
    bg: 'bg-green-900/20',
    numberBg: 'bg-green-500'
  },
  failed: {
    border: 'border-red-500 border-solid',
    bg: 'bg-red-900/20',
    numberBg: 'bg-red-500'
  },
  skipped: {
    border: 'border-slate-400 border-dotted',
    bg: 'bg-slate-800/30',
    numberBg: 'bg-slate-400'
  }
}

export function PhaseNode({ data }: PhaseNodeProps) {
  const { number, title, status, files, selected = false } = data
  const styles = statusStyles[status]
  const fileCount = files.length

  return (
    <>
      {/* Target handle at top */}
      <Handle type="target" position={Position.Top} />

      {/* Node container */}
      <div
        data-status={status}
        data-selected={selected}
        className={`
          w-[180px] min-h-[80px]
          rounded-lg border-2 p-3
          flex items-center gap-3
          ${styles.border}
          ${styles.bg}
          ${styles.extra || ''}
          ${selected ? 'ring-2 ring-amber-500' : ''}
        `}
      >
        {/* Phase number circle */}
        <div
          data-testid="phase-number"
          className={`
            flex-shrink-0
            w-8 h-8 rounded-full
            flex items-center justify-center
            text-white font-semibold text-sm
            ${styles.numberBg}
          `}
        >
          {number}
        </div>

        {/* Title */}
        <div
          data-testid="phase-title"
          className="flex-1 min-w-0 text-sm text-white truncate"
        >
          {title}
        </div>

        {/* File count badge */}
        {fileCount > 0 && (
          <div
            data-testid="file-count-badge"
            className="
              absolute top-2 right-2
              bg-slate-600 text-white text-xs
              px-1.5 py-0.5 rounded-full
              font-medium
            "
          >
            {fileCount}
          </div>
        )}

        {/* Error indicator for failed status */}
        {status === 'failed' && (
          <div
            data-testid="error-indicator"
            className="
              absolute -top-2 -right-2
              w-6 h-6 rounded-full
              bg-red-500 text-white
              flex items-center justify-center
              shadow-lg
            "
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Source handle at bottom */}
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

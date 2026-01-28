import { Handle, Position } from '@xyflow/react'

export interface ShipNodeData {
  complete: boolean
  [key: string]: unknown // Required for @xyflow/react v12 compatibility
}

interface ShipNodeProps {
  data: ShipNodeData
}

/**
 * ShipNode component displays the final "ship" step at the bottom of the workflow.
 * Shows a rocket/ship icon. Green when complete, gray when pending.
 */
export function ShipNode({ data }: ShipNodeProps) {
  const { complete } = data

  const borderColor = complete ? 'border-green-500' : 'border-slate-500 border-dashed'
  const bgColor = complete ? 'bg-green-900/20' : 'bg-slate-800/50'
  const iconColor = complete ? 'text-green-400' : 'text-slate-400'
  const textColor = complete ? 'text-green-400' : 'text-slate-400'

  return (
    <>
      {/* Target handle at top (receives from last phase) */}
      <Handle type="target" position={Position.Top} />

      {/* Node container */}
      <div
        data-testid="ship-node"
        data-complete={complete}
        className={`
          w-[100px] h-[60px]
          rounded-lg border-2 p-2
          flex flex-col items-center justify-center gap-1
          ${borderColor}
          ${bgColor}
        `}
      >
        {/* Rocket/Ship icon */}
        <svg
          data-testid="ship-icon"
          className={`w-5 h-5 ${iconColor}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Rocket icon */}
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>

        {/* Label */}
        <span
          data-testid="ship-label"
          className={`text-xs font-medium ${textColor}`}
        >
          Ship
        </span>
      </div>
    </>
  )
}

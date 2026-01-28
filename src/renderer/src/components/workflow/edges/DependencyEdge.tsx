import { getBezierPath, type EdgeProps } from '@xyflow/react'

export interface DependencyEdgeData {
  targetStatus?: string // Status of the target node
  [key: string]: unknown
}

/**
 * Custom edge component for workflow dependencies.
 * - Animated dashed line when target phase is pending
 * - Solid line when target phase is completed
 * - Arrow marker at target end
 */
export function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  // Determine if target is pending (not completed)
  const targetStatus = (data as DependencyEdgeData)?.targetStatus || 'pending'
  const isCompleted = targetStatus === 'completed'

  // Styling based on status
  const strokeColor = isCompleted ? '#22c55e' : '#64748b' // green-500 : slate-500
  const strokeDasharray = isCompleted ? 'none' : '5,5'
  const strokeWidth = 2

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className={`react-flow__edge-path ${!isCompleted ? 'animate-dash' : ''}`}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
      />

      {/* Invisible wider path for better click/hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
    </>
  )
}

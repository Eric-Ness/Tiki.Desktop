import { getBezierPath, type EdgeProps } from '@xyflow/react'

export interface DependencyEdgeData {
  type?: 'blocks' | 'fixes' | 'relates'
  isCircular?: boolean
  [key: string]: unknown
}

/**
 * Custom edge component for dependency relationships.
 * - Normal edges: slate/gray with arrow
 * - Circular dependency edges: orange with warning style
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

  const edgeData = data as DependencyEdgeData | undefined
  const isCircular = edgeData?.isCircular || false

  // Styling based on whether edge is part of circular dependency
  const strokeColor = isCircular ? '#f97316' : '#64748b' // orange-500 : slate-500
  const strokeWidth = isCircular ? 2.5 : 2
  const strokeDasharray = isCircular ? '5,3' : 'none'

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className={`react-flow__edge-path ${isCircular ? 'animate-dash' : ''}`}
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

import { useState, useCallback, useRef, type MouseEvent } from 'react'
import type { ExecutionTimeline, PhaseExecution } from '../../types/timeline'
import { calculateTotalDuration, calculateOffset, calculateEndTime } from '../../lib/timeline-utils'
import { TimelineBar } from './TimelineBar'
import { TimelineAxis } from './TimelineAxis'
import { TimelineTooltip } from './TimelineTooltip'

interface TimelineViewProps {
  timeline: ExecutionTimeline
  onPhaseSelect?: (execution: PhaseExecution) => void
}

export function TimelineView({ timeline, onPhaseSelect }: TimelineViewProps) {
  const [hoveredExecution, setHoveredExecution] = useState<PhaseExecution | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalDuration = calculateTotalDuration(timeline.executions)
  const startTime = new Date(timeline.startedAt)
  const endTime = calculateEndTime(timeline)

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(4, z + 0.25))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, z - 0.25))
  }, [])

  const handleBarHover = useCallback(
    (execution: PhaseExecution | null) => {
      setHoveredExecution(execution)
    },
    []
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (hoveredExecution && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltipPosition({
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top + 10
        })
      }
    },
    [hoveredExecution]
  )

  const hasExecutions = timeline.executions.length > 0

  return (
    <div
      data-testid="timeline-view"
      ref={containerRef}
      className="timeline-view h-full flex flex-col bg-background relative"
      onMouseMove={handleMouseMove}
    >
      {/* Controls */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-700 bg-background-secondary">
        <span className="text-sm text-slate-400 mr-2">Zoom:</span>
        <button
          data-testid="zoom-out-button"
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white text-lg transition-colors"
          aria-label="Zoom out"
        >
          -
        </button>
        <span
          data-testid="zoom-level"
          className="text-sm text-white font-mono w-12 text-center"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          data-testid="zoom-in-button"
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white text-lg transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {/* Timeline content */}
      <div
        data-testid="timeline-scroll-container"
        className="flex-1 overflow-auto p-4"
      >
        {hasExecutions ? (
          <div
            className="min-h-[100px]"
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          >
            {/* Phase bars container */}
            <div className="relative h-12 bg-slate-800/50 rounded-lg">
              {timeline.executions.map((exec, i) => (
                <TimelineBar
                  key={`${exec.phaseNumber}-${exec.startedAt}`}
                  execution={exec}
                  totalDuration={totalDuration}
                  startOffset={calculateOffset(timeline.executions, i)}
                  onHover={handleBarHover}
                  onClick={() => onPhaseSelect?.(exec)}
                />
              ))}
            </div>

            {/* Timeline axis */}
            <TimelineAxis startTime={startTime} endTime={endTime} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No executions yet</p>
              <p className="text-sm text-slate-600 mt-1">
                Start executing phases to see timeline
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredExecution && (
        <TimelineTooltip execution={hoveredExecution} position={tooltipPosition} />
      )}
    </div>
  )
}

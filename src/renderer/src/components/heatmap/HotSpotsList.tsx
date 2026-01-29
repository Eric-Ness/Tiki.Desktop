import { useState, useEffect, useCallback } from 'react'
import { getHeatColor, getHeatLabel } from './TreeView'
import type { FileHeatDataPreload } from '../../../../preload'

export interface HotSpotsListProps {
  cwd: string
  limit?: number
  onFileSelect?: (file: FileHeatDataPreload) => void
}

export function HotSpotsList({ cwd, limit = 5, onFileSelect }: HotSpotsListProps) {
  const [hotSpots, setHotSpots] = useState<FileHeatDataPreload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHotSpots = useCallback(async () => {
    if (!cwd) return

    setLoading(true)
    setError(null)

    try {
      const spots = await window.tikiDesktop.heatmap.getHotspots(cwd, limit)
      setHotSpots(spots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hot spots')
    } finally {
      setLoading(false)
    }
  }, [cwd, limit])

  useEffect(() => {
    loadHotSpots()
  }, [loadHotSpots])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-4 text-slate-400 text-sm"
        data-testid="hotspots-loading"
      >
        <svg
          className="animate-spin h-4 w-4 mr-2"
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
        Loading hot spots...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm"
        data-testid="hotspots-error"
      >
        <p>{error}</p>
        <button
          onClick={loadHotSpots}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (hotSpots.length === 0) {
    return (
      <div
        className="py-4 text-center text-slate-500 text-sm"
        data-testid="hotspots-empty"
      >
        No hot spots found
      </div>
    )
  }

  return (
    <div className="space-y-1" data-testid="hotspots-list">
      {hotSpots.map((file, index) => (
        <HotSpotItem
          key={file.path}
          file={file}
          rank={index + 1}
          onSelect={onFileSelect}
        />
      ))}
    </div>
  )
}

interface HotSpotItemProps {
  file: FileHeatDataPreload
  rank: number
  onSelect?: (file: FileHeatDataPreload) => void
}

function HotSpotItem({ file, rank, onSelect }: HotSpotItemProps) {
  const handleClick = useCallback(() => {
    onSelect?.(file)
  }, [file, onSelect])

  const heatPercentage = Math.round(file.heat * 100)
  const heatLevelLabel = getHeatLabel(file.heat)

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left group"
      data-testid={`hotspot-${file.path}`}
      aria-label={`Hot spot #${rank}: ${file.name}, heat ${heatPercentage}%`}
    >
      {/* Rank badge */}
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 text-xs text-slate-400 font-medium">
        {rank}
      </span>

      {/* Heat indicator */}
      <span
        className={`flex-shrink-0 w-2 h-2 rounded-full ${getHeatColor(file.heat)}`}
        title={`Heat: ${heatLevelLabel} (${heatPercentage}%)`}
        aria-label={`Heat level: ${heatLevelLabel}`}
      />

      {/* File name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate group-hover:text-slate-100">
          {file.name}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {file.directory}
        </p>
      </div>

      {/* Modification count */}
      <span className="flex-shrink-0 text-xs text-slate-500 tabular-nums">
        {file.metrics.modifications} mods
      </span>
    </button>
  )
}

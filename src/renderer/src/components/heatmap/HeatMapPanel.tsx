import { useState, useEffect, useCallback } from 'react'
import { TreeView } from './TreeView'
import { FileDetail } from './FileDetail'
import { HotSpotsList } from './HotSpotsList'
import type {
  HeatMapDataPreload,
  HeatMetricPreload,
  TimePeriodPreload,
  FileHeatDataPreload
} from '../../../../preload'

export interface HeatMapPanelProps {
  cwd: string
}

const METRICS: { value: HeatMetricPreload; label: string }[] = [
  { value: 'modifications', label: 'Modifications' },
  { value: 'bugs', label: 'Bug Issues' },
  { value: 'churn', label: 'Code Churn' },
  { value: 'complexity', label: 'Complexity' }
]

const PERIODS: { value: TimePeriodPreload; label: string }[] = [
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: '90days', label: '90 Days' },
  { value: 'all', label: 'All Time' }
]

export function HeatMapPanel({ cwd }: HeatMapPanelProps) {
  const [metric, setMetric] = useState<HeatMetricPreload>('modifications')
  const [period, setPeriod] = useState<TimePeriodPreload>('30days')
  const [data, setData] = useState<HeatMapDataPreload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileHeatDataPreload | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load heat map data
  const loadData = useCallback(async () => {
    if (!cwd) return

    setLoading(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.heatmap.get(cwd, metric, period)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load heat map')
    } finally {
      setLoading(false)
    }
  }, [cwd, metric, period])

  // Refresh heat map data (force regenerate)
  const handleRefresh = useCallback(async () => {
    if (!cwd || refreshing) return

    setRefreshing(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.heatmap.refresh(cwd, metric, period)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh heat map')
    } finally {
      setRefreshing(false)
    }
  }, [cwd, metric, period, refreshing])

  // Load data on mount and when metric/period changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle file selection
  const handleFileSelect = useCallback((file: FileHeatDataPreload) => {
    setSelectedFile(file)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400" data-testid="loading">
        <svg
          className="animate-spin h-5 w-5 mr-2"
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
        Analyzing codebase...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4" data-testid="error">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          <p className="font-medium">Error loading heat map</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-testid="heatmap-panel">
      {/* Header with controls */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Codebase Heat Map</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
            aria-label="Refresh heat map"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Selectors */}
        <div className="flex gap-4">
          {/* Metric selector */}
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as HeatMetricPreload)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              data-testid="metric-selector"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period selector */}
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TimePeriodPreload)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              data-testid="period-selector"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {data && (
        <div className="px-4 py-3 border-b border-slate-700 grid grid-cols-4 gap-4">
          <StatCard
            label="Total Files"
            value={data.summary.totalFiles.toLocaleString()}
          />
          <StatCard
            label="Hot Spots"
            value={data.summary.hotSpots.toLocaleString()}
            highlight
          />
          <StatCard
            label="Bug-Prone"
            value={data.summary.bugProne.toLocaleString()}
          />
          <StatCard
            label="Untouched"
            value={data.summary.untouched.toLocaleString()}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Tree view */}
        <div className="flex-1 overflow-auto p-2">
          {data?.tree && (
            <TreeView
              tree={data.tree}
              onFileSelect={handleFileSelect}
            />
          )}
        </div>

        {/* File detail sidebar */}
        <div className="w-72 border-l border-slate-700 overflow-auto">
          {selectedFile ? (
            <div className="p-4">
              <FileDetail
                file={selectedFile}
                onViewIssue={(issueNumber) => {
                  window.tikiDesktop.github.openInBrowser(issueNumber, cwd)
                }}
              />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Top Hot Spots</h3>
                <HotSpotsList
                  cwd={cwd}
                  limit={5}
                  onFileSelect={handleFileSelect}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Select a file to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Heat legend */}
      <div className="px-4 py-2 border-t border-slate-700">
        <HeatLegend />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  highlight?: boolean
}

function StatCard({ label, value, highlight = false }: StatCardProps) {
  return (
    <div className={`rounded-lg p-2 ${highlight ? 'bg-amber-500/10' : 'bg-slate-800/50'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-amber-400' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  )
}

function HeatLegend() {
  return (
    <div className="flex items-center gap-4 text-xs">
      <span className="text-slate-500">Heat Level:</span>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-slate-400">Low</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-slate-400">Medium</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="text-slate-400">High</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-slate-400">Critical</span>
      </div>
    </div>
  )
}

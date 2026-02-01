import { useState, useEffect, useCallback } from 'react'
import { logger } from '../../lib/logger'
import { MetricCard } from './MetricCard'
import { VelocityChart } from './VelocityChart'
import { BreakdownChart } from './BreakdownChart'
import { InsightsPanel, type Insight } from './InsightsPanel'
import { PerformanceTable, type Execution } from './PerformanceTable'
import type {
  AnalyticsTimePeriod,
  AnalyticsVelocityMetrics,
  AnalyticsTimeSeriesPoint,
  AnalyticsBreakdownItem,
  AnalyticsExecutionRecord
} from '../../../../preload/index'

export interface VelocityDashboardProps {
  cwd: string
}

type PeriodOption = {
  value: AnalyticsTimePeriod
  label: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7days', label: '7 days' },
  { value: '30days', label: '30 days' },
  { value: '90days', label: '90 days' },
  { value: 'all', label: 'All' }
]

// Icons for metric cards
const IssuesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
)

const SuccessIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const DurationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const TokensIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
)

// Convert execution record to table format
function toExecution(record: AnalyticsExecutionRecord): Execution {
  return {
    issueNumber: record.issueNumber,
    issueTitle: record.issueTitle,
    issueType: record.issueType,
    status: record.status,
    phases: record.phases.map((p) => ({ status: p.status })),
    totalTokens: record.totalTokens,
    startedAt: record.startedAt,
    completedAt: record.completedAt
  }
}

// Format duration from milliseconds to readable string
function formatDuration(ms: number): string {
  if (ms === 0) return '0m'
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Format large numbers with K suffix
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

export function VelocityDashboard({ cwd }: VelocityDashboardProps) {
  const [period, setPeriod] = useState<AnalyticsTimePeriod>('30days')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [velocity, setVelocity] = useState<AnalyticsVelocityMetrics | null>(null)
  const [timeSeries, setTimeSeries] = useState<AnalyticsTimeSeriesPoint[]>([])
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdownItem[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [recent, setRecent] = useState<AnalyticsExecutionRecord[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [velocityData, timeSeriesData, breakdownData, insightsData, recentData] =
        await Promise.all([
          window.tikiDesktop.analytics.getVelocity(cwd, period),
          window.tikiDesktop.analytics.getTimeSeries(cwd, 'issues', period, 'day'),
          window.tikiDesktop.analytics.getBreakdown(cwd, 'type'),
          window.tikiDesktop.analytics.getInsights(cwd, period),
          window.tikiDesktop.analytics.getRecent(cwd, 10)
        ])

      setVelocity(velocityData)
      setTimeSeries(timeSeriesData)
      setBreakdown(breakdownData)
      setInsights(insightsData as Insight[])
      setRecent(recentData)
    } catch (err) {
      logger.error('Failed to load analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [cwd, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRetry = () => {
    loadData()
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="velocity-dashboard" className="p-4 space-y-6 overflow-auto h-full">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Velocity Dashboard</h2>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  period === option.value
                    ? 'bg-amber-500 text-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {/* Refresh button */}
          <button
            onClick={handleRetry}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Issues Completed"
          value={velocity?.issues.completed ?? 0}
          delta={velocity?.comparison?.issuesDelta}
          deltaLabel="vs prev period"
          icon={<IssuesIcon />}
          loading={loading}
        />
        <MetricCard
          title="Success Rate"
          value={`${((velocity?.issues.successRate ?? 0) * 100).toFixed(0)}%`}
          delta={velocity?.comparison?.successRateDelta}
          deltaLabel="vs prev period"
          icon={<SuccessIcon />}
          loading={loading}
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(velocity?.issues.avgDuration ?? 0)}
          delta={
            velocity?.comparison?.durationDelta
              ? -velocity.comparison.durationDelta
              : undefined
          }
          deltaLabel="vs prev period"
          icon={<DurationIcon />}
          loading={loading}
        />
        <MetricCard
          title="Total Tokens"
          value={formatNumber(velocity?.tokens.total ?? 0)}
          delta={velocity?.comparison?.tokensDelta}
          deltaLabel="vs prev period"
          icon={<TokensIcon />}
          loading={loading}
        />
      </div>

      {/* Velocity chart */}
      <VelocityChart
        data={timeSeries}
        title="Issues Over Time"
        height={200}
        loading={loading}
      />

      {/* Breakdown and insights row */}
      <div className="grid grid-cols-2 gap-4">
        <BreakdownChart data={breakdown} title="By Issue Type" loading={loading} />
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Insights & Recommendations
          </h3>
          <InsightsPanel insights={insights} loading={loading} />
        </div>
      </div>

      {/* Performance table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Recent Executions</h3>
        </div>
        <PerformanceTable
          executions={recent.map(toExecution)}
          loading={loading}
        />
      </div>
    </div>
  )
}

import { ipcMain } from 'electron'
import {
  AnalyticsService,
  TimePeriod,
  MetricType,
  Granularity,
  ExecutionRecord,
  VelocityMetrics,
  TimeSeriesPoint,
  BreakdownItem
} from '../services/analytics-service'
import { generateInsights, Insight } from '../services/insight-generator'

// Cache service instances by cwd to avoid recreating them
const serviceCache = new Map<string, AnalyticsService>()

function getService(cwd: string): AnalyticsService {
  let service = serviceCache.get(cwd)
  if (!service) {
    service = new AnalyticsService(cwd)
    serviceCache.set(cwd, service)
  }
  return service
}

/**
 * Register IPC handlers for velocity analytics dashboard
 */
export function registerAnalyticsHandlers(): void {
  // analytics:get-velocity - Get velocity metrics for a period
  ipcMain.handle(
    'analytics:get-velocity',
    async (
      _,
      { cwd, period }: { cwd: string; period: TimePeriod }
    ): Promise<VelocityMetrics> => {
      const service = getService(cwd)
      return service.getVelocityMetrics(period)
    }
  )

  // analytics:get-timeseries - Get time series data for charts
  ipcMain.handle(
    'analytics:get-timeseries',
    async (
      _,
      {
        cwd,
        metric,
        period,
        granularity
      }: { cwd: string; metric: MetricType; period: TimePeriod; granularity: Granularity }
    ): Promise<TimeSeriesPoint[]> => {
      const service = getService(cwd)
      return service.getTimeSeriesData(metric, period, granularity)
    }
  )

  // analytics:get-breakdown - Get breakdown data by dimension
  ipcMain.handle(
    'analytics:get-breakdown',
    async (
      _,
      { cwd, dimension }: { cwd: string; dimension: 'type' | 'phase' | 'status' }
    ): Promise<BreakdownItem[]> => {
      const service = getService(cwd)
      return service.getBreakdown(dimension)
    }
  )

  // analytics:get-insights - Get insights based on analytics data
  ipcMain.handle(
    'analytics:get-insights',
    async (_, { cwd, period }: { cwd: string; period: TimePeriod }): Promise<Insight[]> => {
      const service = getService(cwd)
      const velocityMetrics = await service.getVelocityMetrics(period)
      const recentExecutions = await service.getRecentExecutions(10)

      // For previous metrics comparison, we rely on the comparison field
      // already calculated in velocityMetrics
      return generateInsights({
        velocityMetrics,
        recentExecutions,
        previousMetrics: undefined // Comparison is already embedded in velocityMetrics
      })
    }
  )

  // analytics:record-execution - Record a new execution
  ipcMain.handle(
    'analytics:record-execution',
    async (_, { cwd, record }: { cwd: string; record: ExecutionRecord }): Promise<void> => {
      const service = getService(cwd)
      return service.recordExecution(record)
    }
  )

  // analytics:get-recent - Get recent executions
  ipcMain.handle(
    'analytics:get-recent',
    async (
      _,
      { cwd, limit }: { cwd: string; limit?: number }
    ): Promise<ExecutionRecord[]> => {
      const service = getService(cwd)
      return service.getRecentExecutions(limit)
    }
  )
}

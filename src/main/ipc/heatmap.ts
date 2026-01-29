import { ipcMain } from 'electron'
import {
  heatmapService,
  HeatMetric,
  HeatMapData,
  FileHeatData
} from '../services/heatmap-service'
import { TimePeriod } from '../services/git-analyzer'

/**
 * Register IPC handlers for codebase heat map visualization
 */
export function registerHeatmapHandlers(): void {
  // heatmap:generate - Generate heat map data (always fresh)
  ipcMain.handle(
    'heatmap:generate',
    async (
      _,
      { cwd, metric, period }: { cwd: string; metric: HeatMetric; period: TimePeriod }
    ): Promise<HeatMapData> => {
      return heatmapService.generateHeatMap(cwd, metric, period)
    }
  )

  // heatmap:get - Get cached heat map or generate new
  ipcMain.handle(
    'heatmap:get',
    async (
      _,
      { cwd, metric, period }: { cwd: string; metric: HeatMetric; period: TimePeriod }
    ): Promise<HeatMapData> => {
      return heatmapService.getHeatMap(cwd, metric, period)
    }
  )

  // heatmap:get-file - Get detailed file data
  ipcMain.handle(
    'heatmap:get-file',
    async (
      _,
      { cwd, filePath }: { cwd: string; filePath: string }
    ): Promise<FileHeatData | null> => {
      return heatmapService.getFileDetail(cwd, filePath)
    }
  )

  // heatmap:get-hotspots - Get top hot spot files
  ipcMain.handle(
    'heatmap:get-hotspots',
    async (
      _,
      { cwd, limit }: { cwd: string; limit?: number }
    ): Promise<FileHeatData[]> => {
      return heatmapService.getHotSpots(cwd, limit)
    }
  )

  // heatmap:refresh - Force refresh heat map data (clear cache first)
  ipcMain.handle(
    'heatmap:refresh',
    async (
      _,
      { cwd, metric, period }: { cwd: string; metric: HeatMetric; period: TimePeriod }
    ): Promise<HeatMapData> => {
      await heatmapService.clearCache(cwd)
      return heatmapService.generateHeatMap(cwd, metric, period)
    }
  )

  // heatmap:clear-cache - Clear cache only
  ipcMain.handle(
    'heatmap:clear-cache',
    async (_, { cwd }: { cwd: string }): Promise<{ success: boolean }> => {
      await heatmapService.clearCache(cwd)
      return { success: true }
    }
  )
}

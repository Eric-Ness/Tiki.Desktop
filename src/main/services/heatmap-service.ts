import { promises as fs } from 'fs'
import { join, dirname, basename } from 'path'
import {
  TimePeriod,
  analyzeGitHistory,
  countLinesOfCode,
  GitAnalysis
} from './git-analyzer'

export type HeatMetric = 'modifications' | 'bugs' | 'churn' | 'complexity'

export interface FileHeatData {
  path: string
  name: string
  directory: string
  metrics: {
    modifications: number
    bugIssues: number[]
    linesOfCode: number
    lastModified: string | null
  }
  heat: number // Normalized 0-1
}

export interface DirectoryHeatData {
  path: string
  name: string
  files: FileHeatData[]
  subdirectories: DirectoryHeatData[]
  totalHeat: number // Average heat of contents
  fileCount: number
}

export interface HeatMapSummary {
  totalFiles: number
  hotSpots: number // Files with heat > 0.7
  bugProne: number // Files with bug issues
  untouched: number // Files with 0 modifications
  topHotSpot: FileHeatData | null
}

export interface HeatMapData {
  files: FileHeatData[]
  tree: DirectoryHeatData
  summary: HeatMapSummary
  metric: HeatMetric
  period: TimePeriod
  generatedAt: string
}

const CACHE_FILE = '.tiki/cache/heatmap.json'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load cache from disk
 */
async function loadCache(cwd: string): Promise<HeatMapData | null> {
  try {
    const cachePath = join(cwd, CACHE_FILE)
    const content = await fs.readFile(cachePath, 'utf-8')
    return JSON.parse(content) as HeatMapData
  } catch {
    return null
  }
}

/**
 * Save cache to disk
 */
async function saveCache(cwd: string, data: HeatMapData): Promise<void> {
  try {
    const cachePath = join(cwd, CACHE_FILE)
    const cacheDir = dirname(cachePath)

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // Cache save failures are non-critical
  }
}

/**
 * Check if cached data is valid for the given parameters
 */
function isCacheValid(
  cache: HeatMapData | null,
  metric: HeatMetric,
  period: TimePeriod
): boolean {
  if (!cache) return false
  if (cache.metric !== metric || cache.period !== period) return false

  // Check if cache is still fresh
  const cacheTime = new Date(cache.generatedAt).getTime()
  const now = Date.now()
  return now - cacheTime < CACHE_TTL_MS
}

export class HeatMapService {
  private cache: HeatMapData | null = null

  /**
   * Generate heat map data for a repository
   */
  async generateHeatMap(
    cwd: string,
    metric: HeatMetric,
    period: TimePeriod
  ): Promise<HeatMapData> {
    // Get git analysis
    const analysis = await analyzeGitHistory(cwd, period)

    // Build file list with metrics
    const files = await this.buildFileList(cwd, analysis)

    // Calculate and normalize heat values
    this.normalizeHeat(files, metric)

    // Build directory tree
    const tree = this.buildDirectoryTree(files)

    // Generate summary
    const summary = this.calculateSummary(files)

    const heatMapData: HeatMapData = {
      files,
      tree,
      summary,
      metric,
      period,
      generatedAt: new Date().toISOString()
    }

    // Update memory cache
    this.cache = heatMapData

    // Persist to disk
    await saveCache(cwd, heatMapData)

    return heatMapData
  }

  /**
   * Get cached data or generate new heat map
   */
  async getHeatMap(
    cwd: string,
    metric: HeatMetric,
    period: TimePeriod
  ): Promise<HeatMapData> {
    // First check memory cache
    if (isCacheValid(this.cache, metric, period)) {
      return this.cache!
    }

    // Try disk cache
    const diskCache = await loadCache(cwd)
    if (isCacheValid(diskCache, metric, period)) {
      this.cache = diskCache
      return diskCache!
    }

    // Generate fresh data
    return this.generateHeatMap(cwd, metric, period)
  }

  /**
   * Get top hot spots (files with highest heat)
   */
  async getHotSpots(cwd: string, limit: number = 10): Promise<FileHeatData[]> {
    // Try to get from cache first, otherwise generate
    const heatMap = await this.getHeatMap(cwd, 'modifications', '30days')
    return heatMap.files
      .slice()
      .sort((a, b) => b.heat - a.heat)
      .slice(0, limit)
  }

  /**
   * Get detailed data for a specific file
   */
  async getFileDetail(cwd: string, filePath: string): Promise<FileHeatData | null> {
    const heatMap = await this.getHeatMap(cwd, 'modifications', '30days')
    return heatMap.files.find((f) => f.path === filePath) || null
  }

  /**
   * Clear all cache (memory and disk)
   */
  async clearCache(cwd: string): Promise<void> {
    this.cache = null
    try {
      const cachePath = join(cwd, CACHE_FILE)
      await fs.unlink(cachePath)
    } catch {
      // File may not exist
    }
  }

  /**
   * Build file list with metrics from git analysis
   */
  private async buildFileList(
    cwd: string,
    analysis: GitAnalysis
  ): Promise<FileHeatData[]> {
    const fileMap = new Map<string, FileHeatData>()

    // Process modifications
    for (const mod of analysis.modifications) {
      const file = this.getOrCreateFileData(fileMap, mod.path)
      file.metrics.modifications = mod.count
      file.metrics.lastModified = mod.lastModified
    }

    // Process bug commits - find which files are associated with bugs
    const fileBugMap = new Map<string, Set<number>>()
    for (let i = 0; i < analysis.bugCommits.length; i++) {
      const commit = analysis.bugCommits[i]
      for (const filePath of commit.files) {
        if (!fileBugMap.has(filePath)) {
          fileBugMap.set(filePath, new Set())
        }
        fileBugMap.get(filePath)!.add(i)
      }
    }

    // Add bug issues to files
    for (const [filePath, bugIndices] of fileBugMap) {
      const file = this.getOrCreateFileData(fileMap, filePath)
      file.metrics.bugIssues = Array.from(bugIndices)
    }

    // Count lines of code for files with modifications
    const files = Array.from(fileMap.values())
    await Promise.all(
      files.map(async (file) => {
        try {
          const fullPath = join(cwd, file.path)
          file.metrics.linesOfCode = await countLinesOfCode(fullPath)
        } catch {
          file.metrics.linesOfCode = 0
        }
      })
    )

    return files
  }

  /**
   * Get or create a FileHeatData entry in the map
   */
  private getOrCreateFileData(
    map: Map<string, FileHeatData>,
    filePath: string
  ): FileHeatData {
    if (!map.has(filePath)) {
      map.set(filePath, {
        path: filePath,
        name: basename(filePath),
        directory: dirname(filePath) || '.',
        metrics: {
          modifications: 0,
          bugIssues: [],
          linesOfCode: 0,
          lastModified: null
        },
        heat: 0
      })
    }
    return map.get(filePath)!
  }

  /**
   * Build directory tree from flat file list
   */
  buildDirectoryTree(files: FileHeatData[]): DirectoryHeatData {
    const root: DirectoryHeatData = {
      path: '.',
      name: '.',
      files: [],
      subdirectories: [],
      totalHeat: 0,
      fileCount: 0
    }

    const dirMap = new Map<string, DirectoryHeatData>()
    dirMap.set('.', root)

    // Helper to get or create a directory node
    const getOrCreateDir = (dirPath: string): DirectoryHeatData => {
      if (dirMap.has(dirPath)) {
        return dirMap.get(dirPath)!
      }

      const dir: DirectoryHeatData = {
        path: dirPath,
        name: basename(dirPath),
        files: [],
        subdirectories: [],
        totalHeat: 0,
        fileCount: 0
      }
      dirMap.set(dirPath, dir)

      // Link to parent
      const parentPath = dirname(dirPath)
      const normalizedParent = parentPath === '' || parentPath === dirPath ? '.' : parentPath
      const parent = getOrCreateDir(normalizedParent)
      if (!parent.subdirectories.find((d) => d.path === dirPath)) {
        parent.subdirectories.push(dir)
      }

      return dir
    }

    // Place files in their directories
    for (const file of files) {
      const dirPath = file.directory === '' || file.directory === '.' ? '.' : file.directory
      const dir = getOrCreateDir(dirPath)
      dir.files.push(file)
    }

    // Calculate heat for each directory (bottom-up)
    this.calculateDirectoryHeat(root)

    return root
  }

  /**
   * Recursively calculate directory heat (average of contents)
   */
  private calculateDirectoryHeat(dir: DirectoryHeatData): void {
    // First calculate for subdirectories
    for (const subdir of dir.subdirectories) {
      this.calculateDirectoryHeat(subdir)
    }

    // Calculate total heat and file count
    let totalHeat = 0
    let fileCount = dir.files.length

    // Add heat from direct files
    for (const file of dir.files) {
      totalHeat += file.heat
    }

    // Add heat from subdirectories
    for (const subdir of dir.subdirectories) {
      totalHeat += subdir.totalHeat * subdir.fileCount
      fileCount += subdir.fileCount
    }

    dir.fileCount = fileCount
    dir.totalHeat = fileCount > 0 ? totalHeat / fileCount : 0
  }

  /**
   * Normalize heat values to 0-1 range based on metric
   */
  normalizeHeat(files: FileHeatData[], metric: HeatMetric): void {
    if (files.length === 0) return

    // Get raw values based on metric
    const values = files.map((f) => this.getRawHeatValue(f, metric))
    const maxValue = Math.max(...values, 1) // Ensure max is at least 1 to avoid division by zero

    // Normalize each file's heat
    for (let i = 0; i < files.length; i++) {
      files[i].heat = values[i] / maxValue
    }
  }

  /**
   * Get the raw heat value for a file based on metric
   */
  private getRawHeatValue(file: FileHeatData, metric: HeatMetric): number {
    switch (metric) {
      case 'modifications':
        return file.metrics.modifications
      case 'bugs':
        return file.metrics.bugIssues.length
      case 'churn':
        // Churn = modifications * lines of code (approximation of code churn)
        return file.metrics.modifications * Math.log(file.metrics.linesOfCode + 1)
      case 'complexity':
        // Simple approximation: lines of code
        return file.metrics.linesOfCode
      default:
        return file.metrics.modifications
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(files: FileHeatData[]): HeatMapSummary {
    const hotSpots = files.filter((f) => f.heat > 0.7).length
    const bugProne = files.filter((f) => f.metrics.bugIssues.length > 0).length
    const untouched = files.filter((f) => f.metrics.modifications === 0).length

    // Find top hot spot
    let topHotSpot: FileHeatData | null = null
    for (const file of files) {
      if (!topHotSpot || file.heat > topHotSpot.heat) {
        topHotSpot = file
      }
    }

    return {
      totalFiles: files.length,
      hotSpots,
      bugProne,
      untouched,
      topHotSpot
    }
  }
}

// Export singleton instance
export const heatmapService = new HeatMapService()

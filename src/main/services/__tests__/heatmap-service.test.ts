/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock git-analyzer
vi.mock('../git-analyzer', () => ({
  analyzeGitHistory: vi.fn(),
  getFileModificationHistory: vi.fn(),
  countLinesOfCode: vi.fn()
}))

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn()
  }
}))

import { promises as fs } from 'fs'
import {
  HeatMapService,
  FileHeatData,
  HeatMapData,
  heatmapService
} from '../heatmap-service'
import { analyzeGitHistory, countLinesOfCode, GitAnalysis } from '../git-analyzer'

const mockAnalyzeGitHistory = vi.mocked(analyzeGitHistory)
const mockCountLinesOfCode = vi.mocked(countLinesOfCode)
const mockReadFile = vi.mocked(fs.readFile)
const mockWriteFile = vi.mocked(fs.writeFile)
const mockMkdir = vi.mocked(fs.mkdir)
const mockUnlink = vi.mocked(fs.unlink)

describe('HeatMapService', () => {
  let service: HeatMapService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HeatMapService()

    // Default mock implementations
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockReadFile.mockRejectedValue(new Error('File not found'))
    mockUnlink.mockResolvedValue(undefined)
    mockCountLinesOfCode.mockResolvedValue(100)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generateHeatMap', () => {
    it('should generate heat map from git analysis', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'src/index.ts', count: 10, lastModified: '2024-01-15 10:00:00 +0000' },
          { path: 'src/utils.ts', count: 5, lastModified: '2024-01-14 09:00:00 +0000' }
        ],
        bugCommits: [
          {
            hash: 'abc123',
            message: 'fix: bug',
            date: '2024-01-15 10:00:00 +0000',
            files: ['src/index.ts']
          }
        ],
        totalCommits: 15,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)
      mockCountLinesOfCode.mockResolvedValue(100)

      const result = await service.generateHeatMap('/test/repo', 'modifications', '30days')

      expect(result.files).toHaveLength(2)
      expect(result.metric).toBe('modifications')
      expect(result.period).toBe('30days')
      expect(result.generatedAt).toBeDefined()
    })

    it('should calculate heat values normalized to 0-1', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'hot.ts', count: 100, lastModified: '2024-01-15' },
          { path: 'cold.ts', count: 10, lastModified: '2024-01-14' }
        ],
        bugCommits: [],
        totalCommits: 110,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const result = await service.generateHeatMap('/test/repo', 'modifications', '30days')

      const hotFile = result.files.find((f) => f.path === 'hot.ts')
      const coldFile = result.files.find((f) => f.path === 'cold.ts')

      expect(hotFile?.heat).toBe(1) // Max value = 1
      expect(coldFile?.heat).toBe(0.1) // 10/100 = 0.1
    })

    it('should build directory tree correctly', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'src/main/index.ts', count: 5, lastModified: '2024-01-15' },
          { path: 'src/main/utils.ts', count: 3, lastModified: '2024-01-14' },
          { path: 'src/test/test.ts', count: 2, lastModified: '2024-01-13' }
        ],
        bugCommits: [],
        totalCommits: 10,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const result = await service.generateHeatMap('/test/repo', 'modifications', '30days')

      expect(result.tree.path).toBe('.')
      expect(result.tree.fileCount).toBe(3)
    })

    it('should calculate summary statistics correctly', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'hot.ts', count: 100, lastModified: '2024-01-15' },
          { path: 'medium.ts', count: 50, lastModified: '2024-01-14' },
          { path: 'cold.ts', count: 10, lastModified: '2024-01-13' }
        ],
        bugCommits: [
          {
            hash: 'abc',
            message: 'fix',
            date: '2024-01-15',
            files: ['hot.ts']
          }
        ],
        totalCommits: 160,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const result = await service.generateHeatMap('/test/repo', 'modifications', '30days')

      expect(result.summary.totalFiles).toBe(3)
      expect(result.summary.bugProne).toBe(1)
      expect(result.summary.topHotSpot?.path).toBe('hot.ts')
    })

    it('should cache result to disk', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [{ path: 'file.ts', count: 1, lastModified: '2024-01-15' }],
        bugCommits: [],
        totalCommits: 1,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      await service.generateHeatMap('/test/repo', 'modifications', '30days')

      expect(mockMkdir).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it('should handle empty repository', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [],
        bugCommits: [],
        totalCommits: 0,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const result = await service.generateHeatMap('/test/repo', 'modifications', '30days')

      expect(result.files).toHaveLength(0)
      expect(result.summary.totalFiles).toBe(0)
      expect(result.summary.topHotSpot).toBeNull()
    })
  })

  describe('getHeatMap', () => {
    it('should return cached data if valid', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [{ path: 'file.ts', count: 5, lastModified: '2024-01-15' }],
        bugCommits: [],
        totalCommits: 5,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      // First call generates data
      await service.generateHeatMap('/test/repo', 'modifications', '30days')

      // Clear the mock call count
      mockAnalyzeGitHistory.mockClear()

      // Second call should use cache
      await service.getHeatMap('/test/repo', 'modifications', '30days')

      // analyzeGitHistory should not be called again
      expect(mockAnalyzeGitHistory).not.toHaveBeenCalled()
    })

    it('should regenerate if metric differs', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [{ path: 'file.ts', count: 5, lastModified: '2024-01-15' }],
        bugCommits: [],
        totalCommits: 5,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      // Generate with modifications metric
      await service.generateHeatMap('/test/repo', 'modifications', '30days')
      mockAnalyzeGitHistory.mockClear()

      // Request with different metric - should regenerate
      await service.getHeatMap('/test/repo', 'bugs', '30days')

      expect(mockAnalyzeGitHistory).toHaveBeenCalled()
    })

    it('should regenerate if period differs', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [{ path: 'file.ts', count: 5, lastModified: '2024-01-15' }],
        bugCommits: [],
        totalCommits: 5,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      await service.generateHeatMap('/test/repo', 'modifications', '30days')
      mockAnalyzeGitHistory.mockClear()

      // Request with different period - should regenerate
      await service.getHeatMap('/test/repo', 'modifications', '7days')

      expect(mockAnalyzeGitHistory).toHaveBeenCalled()
    })

    it('should load from disk cache if memory cache is empty', async () => {
      const cachedData: HeatMapData = {
        files: [
          {
            path: 'cached.ts',
            name: 'cached.ts',
            directory: '.',
            metrics: { modifications: 5, bugIssues: [], linesOfCode: 100, lastModified: '2024-01-15' },
            heat: 1
          }
        ],
        tree: {
          path: '.',
          name: '.',
          files: [],
          subdirectories: [],
          totalHeat: 1,
          fileCount: 1
        },
        summary: {
          totalFiles: 1,
          hotSpots: 1,
          bugProne: 0,
          untouched: 0,
          topHotSpot: null
        },
        metric: 'modifications',
        period: '30days',
        generatedAt: new Date().toISOString() // Fresh cache
      }

      mockReadFile.mockResolvedValue(JSON.stringify(cachedData) as never)

      const result = await service.getHeatMap('/test/repo', 'modifications', '30days')

      expect(result.files[0].path).toBe('cached.ts')
      expect(mockAnalyzeGitHistory).not.toHaveBeenCalled()
    })
  })

  describe('getHotSpots', () => {
    it('should return files sorted by heat', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'hot.ts', count: 100, lastModified: '2024-01-15' },
          { path: 'medium.ts', count: 50, lastModified: '2024-01-14' },
          { path: 'cold.ts', count: 10, lastModified: '2024-01-13' }
        ],
        bugCommits: [],
        totalCommits: 160,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const hotSpots = await service.getHotSpots('/test/repo')

      expect(hotSpots[0].path).toBe('hot.ts')
      expect(hotSpots[1].path).toBe('medium.ts')
      expect(hotSpots[2].path).toBe('cold.ts')
    })

    it('should limit results to specified count', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'file1.ts', count: 100, lastModified: '2024-01-15' },
          { path: 'file2.ts', count: 90, lastModified: '2024-01-14' },
          { path: 'file3.ts', count: 80, lastModified: '2024-01-13' },
          { path: 'file4.ts', count: 70, lastModified: '2024-01-12' },
          { path: 'file5.ts', count: 60, lastModified: '2024-01-11' }
        ],
        bugCommits: [],
        totalCommits: 400,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const hotSpots = await service.getHotSpots('/test/repo', 3)

      expect(hotSpots).toHaveLength(3)
      expect(hotSpots[0].path).toBe('file1.ts')
      expect(hotSpots[2].path).toBe('file3.ts')
    })

    it('should default to 10 results', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: Array.from({ length: 20 }, (_, i) => ({
          path: `file${i}.ts`,
          count: 20 - i,
          lastModified: '2024-01-15'
        })),
        bugCommits: [],
        totalCommits: 210,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const hotSpots = await service.getHotSpots('/test/repo')

      expect(hotSpots).toHaveLength(10)
    })
  })

  describe('getFileDetail', () => {
    it('should return file data for existing file', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'src/index.ts', count: 10, lastModified: '2024-01-15' }
        ],
        bugCommits: [],
        totalCommits: 10,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const file = await service.getFileDetail('/test/repo', 'src/index.ts')

      expect(file).not.toBeNull()
      expect(file?.path).toBe('src/index.ts')
      expect(file?.metrics.modifications).toBe(10)
    })

    it('should return null for non-existent file', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'src/index.ts', count: 10, lastModified: '2024-01-15' }
        ],
        bugCommits: [],
        totalCommits: 10,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const file = await service.getFileDetail('/test/repo', 'nonexistent.ts')

      expect(file).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should clear memory and disk cache', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [{ path: 'file.ts', count: 5, lastModified: '2024-01-15' }],
        bugCommits: [],
        totalCommits: 5,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      // Generate data first
      await service.generateHeatMap('/test/repo', 'modifications', '30days')

      // Clear cache
      await service.clearCache('/test/repo')

      expect(mockUnlink).toHaveBeenCalled()

      // Next getHeatMap should regenerate
      await service.getHeatMap('/test/repo', 'modifications', '30days')
      expect(mockAnalyzeGitHistory).toHaveBeenCalledTimes(2)
    })

    it('should handle missing cache file gracefully', async () => {
      mockUnlink.mockRejectedValue(new Error('ENOENT'))

      // Should not throw
      await expect(service.clearCache('/test/repo')).resolves.not.toThrow()
    })
  })

  describe('normalizeHeat', () => {
    it('should normalize modifications metric', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { modifications: 100 }),
        createFileData('b.ts', { modifications: 50 }),
        createFileData('c.ts', { modifications: 25 })
      ]

      service.normalizeHeat(files, 'modifications')

      expect(files[0].heat).toBe(1)
      expect(files[1].heat).toBe(0.5)
      expect(files[2].heat).toBe(0.25)
    })

    it('should normalize bugs metric', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { bugIssues: [0, 1, 2, 3] }),
        createFileData('b.ts', { bugIssues: [0, 1] }),
        createFileData('c.ts', { bugIssues: [] })
      ]

      service.normalizeHeat(files, 'bugs')

      expect(files[0].heat).toBe(1) // 4 bugs
      expect(files[1].heat).toBe(0.5) // 2 bugs
      expect(files[2].heat).toBe(0) // 0 bugs
    })

    it('should normalize complexity metric', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { linesOfCode: 1000 }),
        createFileData('b.ts', { linesOfCode: 500 }),
        createFileData('c.ts', { linesOfCode: 100 })
      ]

      service.normalizeHeat(files, 'complexity')

      expect(files[0].heat).toBe(1)
      expect(files[1].heat).toBe(0.5)
      expect(files[2].heat).toBe(0.1)
    })

    it('should handle empty files array', () => {
      const files: FileHeatData[] = []

      // Should not throw
      expect(() => service.normalizeHeat(files, 'modifications')).not.toThrow()
    })

    it('should handle all zero values', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { modifications: 0 }),
        createFileData('b.ts', { modifications: 0 })
      ]

      service.normalizeHeat(files, 'modifications')

      // All should be 0 (0/1 = 0 since we use max of 1 to avoid division by zero)
      expect(files[0].heat).toBe(0)
      expect(files[1].heat).toBe(0)
    })
  })

  describe('buildDirectoryTree', () => {
    it('should create proper tree structure', () => {
      const files: FileHeatData[] = [
        createFileData('src/main/index.ts', { modifications: 10 }, 0.8),
        createFileData('src/main/utils.ts', { modifications: 5 }, 0.4),
        createFileData('src/test/test.ts', { modifications: 2 }, 0.2)
      ]

      const tree = service.buildDirectoryTree(files)

      expect(tree.path).toBe('.')
      expect(tree.fileCount).toBe(3)
    })

    it('should handle files in root directory', () => {
      const files: FileHeatData[] = [
        createFileData('index.ts', { modifications: 10 }, 0.8),
        createFileData('config.ts', { modifications: 5 }, 0.4)
      ]

      const tree = service.buildDirectoryTree(files)

      expect(tree.path).toBe('.')
      expect(tree.files).toHaveLength(2)
      expect(tree.fileCount).toBe(2)
    })

    it('should calculate directory heat as average of contents', () => {
      const files: FileHeatData[] = [
        createFileData('src/a.ts', { modifications: 10 }, 1.0),
        createFileData('src/b.ts', { modifications: 5 }, 0.5)
      ]

      const tree = service.buildDirectoryTree(files)

      // Find src directory
      const srcDir = tree.subdirectories.find((d) => d.name === 'src')
      expect(srcDir).toBeDefined()
      expect(srcDir?.totalHeat).toBe(0.75) // (1.0 + 0.5) / 2
    })

    it('should handle deeply nested directories', () => {
      const files: FileHeatData[] = [
        createFileData('a/b/c/d/file.ts', { modifications: 10 }, 1.0)
      ]

      const tree = service.buildDirectoryTree(files)

      expect(tree.fileCount).toBe(1)
      expect(tree.subdirectories).toHaveLength(1)
    })

    it('should handle empty file list', () => {
      const files: FileHeatData[] = []

      const tree = service.buildDirectoryTree(files)

      expect(tree.path).toBe('.')
      expect(tree.files).toHaveLength(0)
      expect(tree.subdirectories).toHaveLength(0)
      expect(tree.fileCount).toBe(0)
      expect(tree.totalHeat).toBe(0)
    })
  })

  describe('calculateSummary', () => {
    it('should count hot spots correctly', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', {}, 0.9),
        createFileData('b.ts', {}, 0.75),
        createFileData('c.ts', {}, 0.5),
        createFileData('d.ts', {}, 0.3)
      ]

      const summary = service.calculateSummary(files)

      expect(summary.hotSpots).toBe(2) // heat > 0.7
    })

    it('should count bug prone files', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { bugIssues: [0, 1] }),
        createFileData('b.ts', { bugIssues: [2] }),
        createFileData('c.ts', { bugIssues: [] })
      ]

      const summary = service.calculateSummary(files)

      expect(summary.bugProne).toBe(2)
    })

    it('should count untouched files', () => {
      const files: FileHeatData[] = [
        createFileData('a.ts', { modifications: 10 }),
        createFileData('b.ts', { modifications: 0 }),
        createFileData('c.ts', { modifications: 0 })
      ]

      const summary = service.calculateSummary(files)

      expect(summary.untouched).toBe(2)
    })

    it('should identify top hot spot', () => {
      const files: FileHeatData[] = [
        createFileData('cold.ts', {}, 0.2),
        createFileData('hot.ts', {}, 0.9),
        createFileData('medium.ts', {}, 0.5)
      ]

      const summary = service.calculateSummary(files)

      expect(summary.topHotSpot?.path).toBe('hot.ts')
      expect(summary.topHotSpot?.heat).toBe(0.9)
    })

    it('should handle empty files', () => {
      const summary = service.calculateSummary([])

      expect(summary.totalFiles).toBe(0)
      expect(summary.hotSpots).toBe(0)
      expect(summary.bugProne).toBe(0)
      expect(summary.untouched).toBe(0)
      expect(summary.topHotSpot).toBeNull()
    })
  })

  describe('heat metric calculations', () => {
    it('should calculate churn metric (modifications * log(LOC))', async () => {
      const mockAnalysis: GitAnalysis = {
        modifications: [
          { path: 'big-changes.ts', count: 10, lastModified: '2024-01-15' },
          { path: 'small-changes.ts', count: 10, lastModified: '2024-01-14' }
        ],
        bugCommits: [],
        totalCommits: 20,
        period: '30days',
        analyzedAt: '2024-01-15T12:00:00.000Z'
      }

      // big-changes.ts has 1000 lines, small-changes.ts has 10 lines
      mockCountLinesOfCode.mockImplementation(async (path: string) => {
        if (path.includes('big-changes')) return 1000
        return 10
      })

      mockAnalyzeGitHistory.mockResolvedValue(mockAnalysis)

      const result = await service.generateHeatMap('/test/repo', 'churn', '30days')

      const bigFile = result.files.find((f) => f.path === 'big-changes.ts')
      const smallFile = result.files.find((f) => f.path === 'small-changes.ts')

      // Big file should have higher churn due to more LOC
      expect(bigFile?.heat).toBeGreaterThan(smallFile?.heat || 0)
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(heatmapService).toBeInstanceOf(HeatMapService)
    })
  })
})

/**
 * Helper to create FileHeatData for testing
 */
function createFileData(
  path: string,
  metrics: Partial<FileHeatData['metrics']> = {},
  heat: number = 0
): FileHeatData {
  const parts = path.split('/')
  return {
    path,
    name: parts[parts.length - 1],
    directory: parts.length > 1 ? parts.slice(0, -1).join('/') : '.',
    metrics: {
      modifications: 0,
      bugIssues: [],
      linesOfCode: 100,
      lastModified: null,
      ...metrics
    },
    heat
  }
}

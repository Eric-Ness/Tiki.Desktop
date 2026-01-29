import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HeatMapPanel } from '../HeatMapPanel'
import { TreeView, getHeatColor, getHeatLabel } from '../TreeView'
import type {
  HeatMapDataPreload,
  DirectoryHeatDataPreload,
  FileHeatDataPreload
} from '../../../../../preload'

// Mock data helpers
const createMockFile = (
  path: string,
  heat: number,
  modifications = 10,
  bugIssues: number[] = []
): FileHeatDataPreload => ({
  path,
  name: path.split('/').pop() || path,
  directory: path.split('/').slice(0, -1).join('/') || '.',
  metrics: {
    modifications,
    bugIssues,
    linesOfCode: 100,
    lastModified: '2024-01-15T10:00:00Z'
  },
  heat
})

const createMockDirectory = (
  path: string,
  files: FileHeatDataPreload[] = [],
  subdirectories: DirectoryHeatDataPreload[] = []
): DirectoryHeatDataPreload => ({
  path,
  name: path.split('/').pop() || path,
  files,
  subdirectories,
  totalHeat: files.reduce((sum, f) => sum + f.heat, 0) +
    subdirectories.reduce((sum, d) => sum + d.totalHeat, 0),
  fileCount: files.length + subdirectories.reduce((sum, d) => sum + d.fileCount, 0)
})

const createMockHeatMapData = (overrides: Partial<HeatMapDataPreload> = {}): HeatMapDataPreload => ({
  files: [
    createMockFile('src/index.ts', 0.9, 50, [1, 2]),
    createMockFile('src/utils.ts', 0.5, 20),
    createMockFile('src/app.tsx', 0.2, 5)
  ],
  tree: createMockDirectory('.', [], [
    createMockDirectory('src', [
      createMockFile('src/index.ts', 0.9, 50, [1, 2]),
      createMockFile('src/utils.ts', 0.5, 20),
      createMockFile('src/app.tsx', 0.2, 5)
    ])
  ]),
  summary: {
    totalFiles: 3,
    hotSpots: 1,
    bugProne: 1,
    untouched: 0,
    topHotSpot: createMockFile('src/index.ts', 0.9, 50, [1, 2])
  },
  metric: 'modifications',
  period: '30days',
  generatedAt: '2024-01-15T10:00:00Z',
  ...overrides
})

describe('HeatMapPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock a delayed response
      vi.mocked(window.tikiDesktop.heatmap.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<HeatMapPanel cwd="/test/path" />)

      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.getByText('Analyzing codebase...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockRejectedValue(
        new Error('Failed to analyze')
      )

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument()
        expect(screen.getByText('Failed to analyze')).toBeInTheDocument()
      })
    })

    it('should have retry button on error', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockRejectedValue(
        new Error('Failed to analyze')
      )

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })

  describe('Metric Selector', () => {
    it('should display metric selector with all options', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('metric-selector')).toBeInTheDocument()
      })

      const selector = screen.getByTestId('metric-selector')
      expect(selector).toHaveValue('modifications')

      // Check all options are present
      expect(screen.getByRole('option', { name: 'Modifications' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Bug Issues' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Code Churn' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Complexity' })).toBeInTheDocument()
    })

    it('should reload data when metric changes', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('metric-selector')).toBeInTheDocument()
      })

      // Change metric
      fireEvent.change(screen.getByTestId('metric-selector'), { target: { value: 'bugs' } })

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.get).toHaveBeenCalledWith(
          '/test/path',
          'bugs',
          '30days'
        )
      })
    })
  })

  describe('Period Selector', () => {
    it('should display period selector with all options', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('period-selector')).toBeInTheDocument()
      })

      const selector = screen.getByTestId('period-selector')
      expect(selector).toHaveValue('30days')

      // Check all options are present
      expect(screen.getByRole('option', { name: '7 Days' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '30 Days' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '90 Days' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'All Time' })).toBeInTheDocument()
    })

    it('should reload data when period changes', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('period-selector')).toBeInTheDocument()
      })

      // Change period
      fireEvent.change(screen.getByTestId('period-selector'), { target: { value: '7days' } })

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.get).toHaveBeenCalledWith(
          '/test/path',
          'modifications',
          '7days'
        )
      })
    })
  })

  describe('Summary Stats', () => {
    it('should display summary statistics', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(
        createMockHeatMapData({
          // Use empty tree to avoid file modification counts interfering
          tree: createMockDirectory('.', [], []),
          files: [],
          summary: {
            totalFiles: 100,
            hotSpots: 15,
            bugProne: 8,
            untouched: 25,
            topHotSpot: null
          }
        })
      )

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument() // Total files
        expect(screen.getByText('15')).toBeInTheDocument() // Hot spots
        expect(screen.getByText('8')).toBeInTheDocument() // Bug prone
        expect(screen.getByText('25')).toBeInTheDocument() // Untouched
      })
    })
  })

  describe('Refresh', () => {
    it('should have refresh button', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      })
    })

    it('should call refresh when button clicked', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())
      vi.mocked(window.tikiDesktop.heatmap.refresh).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.refresh).toHaveBeenCalledWith(
          '/test/path',
          'modifications',
          '30days'
        )
      })
    })
  })

  describe('Tree View', () => {
    it('should render tree view with data', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('tree-view')).toBeInTheDocument()
      })
    })
  })

  describe('File Selection', () => {
    it('should show file detail when file is selected', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('tree-view')).toBeInTheDocument()
      })

      // Click on a file
      const fileButton = screen.getByTestId('file-src/index.ts')
      fireEvent.click(fileButton)

      await waitFor(() => {
        expect(screen.getByTestId('file-detail')).toBeInTheDocument()
        // Check for file name in the detail panel heading
        const fileDetail = screen.getByTestId('file-detail')
        expect(fileDetail.querySelector('h3')).toHaveTextContent('index.ts')
      })
    })
  })

  describe('Heat Legend', () => {
    it('should display heat legend', async () => {
      vi.mocked(window.tikiDesktop.heatmap.get).mockResolvedValue(createMockHeatMapData())

      render(<HeatMapPanel cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('Heat Level:')).toBeInTheDocument()
        expect(screen.getByText('Low')).toBeInTheDocument()
        expect(screen.getByText('Medium')).toBeInTheDocument()
        expect(screen.getByText('High')).toBeInTheDocument()
        expect(screen.getByText('Critical')).toBeInTheDocument()
      })
    })
  })
})

describe('TreeView', () => {
  const mockTree = createMockDirectory('.', [], [
    createMockDirectory('src', [
      createMockFile('src/index.ts', 0.9, 50),
      createMockFile('src/utils.ts', 0.5, 20)
    ], [
      createMockDirectory('src/components', [
        createMockFile('src/components/App.tsx', 0.2, 5)
      ])
    ])
  ])

  describe('Directory Rendering', () => {
    it('should render directories with expand/collapse', () => {
      render(<TreeView tree={mockTree} />)

      // src directory should be visible
      expect(screen.getByTestId('directory-src')).toBeInTheDocument()
    })

    it('should expand/collapse directories on click', () => {
      render(<TreeView tree={mockTree} />)

      const srcDir = screen.getByTestId('directory-src')

      // Initially expanded (level < 2)
      expect(screen.getByTestId('file-src/index.ts')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(srcDir)

      // Files should be hidden
      expect(screen.queryByTestId('file-src/index.ts')).not.toBeInTheDocument()

      // Click to expand again
      fireEvent.click(srcDir)

      // Files should be visible
      expect(screen.getByTestId('file-src/index.ts')).toBeInTheDocument()
    })
  })

  describe('File Rendering', () => {
    it('should render files with heat indicators', () => {
      render(<TreeView tree={mockTree} />)

      expect(screen.getByTestId('file-src/index.ts')).toBeInTheDocument()
      expect(screen.getByTestId('file-src/utils.ts')).toBeInTheDocument()
    })

    it('should call onFileSelect when file is clicked', () => {
      const onFileSelect = vi.fn()
      render(<TreeView tree={mockTree} onFileSelect={onFileSelect} />)

      fireEvent.click(screen.getByTestId('file-src/index.ts'))

      expect(onFileSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src/index.ts',
          heat: 0.9
        })
      )
    })
  })
})

describe('Heat Color Functions', () => {
  describe('getHeatColor', () => {
    it('should return green for low heat (0-0.3)', () => {
      expect(getHeatColor(0)).toBe('bg-green-500')
      expect(getHeatColor(0.1)).toBe('bg-green-500')
      expect(getHeatColor(0.29)).toBe('bg-green-500')
    })

    it('should return yellow for medium heat (0.3-0.6)', () => {
      expect(getHeatColor(0.3)).toBe('bg-yellow-500')
      expect(getHeatColor(0.45)).toBe('bg-yellow-500')
      expect(getHeatColor(0.59)).toBe('bg-yellow-500')
    })

    it('should return orange for high heat (0.6-0.8)', () => {
      expect(getHeatColor(0.6)).toBe('bg-orange-500')
      expect(getHeatColor(0.7)).toBe('bg-orange-500')
      expect(getHeatColor(0.79)).toBe('bg-orange-500')
    })

    it('should return red for critical heat (0.8-1.0)', () => {
      expect(getHeatColor(0.8)).toBe('bg-red-500')
      expect(getHeatColor(0.9)).toBe('bg-red-500')
      expect(getHeatColor(1.0)).toBe('bg-red-500')
    })
  })

  describe('getHeatLabel', () => {
    it('should return correct labels for heat levels', () => {
      expect(getHeatLabel(0.1)).toBe('low')
      expect(getHeatLabel(0.4)).toBe('medium')
      expect(getHeatLabel(0.7)).toBe('high')
      expect(getHeatLabel(0.9)).toBe('critical')
    })
  })
})

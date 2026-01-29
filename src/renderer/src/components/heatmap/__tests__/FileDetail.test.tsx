import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { FileDetail, formatRelativeDate } from '../FileDetail'
import { HotSpotsList } from '../HotSpotsList'
import type { FileHeatDataPreload } from '../../../../../preload'

// Mock data helpers
const createMockFile = (
  path: string,
  heat: number,
  modifications = 10,
  bugIssues: number[] = [],
  lastModified: string | null = '2024-01-15T10:00:00Z'
): FileHeatDataPreload => ({
  path,
  name: path.split('/').pop() || path,
  directory: path.split('/').slice(0, -1).join('/') || '.',
  metrics: {
    modifications,
    bugIssues,
    linesOfCode: 100,
    lastModified
  },
  heat
})

describe('FileDetail', () => {
  describe('File Information Display', () => {
    it('should display file name and directory', () => {
      const file = createMockFile('src/components/App.tsx', 0.5)

      render(<FileDetail file={file} />)

      expect(screen.getByText('App.tsx')).toBeInTheDocument()
      expect(screen.getByText('src/components')).toBeInTheDocument()
    })

    it('should display modifications count', () => {
      const file = createMockFile('src/index.ts', 0.5, 42)

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('metric-modifications')).toHaveTextContent('42')
    })

    it('should display lines of code', () => {
      const file = createMockFile('src/index.ts', 0.5)

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('metric-loc')).toHaveTextContent('100')
    })

    it('should display bug issues count', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [1, 2, 3])

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('metric-bug-issues')).toHaveTextContent('3')
    })

    it('should display last modified date', () => {
      const file = createMockFile('src/index.ts', 0.5)

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('metric-last-modified')).toBeInTheDocument()
    })

    it('should show Never when last modified is null', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [], null)

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('metric-last-modified')).toHaveTextContent('Never')
    })
  })

  describe('Heat Level Indicator', () => {
    it('should display heat badge for critical heat', () => {
      const file = createMockFile('src/index.ts', 0.9)

      render(<FileDetail file={file} />)

      const badge = screen.getByTestId('heat-badge')
      expect(badge).toHaveTextContent('90%')
      expect(badge).toHaveTextContent('Critical')
    })

    it('should display heat badge for high heat', () => {
      const file = createMockFile('src/index.ts', 0.7)

      render(<FileDetail file={file} />)

      const badge = screen.getByTestId('heat-badge')
      expect(badge).toHaveTextContent('70%')
      expect(badge).toHaveTextContent('High')
    })

    it('should display heat badge for medium heat', () => {
      const file = createMockFile('src/index.ts', 0.45)

      render(<FileDetail file={file} />)

      const badge = screen.getByTestId('heat-badge')
      expect(badge).toHaveTextContent('45%')
      expect(badge).toHaveTextContent('Medium')
    })

    it('should display heat badge for low heat', () => {
      const file = createMockFile('src/index.ts', 0.2)

      render(<FileDetail file={file} />)

      const badge = screen.getByTestId('heat-badge')
      expect(badge).toHaveTextContent('20%')
      expect(badge).toHaveTextContent('Low')
    })

    it('should display heat bar visualization', () => {
      const file = createMockFile('src/index.ts', 0.75)

      render(<FileDetail file={file} />)

      const heatBar = screen.getByTestId('heat-bar')
      expect(heatBar).toBeInTheDocument()

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
    })
  })

  describe('Bug Issues List', () => {
    it('should display bug issues section when file has issues', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [42, 55, 101])

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('bug-issues-section')).toBeInTheDocument()
      expect(screen.getByText('Related Bug Issues')).toBeInTheDocument()
    })

    it('should not display bug issues section when file has no issues', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [])

      render(<FileDetail file={file} />)

      expect(screen.queryByTestId('bug-issues-section')).not.toBeInTheDocument()
    })

    it('should display clickable issue badges', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [42, 55])

      render(<FileDetail file={file} />)

      expect(screen.getByTestId('issue-badge-42')).toHaveTextContent('#42')
      expect(screen.getByTestId('issue-badge-55')).toHaveTextContent('#55')
    })

    it('should call onViewIssue when issue badge is clicked', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [42])
      const onViewIssue = vi.fn()

      render(<FileDetail file={file} onViewIssue={onViewIssue} />)

      fireEvent.click(screen.getByTestId('issue-badge-42'))

      expect(onViewIssue).toHaveBeenCalledWith(42)
    })

    it('should not throw when onViewIssue is not provided', () => {
      const file = createMockFile('src/index.ts', 0.5, 10, [42])

      render(<FileDetail file={file} />)

      expect(() => {
        fireEvent.click(screen.getByTestId('issue-badge-42'))
      }).not.toThrow()
    })
  })
})

describe('formatRelativeDate', () => {
  it('should return "Never" for null input', () => {
    expect(formatRelativeDate(null)).toBe('Never')
  })

  it('should return "Just now" for very recent dates', () => {
    const now = new Date().toISOString()
    expect(formatRelativeDate(now)).toBe('Just now')
  })

  it('should format minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeDate(fiveMinutesAgo)).toBe('5 minutes ago')
  })

  it('should format singular minute', () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString()
    expect(formatRelativeDate(oneMinuteAgo)).toBe('1 minute ago')
  })

  it('should format hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(threeHoursAgo)).toBe('3 hours ago')
  })

  it('should format singular hour', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(oneHourAgo)).toBe('1 hour ago')
  })

  it('should format days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(twoDaysAgo)).toBe('2 days ago')
  })

  it('should format singular day', () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(oneDayAgo)).toBe('1 day ago')
  })

  it('should format weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(twoWeeksAgo)).toBe('2 weeks ago')
  })

  it('should format months ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(twoMonthsAgo)).toBe('2 months ago')
  })

  it('should format years ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeDate(twoYearsAgo)).toBe('2 years ago')
  })
})

describe('HotSpotsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<HotSpotsList cwd="/test/path" />)

      expect(screen.getByTestId('hotspots-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading hot spots...')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockRejectedValue(
        new Error('Failed to load')
      )

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspots-error')).toBeInTheDocument()
        expect(screen.getByText('Failed to load')).toBeInTheDocument()
      })
    })

    it('should have retry button on error', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockRejectedValue(
        new Error('Failed to load')
      )

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button clicked', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots)
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValueOnce([createMockFile('src/index.ts', 0.9, 50)])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspots-error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /retry/i }))

      await waitFor(() => {
        expect(screen.getByTestId('hotspots-list')).toBeInTheDocument()
      })

      expect(window.tikiDesktop.heatmap.getHotspots).toHaveBeenCalledTimes(2)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no hot spots', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspots-empty')).toBeInTheDocument()
        expect(screen.getByText('No hot spots found')).toBeInTheDocument()
      })
    })
  })

  describe('Hot Spots Display', () => {
    it('should display list of hot spots', async () => {
      const mockFiles = [
        createMockFile('src/index.ts', 0.95, 50),
        createMockFile('src/utils.ts', 0.85, 40),
        createMockFile('src/app.tsx', 0.75, 30)
      ]

      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue(mockFiles)

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspots-list')).toBeInTheDocument()
      })

      expect(screen.getByTestId('hotspot-src/index.ts')).toBeInTheDocument()
      expect(screen.getByTestId('hotspot-src/utils.ts')).toBeInTheDocument()
      expect(screen.getByTestId('hotspot-src/app.tsx')).toBeInTheDocument()
    })

    it('should display file name and directory', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([
        createMockFile('src/components/App.tsx', 0.9, 50)
      ])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('App.tsx')).toBeInTheDocument()
        expect(screen.getByText('src/components')).toBeInTheDocument()
      })
    })

    it('should display modification count', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([
        createMockFile('src/index.ts', 0.9, 42)
      ])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('42 mods')).toBeInTheDocument()
      })
    })

    it('should respect limit parameter', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([])

      render(<HotSpotsList cwd="/test/path" limit={10} />)

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.getHotspots).toHaveBeenCalledWith(
          '/test/path',
          10
        )
      })
    })

    it('should use default limit of 5', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.getHotspots).toHaveBeenCalledWith(
          '/test/path',
          5
        )
      })
    })
  })

  describe('File Selection', () => {
    it('should call onFileSelect when a hot spot is clicked', async () => {
      const mockFile = createMockFile('src/index.ts', 0.9, 50)
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([mockFile])
      const onFileSelect = vi.fn()

      render(<HotSpotsList cwd="/test/path" onFileSelect={onFileSelect} />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspot-src/index.ts')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('hotspot-src/index.ts'))

      expect(onFileSelect).toHaveBeenCalledWith(mockFile)
    })

    it('should not throw when onFileSelect is not provided', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([
        createMockFile('src/index.ts', 0.9)
      ])

      render(<HotSpotsList cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('hotspot-src/index.ts')).toBeInTheDocument()
      })

      expect(() => {
        fireEvent.click(screen.getByTestId('hotspot-src/index.ts'))
      }).not.toThrow()
    })
  })

  describe('CWD Changes', () => {
    it('should reload when cwd changes', async () => {
      vi.mocked(window.tikiDesktop.heatmap.getHotspots).mockResolvedValue([])

      const { rerender } = render(<HotSpotsList cwd="/test/path1" />)

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.getHotspots).toHaveBeenCalledWith(
          '/test/path1',
          5
        )
      })

      rerender(<HotSpotsList cwd="/test/path2" />)

      await waitFor(() => {
        expect(window.tikiDesktop.heatmap.getHotspots).toHaveBeenCalledWith(
          '/test/path2',
          5
        )
      })
    })
  })
})

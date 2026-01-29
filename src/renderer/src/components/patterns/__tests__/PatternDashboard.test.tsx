import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PatternDashboard } from '../PatternDashboard'
import { PatternDetail } from '../PatternDetail'
import type {
  FailurePatternPreload,
  FixRecordPreload,
  PreventiveMeasurePreload
} from '../../../../../preload/index'

// Mock pattern data
const mockPattern: FailurePatternPreload = {
  id: 'pattern-1',
  name: 'TypeScript Compilation Error',
  description: 'Repeated type errors in component files due to missing type definitions',
  category: 'code',
  errorSignatures: ['TS2339: Property .* does not exist', "Cannot find module '.*'"],
  filePatterns: ['src/components/**/*.tsx', 'src/types/*.ts'],
  contextIndicators: ['React component', 'TypeScript strict mode'],
  occurrenceCount: 5,
  lastOccurrence: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  affectedIssues: [42, 45, 48],
  successfulFixes: [
    {
      failureId: 'failure-1',
      patternId: 'pattern-1',
      description: 'Added missing type export to index.ts',
      effectiveness: 0.85,
      appliedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      success: true
    },
    {
      failureId: 'failure-2',
      patternId: 'pattern-1',
      description: 'Updated tsconfig paths',
      effectiveness: 0.92,
      appliedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      success: true
    }
  ],
  preventiveMeasures: [
    {
      id: 'measure-1',
      description: 'Run tsc --noEmit before execution',
      type: 'verification',
      automatic: true,
      effectiveness: 0.78,
      application: 'Pre-phase verification step'
    },
    {
      id: 'measure-2',
      description: 'Include type exports in file patterns',
      type: 'context',
      automatic: false,
      effectiveness: 0.65,
      application: 'Phase planning suggestion'
    }
  ],
  createdAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  resolvedAt: null
}

const mockResolvedPattern: FailurePatternPreload = {
  id: 'pattern-2',
  name: 'Test Timeout in CI',
  description: 'Tests timing out in CI environment due to resource constraints',
  category: 'workflow',
  errorSignatures: ['Timeout - Async callback was not invoked within'],
  filePatterns: ['**/*.test.ts', '**/*.spec.ts'],
  contextIndicators: ['CI environment', 'GitHub Actions'],
  occurrenceCount: 3,
  lastOccurrence: new Date(Date.now() - 86400000).toISOString(),
  affectedIssues: [40, 41],
  successfulFixes: [],
  preventiveMeasures: [],
  createdAt: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
  resolvedAt: new Date(Date.now() - 86400000).toISOString()
}

const mockProjectPattern: FailurePatternPreload = {
  id: 'pattern-3',
  name: 'Missing Dependencies',
  description: 'Package dependencies not installed before running build',
  category: 'project',
  errorSignatures: ["Cannot find module '.*'", 'Module not found'],
  filePatterns: ['package.json'],
  contextIndicators: ['npm install', 'fresh checkout'],
  occurrenceCount: 2,
  lastOccurrence: new Date(Date.now() - 172800000).toISOString(),
  affectedIssues: [50],
  successfulFixes: [
    {
      failureId: 'failure-3',
      patternId: 'pattern-3',
      description: 'Added npm install to pre-build steps',
      effectiveness: 1.0,
      appliedAt: new Date(Date.now() - 259200000).toISOString(),
      success: true
    }
  ],
  preventiveMeasures: [
    {
      id: 'measure-3',
      description: 'Always run npm install before build',
      type: 'phase_structure',
      automatic: true,
      effectiveness: 0.95,
      application: 'Add as first phase step'
    }
  ],
  createdAt: new Date(Date.now() - 864000000).toISOString(),
  updatedAt: new Date(Date.now() - 172800000).toISOString(),
  resolvedAt: null
}

// Mock patterns API
const mockPatternsApi = {
  list: vi.fn(),
  get: vi.fn(),
  check: vi.fn(),
  recordFailure: vi.fn(),
  recordFix: vi.fn(),
  analyze: vi.fn(),
  applyPrevention: vi.fn(),
  resolve: vi.fn(),
  delete: vi.fn(),
  top: vi.fn()
}

beforeEach(() => {
  mockPatternsApi.list.mockResolvedValue([mockPattern, mockResolvedPattern, mockProjectPattern])
  mockPatternsApi.get.mockResolvedValue(mockPattern)
  mockPatternsApi.analyze.mockResolvedValue([])
  mockPatternsApi.resolve.mockResolvedValue({ success: true })
  mockPatternsApi.delete.mockResolvedValue({ success: true })
  mockPatternsApi.top.mockResolvedValue([mockPattern])

  // Setup global mock
  window.tikiDesktop = {
    ...window.tikiDesktop,
    patterns: mockPatternsApi
  } as typeof window.tikiDesktop
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PatternDashboard', () => {
  describe('Loading State', () => {
    it('should show loading spinner while fetching patterns', async () => {
      mockPatternsApi.list.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<PatternDashboard cwd="/test/path" />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText(/Loading patterns/i)).toBeInTheDocument()
    })

    it('should display the header while loading', async () => {
      mockPatternsApi.list.mockImplementation(() => new Promise(() => {}))

      render(<PatternDashboard cwd="/test/path" />)

      expect(screen.getByText('Failure Patterns')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error state when API fails', async () => {
      mockPatternsApi.list.mockRejectedValue(new Error('Network error'))

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
      })

      expect(screen.getByText(/Failed to load patterns/i)).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('should show retry button on error', async () => {
      mockPatternsApi.list.mockRejectedValue(new Error('Network error'))

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry loading when retry button is clicked', async () => {
      mockPatternsApi.list.mockRejectedValueOnce(new Error('Network error'))
      mockPatternsApi.list.mockResolvedValueOnce([mockPattern])

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(mockPatternsApi.list).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no patterns exist', async () => {
      mockPatternsApi.list.mockResolvedValue([])

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      expect(screen.getByText(/No patterns detected yet/i)).toBeInTheDocument()
    })

    it('should show analyze suggestion in empty state', async () => {
      mockPatternsApi.list.mockResolvedValue([])

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText(/Click "Analyze Now"/i)).toBeInTheDocument()
      })
    })
  })

  describe('Pattern List Rendering', () => {
    it('should render all patterns after loading', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
      })

      expect(screen.getByText('Test Timeout in CI')).toBeInTheDocument()
      expect(screen.getByText('Missing Dependencies')).toBeInTheDocument()
    })

    it('should display pattern cards with correct info', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('pattern-card')).toHaveLength(3)
      })
    })

    it('should display occurrence count badges', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('5x')).toBeInTheDocument() // mockPattern occurrenceCount
      })
    })

    it('should display category badges', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('category-badge')).toHaveLength(3)
      })

      // Check for different category badges
      expect(screen.getByText('code')).toBeInTheDocument()
      expect(screen.getByText('workflow')).toBeInTheDocument()
      expect(screen.getByText('project')).toBeInTheDocument()
    })

    it('should display resolved badge for resolved patterns', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        const resolvedBadges = screen.getAllByText('Resolved')
        expect(resolvedBadges.length).toBeGreaterThan(0)
      })
    })

    it('should display affected issues count', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('3 issues affected')).toBeInTheDocument() // mockPattern
      })
    })

    it('should sort patterns by occurrence count', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        const cards = screen.getAllByTestId('pattern-card')
        expect(cards).toHaveLength(3)
      })

      // First card should be TypeScript Compilation Error (5 occurrences)
      const occurrenceCounts = screen.getAllByTestId('occurrence-count')
      expect(occurrenceCounts[0]).toHaveTextContent('5x')
    })
  })

  describe('Summary Stats', () => {
    it('should display summary stats', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('stats-card')).toHaveLength(3)
      })
    })

    it('should show correct active patterns count', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        // 2 patterns are not resolved (mockPattern and mockProjectPattern)
        expect(screen.getByText('Active Patterns')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('should show correct resolved count', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        // Find the stats card for Resolved (there are multiple "Resolved" texts)
        const statsCards = screen.getAllByTestId('stats-card')
        const resolvedCard = statsCards.find(card => card.textContent?.includes('Resolved'))
        expect(resolvedCard).toBeInTheDocument()
        // Should show 1 resolved pattern (mockResolvedPattern)
        expect(resolvedCard?.textContent).toContain('1')
      })
    })

    it('should show correct issues affected count', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('Issues Affected')).toBeInTheDocument()
        // Total unique issues: 42, 45, 48, 40, 41, 50 = 6
        expect(screen.getByText('6')).toBeInTheDocument()
      })
    })
  })

  describe('Pattern Selection and Detail', () => {
    it('should show pattern detail when pattern is clicked', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
      })

      const cards = screen.getAllByTestId('pattern-card')
      fireEvent.click(cards[0])

      await waitFor(() => {
        expect(screen.getByTestId('pattern-detail')).toBeInTheDocument()
      })
    })

    it('should highlight selected pattern', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
      })

      const cards = screen.getAllByTestId('pattern-card')
      fireEvent.click(cards[0])

      await waitFor(() => {
        expect(cards[0]).toHaveClass('border-amber-500/50')
      })
    })
  })

  describe('Analyze Action', () => {
    it('should have an analyze button', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('analyze-button')).toBeInTheDocument()
      })
    })

    it('should call analyze when button clicked', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('analyze-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('analyze-button'))

      await waitFor(() => {
        expect(mockPatternsApi.analyze).toHaveBeenCalledWith('/test/path')
      })
    })

    it('should show analyzing state', async () => {
      mockPatternsApi.analyze.mockImplementation(() => new Promise(() => {}))

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('analyze-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('analyze-button'))

      await waitFor(() => {
        expect(screen.getByText(/Analyzing/i)).toBeInTheDocument()
      })
    })

    it('should add new patterns after analysis', async () => {
      const newPattern: FailurePatternPreload = {
        ...mockPattern,
        id: 'pattern-new',
        name: 'New Pattern Found'
      }
      mockPatternsApi.analyze.mockResolvedValue([newPattern])

      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('pattern-card')).toHaveLength(3)
      })

      fireEvent.click(screen.getByTestId('analyze-button'))

      await waitFor(() => {
        expect(screen.getAllByTestId('pattern-card')).toHaveLength(4)
      })

      expect(screen.getByText('New Pattern Found')).toBeInTheDocument()
    })
  })

  describe('Refresh Action', () => {
    it('should have a refresh button', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument()
      })
    })

    it('should refresh patterns when button clicked', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument()
      })

      mockPatternsApi.list.mockClear()
      fireEvent.click(screen.getByTestId('refresh-button'))

      await waitFor(() => {
        expect(mockPatternsApi.list).toHaveBeenCalledWith('/test/path')
      })
    })
  })

  describe('Resolve and Delete Actions', () => {
    it('should resolve pattern when resolve button clicked', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
      })

      // Click on unresolved pattern
      const cards = screen.getAllByTestId('pattern-card')
      fireEvent.click(cards[0])

      await waitFor(() => {
        expect(screen.getByTestId('resolve-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('resolve-button'))

      await waitFor(() => {
        expect(mockPatternsApi.resolve).toHaveBeenCalledWith('/test/path', 'pattern-1')
      })
    })

    it('should delete pattern when delete button clicked', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
      })

      const cards = screen.getAllByTestId('pattern-card')
      fireEvent.click(cards[0])

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('delete-button'))

      await waitFor(() => {
        expect(mockPatternsApi.delete).toHaveBeenCalledWith('/test/path', 'pattern-1')
      })
    })

    it('should remove pattern from list after delete', async () => {
      render(<PatternDashboard cwd="/test/path" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('pattern-card')).toHaveLength(3)
      })

      const cards = screen.getAllByTestId('pattern-card')
      fireEvent.click(cards[0])

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('delete-button'))

      await waitFor(() => {
        expect(screen.getAllByTestId('pattern-card')).toHaveLength(2)
      })
    })
  })
})

describe('PatternDetail', () => {
  const mockResolve = vi.fn()
  const mockDelete = vi.fn()

  beforeEach(() => {
    mockResolve.mockClear()
    mockDelete.mockClear()
  })

  describe('Basic Rendering', () => {
    it('should render pattern name', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('TypeScript Compilation Error')).toBeInTheDocument()
    })

    it('should render pattern description', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(
        screen.getByText(/Repeated type errors in component files/)
      ).toBeInTheDocument()
    })

    it('should render category badge', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('code')).toBeInTheDocument()
    })
  })

  describe('Statistics Display', () => {
    it('should display occurrence count', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('occurrence-count')).toHaveTextContent('5')
    })

    it('should display affected issues count', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('3')).toBeInTheDocument() // 3 affected issues
      expect(screen.getByText('Issues')).toBeInTheDocument()
    })

    it('should display successful fixes count', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('Fixes')).toBeInTheDocument()
    })
  })

  describe('Error Signatures', () => {
    it('should display error signatures section', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('error-signatures')).toBeInTheDocument()
    })

    it('should display all error signatures', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText(/TS2339: Property/)).toBeInTheDocument()
      expect(screen.getByText(/Cannot find module/)).toBeInTheDocument()
    })

    it('should not show error signatures section when empty', () => {
      const patternWithoutSignatures = { ...mockPattern, errorSignatures: [] }
      render(<PatternDetail pattern={patternWithoutSignatures} />)

      expect(screen.queryByTestId('error-signatures')).not.toBeInTheDocument()
    })
  })

  describe('File Patterns', () => {
    it('should display file patterns section', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('file-patterns')).toBeInTheDocument()
    })

    it('should display all file patterns', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('src/components/**/*.tsx')).toBeInTheDocument()
      expect(screen.getByText('src/types/*.ts')).toBeInTheDocument()
    })
  })

  describe('Preventive Measures', () => {
    it('should display preventive measures section', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('preventive-measures')).toBeInTheDocument()
    })

    it('should display measure descriptions', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText(/Run tsc --noEmit before execution/)).toBeInTheDocument()
    })

    it('should display measure effectiveness', () => {
      render(<PatternDetail pattern={mockPattern} />)

      const effectivenessElements = screen.getAllByTestId('measure-effectiveness')
      expect(effectivenessElements.length).toBeGreaterThan(0)
      expect(effectivenessElements[0]).toHaveTextContent('78%')
    })

    it('should display measure types', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('verification')).toBeInTheDocument()
      expect(screen.getByText('context')).toBeInTheDocument()
    })

    it('should display auto badge for automatic measures', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })

  describe('Successful Fixes', () => {
    it('should display successful fixes section', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('successful-fixes')).toBeInTheDocument()
    })

    it('should display fix descriptions', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText(/Added missing type export/)).toBeInTheDocument()
      expect(screen.getByText(/Updated tsconfig paths/)).toBeInTheDocument()
    })

    it('should display fix effectiveness', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('92%')).toBeInTheDocument()
    })
  })

  describe('Affected Issues', () => {
    it('should display affected issues section', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByTestId('affected-issues')).toBeInTheDocument()
    })

    it('should display issue numbers', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.getByText('#42')).toBeInTheDocument()
      expect(screen.getByText('#45')).toBeInTheDocument()
      expect(screen.getByText('#48')).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should show resolve button for unresolved patterns', () => {
      render(<PatternDetail pattern={mockPattern} onResolve={mockResolve} />)

      expect(screen.getByTestId('resolve-button')).toBeInTheDocument()
    })

    it('should call onResolve when resolve button clicked', () => {
      render(<PatternDetail pattern={mockPattern} onResolve={mockResolve} />)

      fireEvent.click(screen.getByTestId('resolve-button'))

      expect(mockResolve).toHaveBeenCalled()
    })

    it('should show resolved badge for resolved patterns', () => {
      render(<PatternDetail pattern={mockResolvedPattern} onResolve={mockResolve} />)

      expect(screen.getByTestId('resolved-badge')).toBeInTheDocument()
      expect(screen.queryByTestId('resolve-button')).not.toBeInTheDocument()
    })

    it('should show delete button when onDelete provided', () => {
      render(<PatternDetail pattern={mockPattern} onDelete={mockDelete} />)

      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    it('should call onDelete when delete button clicked', () => {
      render(<PatternDetail pattern={mockPattern} onDelete={mockDelete} />)

      fireEvent.click(screen.getByTestId('delete-button'))

      expect(mockDelete).toHaveBeenCalled()
    })

    it('should not show delete button when onDelete not provided', () => {
      render(<PatternDetail pattern={mockPattern} />)

      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()
    })
  })

  describe('Category Colors', () => {
    it('should have blue styling for code category', () => {
      render(<PatternDetail pattern={mockPattern} />)

      const categoryBadge = screen.getByText('code')
      expect(categoryBadge).toHaveClass('text-blue-400')
    })

    it('should have purple styling for workflow category', () => {
      render(<PatternDetail pattern={mockResolvedPattern} />)

      const categoryBadge = screen.getByText('workflow')
      expect(categoryBadge).toHaveClass('text-purple-400')
    })

    it('should have green styling for project category', () => {
      render(<PatternDetail pattern={mockProjectPattern} />)

      const categoryBadge = screen.getByText('project')
      expect(categoryBadge).toHaveClass('text-green-400')
    })
  })
})

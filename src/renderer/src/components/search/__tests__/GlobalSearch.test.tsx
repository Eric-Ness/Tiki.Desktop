import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GlobalSearch } from '../GlobalSearch'
import type { SearchResult } from '../../../hooks/useSearch'

// Mock the useSearch hook
const mockSetQuery = vi.fn()
const mockNavigateToResult = vi.fn()
const mockClearSearch = vi.fn()
const mockSearch = vi.fn()

const defaultMockUseSearch = {
  query: '',
  setQuery: mockSetQuery,
  results: [] as SearchResult[],
  isSearching: false,
  error: null as string | null,
  search: mockSearch,
  navigateToResult: mockNavigateToResult,
  recentSearches: [] as string[],
  clearSearch: mockClearSearch
}

let mockUseSearchReturn = { ...defaultMockUseSearch }

vi.mock('../../../hooks/useSearch', () => ({
  useSearch: () => mockUseSearchReturn
}))

describe('GlobalSearch', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearchReturn = { ...defaultMockUseSearch }
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(
        screen.getByPlaceholderText(/search issues, plans, knowledge, releases/i)
      ).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<GlobalSearch isOpen={false} onClose={mockOnClose} />)

      expect(
        screen.queryByPlaceholderText(/search issues, plans, knowledge, releases/i)
      ).not.toBeInTheDocument()
    })

    it('should show search input on open', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText(/search issues, plans, knowledge, releases/i)
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe('INPUT')
    })

    it('should show escape hint keyboard shortcut', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('esc')).toBeInTheDocument()
    })

    it('should show loading spinner when isSearching is true', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        isSearching: true,
        query: 'test'
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // The spinner has animate-spin class
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show error message when error is present', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        error: 'Search failed',
        query: 'test'
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('Search failed')).toBeInTheDocument()
    })

    it('should show "no results" message when query exists but no results', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'nonexistent',
        results: [],
        isSearching: false
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText(/no results found for/i)).toBeInTheDocument()
    })

    it('should show empty state hint when no query and no recent searches', () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText(/start typing to search/i)).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('should call setQuery when typing in the input', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText(/search issues, plans, knowledge, releases/i)

      // Manually trigger onChange since we're controlling the value via mock
      fireEvent.change(input, { target: { value: 'test query' } })

      expect(mockSetQuery).toHaveBeenCalledWith('test query')
    })

    it('should call onClose when Escape key is pressed', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText(/search issues, plans, knowledge, releases/i)
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when clicking the backdrop', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Find the backdrop element (the one with bg-black/60)
      const backdrop = document.querySelector('.bg-black\\/60')
      expect(backdrop).toBeInTheDocument()

      fireEvent.click(backdrop!)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call navigateToResult and onClose when clicking a result', async () => {
      const mockResult: SearchResult = {
        type: 'issue',
        id: '123',
        title: 'Fix Bug in Login',
        preview: 'This is a bug issue description',
        matches: ['bug'],
        score: 0.9
      }

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'bug',
        results: [mockResult]
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Find and click the result - use a function matcher to handle text split by marks
      const resultItem = screen.getByText((content, element) => {
        return element?.tagName === 'DIV' &&
               element?.className.includes('font-medium') &&
               element?.textContent === 'Fix Bug in Login'
      })
      fireEvent.click(resultItem.closest('.cursor-pointer')!)

      expect(mockNavigateToResult).toHaveBeenCalledWith(mockResult)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call clearSearch when component closes', () => {
      const { rerender } = render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Close the component
      rerender(<GlobalSearch isOpen={false} onClose={mockOnClose} />)

      expect(mockClearSearch).toHaveBeenCalled()
    })

    it('should select result with Enter key when highlighted', async () => {
      const mockResult: SearchResult = {
        type: 'issue',
        id: '123',
        title: 'Test Issue',
        preview: 'This is a test',
        matches: ['test'],
        score: 0.9
      }

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: [mockResult]
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')
      fireEvent.keyDown(container!, { key: 'Enter' })

      expect(mockNavigateToResult).toHaveBeenCalledWith(mockResult)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should move highlight down with ArrowDown key', async () => {
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'First Issue', preview: '', matches: [], score: 0.9 },
        { type: 'issue', id: '2', title: 'Second Issue', preview: '', matches: [], score: 0.8 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')

      // Initial state: first item highlighted
      let firstItem = screen.getByText('First Issue').closest('.cursor-pointer')
      expect(firstItem).toHaveClass('bg-background-tertiary')

      // Press ArrowDown
      fireEvent.keyDown(container!, { key: 'ArrowDown' })

      // Second item should be highlighted
      const secondItem = screen.getByText('Second Issue').closest('.cursor-pointer')
      expect(secondItem).toHaveClass('bg-background-tertiary')
    })

    it('should move highlight up with ArrowUp key', async () => {
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'First Issue', preview: '', matches: [], score: 0.9 },
        { type: 'issue', id: '2', title: 'Second Issue', preview: '', matches: [], score: 0.8 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')

      // Press ArrowDown first to highlight second item
      fireEvent.keyDown(container!, { key: 'ArrowDown' })

      // Press ArrowUp
      fireEvent.keyDown(container!, { key: 'ArrowUp' })

      // First item should be highlighted again
      const firstItem = screen.getByText('First Issue').closest('.cursor-pointer')
      expect(firstItem).toHaveClass('bg-background-tertiary')
    })

    it('should wrap to first item when pressing ArrowDown at the end', async () => {
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'First Issue', preview: '', matches: [], score: 0.9 },
        { type: 'issue', id: '2', title: 'Second Issue', preview: '', matches: [], score: 0.8 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')

      // Press ArrowDown twice (go to second, then wrap to first)
      fireEvent.keyDown(container!, { key: 'ArrowDown' })
      fireEvent.keyDown(container!, { key: 'ArrowDown' })

      // First item should be highlighted again
      const firstItem = screen.getByText('First Issue').closest('.cursor-pointer')
      expect(firstItem).toHaveClass('bg-background-tertiary')
    })

    it('should wrap to last item when pressing ArrowUp at the beginning', async () => {
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'First Issue', preview: '', matches: [], score: 0.9 },
        { type: 'issue', id: '2', title: 'Second Issue', preview: '', matches: [], score: 0.8 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')

      // Press ArrowUp from first position (should wrap to last)
      fireEvent.keyDown(container!, { key: 'ArrowUp' })

      // Second item should be highlighted
      const secondItem = screen.getByText('Second Issue').closest('.cursor-pointer')
      expect(secondItem).toHaveClass('bg-background-tertiary')
    })
  })

  describe('Results Display', () => {
    it('should display results grouped by type', () => {
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'Test Issue', preview: '', matches: [], score: 0.9 },
        { type: 'plan', id: 'plan-1', title: 'Test Plan', preview: '', matches: [], score: 0.8 },
        { type: 'release', id: 'v1.0.0', title: 'Release v1.0.0', preview: '', matches: [], score: 0.7 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Check that group headers are present
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Plans')).toBeInTheDocument()
      expect(screen.getByText('Releases')).toBeInTheDocument()
    })

    it('should highlight matching text in results', () => {
      const mockResults: SearchResult[] = [
        {
          type: 'issue',
          id: '1',
          title: 'Fix authentication bug',
          preview: 'The authentication system has a bug',
          matches: ['authentication'],
          score: 0.9
        }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'authentication',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Look for mark elements (highlighting)
      const highlights = document.querySelectorAll('mark')
      expect(highlights.length).toBeGreaterThan(0)

      // Check that the highlighted text contains the query
      const markTexts = Array.from(highlights).map((m) => m.textContent?.toLowerCase())
      expect(markTexts.some((text) => text?.includes('authentication'))).toBe(true)
    })

    it('should show result preview text', () => {
      const mockResults: SearchResult[] = [
        {
          type: 'issue',
          id: '1',
          title: 'Test Issue',
          preview: 'This is the preview text for the issue',
          matches: [],
          score: 0.9
        }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText(/this is the preview text/i)).toBeInTheDocument()
    })
  })

  describe('Recent Searches', () => {
    it('should show recent searches when query is empty', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        recentSearches: ['authentication bug', 'release notes', 'api docs']
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('Recent Searches')).toBeInTheDocument()
      expect(screen.getByText('authentication bug')).toBeInTheDocument()
      expect(screen.getByText('release notes')).toBeInTheDocument()
      expect(screen.getByText('api docs')).toBeInTheDocument()
    })

    it('should set query when clicking a recent search', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        recentSearches: ['authentication bug']
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const recentSearchItem = screen.getByText('authentication bug')
      fireEvent.click(recentSearchItem.closest('.cursor-pointer')!)

      expect(mockSetQuery).toHaveBeenCalledWith('authentication bug')
    })

    it('should navigate recent searches with arrow keys', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        recentSearches: ['first search', 'second search']
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')

      // First item should be highlighted initially
      let firstItem = screen.getByText('first search').closest('.cursor-pointer')
      expect(firstItem).toHaveClass('bg-background-tertiary')

      // Press ArrowDown
      fireEvent.keyDown(container!, { key: 'ArrowDown' })

      // Second item should be highlighted
      const secondItem = screen.getByText('second search').closest('.cursor-pointer')
      expect(secondItem).toHaveClass('bg-background-tertiary')
    })

    it('should select recent search with Enter key', () => {
      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        recentSearches: ['authentication bug']
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector('.fixed.inset-0')
      fireEvent.keyDown(container!, { key: 'Enter' })

      expect(mockSetQuery).toHaveBeenCalledWith('authentication bug')
    })
  })

  describe('Focus Management', () => {
    it('should focus the input when opened', async () => {
      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText(/search issues, plans, knowledge, releases/i)

      // Wait for the focus effect to run
      await waitFor(() => {
        expect(document.activeElement).toBe(input)
      })
    })
  })

  describe('Content Types', () => {
    it('should display all content types with correct labels', () => {
      // Use titles that don't contain the query to avoid highlighting issues
      const mockResults: SearchResult[] = [
        { type: 'issue', id: '1', title: 'Bug Fix', preview: 'Some test content', matches: [], score: 0.9 },
        { type: 'plan', id: 'plan-1', title: 'Feature Plan', preview: 'Some test content', matches: [], score: 0.8 },
        { type: 'knowledge', id: 'kb-1', title: 'API Documentation', preview: 'Some test content', matches: [], score: 0.7 },
        { type: 'release', id: 'v1.0.0', title: 'Version 1.0.0', preview: 'Some test content', matches: [], score: 0.6 }
      ]

      mockUseSearchReturn = {
        ...defaultMockUseSearch,
        query: 'test',
        results: mockResults
      }

      render(<GlobalSearch isOpen={true} onClose={mockOnClose} />)

      // Check all category headers
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Plans')).toBeInTheDocument()
      expect(screen.getByText('Knowledge')).toBeInTheDocument()
      expect(screen.getByText('Releases')).toBeInTheDocument()

      // Check all results (using exact match since titles don't contain the query)
      expect(screen.getByText('Bug Fix')).toBeInTheDocument()
      expect(screen.getByText('Feature Plan')).toBeInTheDocument()
      expect(screen.getByText('API Documentation')).toBeInTheDocument()
      expect(screen.getByText('Version 1.0.0')).toBeInTheDocument()
    })
  })
})

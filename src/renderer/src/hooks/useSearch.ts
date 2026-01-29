import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Content types that can be searched
 */
export type ContentType = 'issue' | 'plan' | 'release' | 'knowledge'

/**
 * Search result from the search service
 */
export interface SearchResult {
  type: ContentType
  id: string
  title: string
  preview: string
  matches: string[]
  score: number
}

/**
 * Options for search queries
 */
export interface SearchOptions {
  types?: ContentType[]
  limit?: number
}

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 150

/**
 * Hook interface for search results
 */
interface UseSearchResult {
  /** Current search query */
  query: string
  /** Set the search query */
  setQuery: (query: string) => void
  /** Search results */
  results: SearchResult[]
  /** Whether a search is in progress */
  isSearching: boolean
  /** Error message if search failed */
  error: string | null
  /** Execute search immediately */
  search: (query: string, options?: SearchOptions) => Promise<void>
  /** Navigate to a search result */
  navigateToResult: (result: SearchResult) => void
  /** Recent searches from store */
  recentSearches: string[]
  /** Clear the current search */
  clearSearch: () => void
}

/**
 * Hook for managing search state and performing debounced searches
 */
export function useSearch(): UseSearchResult {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>('')

  // Store selectors
  const recentSearches = useTikiStore((state) => state.recentSearches)
  const addRecentSearch = useTikiStore((state) => state.addRecentSearch)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)
  const setActiveTab = useTikiStore((state) => state.setActiveTab)

  /**
   * Execute a search query
   */
  const executeSearch = useCallback(async (searchQuery: string, options?: SearchOptions) => {
    const trimmedQuery = searchQuery.trim()

    // Clear results for empty query
    if (!trimmedQuery) {
      setResults([])
      setError(null)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const searchResults = await window.tikiDesktop.search.query(trimmedQuery, options)
      setResults(searchResults)

      // Add to recent searches if we got results
      if (searchResults.length > 0) {
        addRecentSearch(trimmedQuery)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [addRecentSearch])

  /**
   * Set query with debounced search
   */
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)
    lastQueryRef.current = newQuery

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Clear results immediately for empty query
    if (!newQuery.trim()) {
      setResults([])
      setError(null)
      setIsSearching(false)
      return
    }

    // Set searching state immediately for feedback
    setIsSearching(true)

    // Debounce the actual search
    debounceTimerRef.current = setTimeout(() => {
      // Only execute if query hasn't changed
      if (lastQueryRef.current === newQuery) {
        executeSearch(newQuery)
      }
    }, DEBOUNCE_DELAY)
  }, [executeSearch])

  /**
   * Search immediately without debouncing
   */
  const search = useCallback(async (searchQuery: string, options?: SearchOptions) => {
    // Clear any pending debounced search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setQueryState(searchQuery)
    lastQueryRef.current = searchQuery
    await executeSearch(searchQuery, options)
  }, [executeSearch])

  /**
   * Navigate to a search result
   */
  const navigateToResult = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'issue':
        // Issue ID is the issue number as string
        setSelectedIssue(parseInt(result.id, 10))
        // Ensure sidebar shows issues section (issues are visible in default sidebar)
        break

      case 'plan': {
        // Plan ID format is "plan-{issueNumber}"
        const planIssueNumber = parseInt(result.id.replace('plan-', ''), 10)
        setSelectedIssue(planIssueNumber)
        setActiveTab('workflow')
        break
      }

      case 'release':
        // Release ID is the version string
        setSelectedRelease(result.id)
        break

      case 'knowledge':
        // Knowledge ID is the entry ID
        setSelectedKnowledge(result.id)
        break
    }
  }, [setSelectedIssue, setSelectedRelease, setSelectedKnowledge, setActiveTab])

  /**
   * Clear the current search
   */
  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setQueryState('')
    setResults([])
    setError(null)
    setIsSearching(false)
    lastQueryRef.current = ''
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return useMemo(() => ({
    query,
    setQuery,
    results,
    isSearching,
    error,
    search,
    navigateToResult,
    recentSearches,
    clearSearch
  }), [query, setQuery, results, isSearching, error, search, navigateToResult, recentSearches, clearSearch])
}

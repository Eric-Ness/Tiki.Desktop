import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearch, SearchResult } from '../../hooks/useSearch'
import { SearchResults } from './SearchResults'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const {
    query,
    setQuery,
    results,
    isSearching,
    error,
    navigateToResult,
    recentSearches,
    clearSearch
  } = useSearch()

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when search closes
  useEffect(() => {
    if (!isOpen) {
      clearSearch()
      setHighlightedIndex(0)
    }
  }, [isOpen, clearSearch])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  // Get flattened list of all results for keyboard navigation
  const flatResults = results

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigateToResult(result)
      onClose()
    },
    [navigateToResult, onClose]
  )

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback(
    (searchTerm: string) => {
      setQuery(searchTerm)
    },
    [setQuery]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break

        case 'ArrowDown':
          e.preventDefault()
          if (query && flatResults.length > 0) {
            setHighlightedIndex((prev) =>
              prev < flatResults.length - 1 ? prev + 1 : 0
            )
          } else if (!query && recentSearches.length > 0) {
            setHighlightedIndex((prev) =>
              prev < recentSearches.length - 1 ? prev + 1 : 0
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (query && flatResults.length > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : flatResults.length - 1
            )
          } else if (!query && recentSearches.length > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : recentSearches.length - 1
            )
          }
          break

        case 'Enter':
          e.preventDefault()
          if (query && flatResults.length > 0 && flatResults[highlightedIndex]) {
            handleSelect(flatResults[highlightedIndex])
          } else if (!query && recentSearches.length > 0 && recentSearches[highlightedIndex]) {
            handleRecentSearchSelect(recentSearches[highlightedIndex])
          }
          break
      }
    },
    [onClose, query, flatResults, recentSearches, highlightedIndex, handleSelect, handleRecentSearchSelect]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Container */}
      <div className="absolute inset-0 flex items-start justify-center pt-[20vh]">
        <div className="w-[560px] max-h-[400px] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3">
            <svg
              className="w-4 h-4 text-slate-500 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues, plans, knowledge, releases..."
              className="flex-1 py-3 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            {isSearching && (
              <svg
                className="w-4 h-4 text-slate-500 mr-2 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-500 bg-background-tertiary rounded border border-border">
              esc
            </kbd>
          </div>

          {/* Results Area */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {error && (
              <div className="py-6 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            {!error && query && results.length === 0 && !isSearching && (
              <div className="py-6 text-center text-sm text-slate-500">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {!error && query && results.length > 0 && (
              <SearchResults
                results={results}
                onSelect={handleSelect}
                highlightedIndex={highlightedIndex}
                searchQuery={query}
              />
            )}

            {!error && !query && recentSearches.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <div
                    key={search}
                    onClick={() => handleRecentSearchSelect(search)}
                    className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer text-sm transition-colors
                      ${
                        index === highlightedIndex
                          ? 'bg-background-tertiary text-slate-100'
                          : 'hover:bg-background-tertiary'
                      }`}
                  >
                    <svg
                      className="w-4 h-4 text-slate-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-slate-300">{search}</span>
                  </div>
                ))}
              </div>
            )}

            {!error && !query && recentSearches.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-500">
                Start typing to search across all content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

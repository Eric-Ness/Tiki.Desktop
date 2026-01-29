import { useMemo } from 'react'
import type { SearchResult, ContentType } from '../../hooks/useSearch'

interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
  highlightedIndex: number
  searchQuery: string
}

/**
 * Type icons for different content types
 */
const TypeIcons: Record<ContentType, React.ReactNode> = {
  issue: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  plan: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  knowledge: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  release: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

/**
 * Background colors for type icons
 */
const TypeIconColors: Record<ContentType, string> = {
  issue: 'bg-blue-900/30 text-blue-400',
  plan: 'bg-purple-900/30 text-purple-400',
  knowledge: 'bg-emerald-900/30 text-emerald-400',
  release: 'bg-amber-900/30 text-amber-400'
}

/**
 * Display names for content types
 */
const TypeLabels: Record<ContentType, string> = {
  issue: 'Issues',
  plan: 'Plans',
  knowledge: 'Knowledge',
  release: 'Releases'
}

/**
 * Highlight matching text in a string
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text
  }

  const parts: React.ReactNode[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let lastIndex = 0

  let index = lowerText.indexOf(lowerQuery)
  let keyIndex = 0

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }

    // Add highlighted match
    parts.push(
      <mark
        key={keyIndex++}
        className="bg-amber-500/30 text-amber-200 rounded px-0.5"
      >
        {text.slice(index, index + query.length)}
      </mark>
    )

    lastIndex = index + query.length
    index = lowerText.indexOf(lowerQuery, lastIndex)
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

/**
 * Group results by content type
 */
function groupResultsByType(results: SearchResult[]): Map<ContentType, SearchResult[]> {
  const groups = new Map<ContentType, SearchResult[]>()

  // Define type order
  const typeOrder: ContentType[] = ['issue', 'plan', 'knowledge', 'release']

  // Initialize groups in order
  for (const type of typeOrder) {
    groups.set(type, [])
  }

  // Group results
  for (const result of results) {
    const group = groups.get(result.type)
    if (group) {
      group.push(result)
    }
  }

  // Remove empty groups
  for (const [type, items] of groups) {
    if (items.length === 0) {
      groups.delete(type)
    }
  }

  return groups
}

export function SearchResults({
  results,
  onSelect,
  highlightedIndex,
  searchQuery
}: SearchResultsProps) {
  // Group results by type
  const groupedResults = useMemo(() => groupResultsByType(results), [results])

  // Track current flat index for keyboard navigation highlighting
  let currentFlatIndex = 0

  return (
    <div className="space-y-2">
      {Array.from(groupedResults.entries()).map(([type, items]) => (
        <div key={type}>
          {/* Category Header */}
          <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
            {TypeLabels[type]}
          </div>

          {/* Results in this category */}
          {items.map((result) => {
            const flatIndex = currentFlatIndex++
            const isHighlighted = flatIndex === highlightedIndex

            return (
              <SearchResultItem
                key={`${result.type}-${result.id}`}
                result={result}
                isHighlighted={isHighlighted}
                searchQuery={searchQuery}
                onClick={() => onSelect(result)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult
  isHighlighted: boolean
  searchQuery: string
  onClick: () => void
}

function SearchResultItem({
  result,
  isHighlighted,
  searchQuery,
  onClick
}: SearchResultItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-3 py-2 rounded cursor-pointer text-sm transition-colors
        ${
          isHighlighted
            ? 'bg-background-tertiary text-slate-100'
            : 'hover:bg-background-tertiary'
        }`}
    >
      {/* Type Icon */}
      <div
        className={`w-6 h-6 flex items-center justify-center rounded flex-shrink-0 mt-0.5 ${TypeIconColors[result.type]}`}
      >
        {TypeIcons[result.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="font-medium text-slate-200 truncate">
          {highlightMatches(result.title, searchQuery)}
        </div>

        {/* Preview */}
        {result.preview && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
            {highlightMatches(result.preview, searchQuery)}
          </p>
        )}
      </div>

      {/* Score badge (optional - can be removed in production) */}
      {/* <div className="text-xs text-slate-600 flex-shrink-0">
        {result.score.toFixed(1)}
      </div> */}
    </div>
  )
}

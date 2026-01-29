/**
 * Search Service
 *
 * Provides cross-content search functionality across issues, plans, releases, and knowledge.
 * Uses simple includes()-based matching for efficient in-memory search.
 */

/**
 * Content types that can be searched
 */
export type ContentType = 'issue' | 'plan' | 'release' | 'knowledge'

/**
 * Base interface for all searchable content
 */
export interface SearchableContent {
  type: ContentType
  id: string
  title: string
  body?: string
  labels?: string[]
  tags?: string[]
}

/**
 * Search result returned by the search service
 */
export interface SearchResult {
  /** Content type */
  type: ContentType
  /** Unique identifier */
  id: string
  /** Title of the content */
  title: string
  /** Preview snippet with match context */
  preview: string
  /** Fields that matched the query */
  matches: string[]
  /** Relevance score (higher = more relevant) */
  score: number
}

/**
 * Options for search queries
 */
export interface SearchOptions {
  /** Filter by content types */
  types?: ContentType[]
  /** Maximum number of results */
  limit?: number
}

/**
 * Score weights for different match types
 */
const SCORE_WEIGHTS = {
  title: 10,
  body: 3,
  labels: 5,
  tags: 5
}

/**
 * Maximum preview length
 */
const MAX_PREVIEW_LENGTH = 150

/**
 * Context characters around a match in preview
 */
const PREVIEW_CONTEXT = 50

/**
 * Search Service
 *
 * Indexes and searches across all content types (issues, plans, releases, knowledge).
 */
export class SearchService {
  private index: Map<ContentType, SearchableContent[]> = new Map()

  /**
   * Update the index for a specific content type
   * Replaces any existing items of that type
   *
   * @param type The content type to index
   * @param items Array of searchable content items
   */
  updateIndex(type: ContentType, items: SearchableContent[]): void {
    this.index.set(type, items)
  }

  /**
   * Search across indexed content
   *
   * @param query The search query string
   * @param options Optional search options (types filter, limit)
   * @returns Array of search results sorted by score descending
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    // Empty or whitespace-only query returns no results
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return []
    }

    const queryLower = trimmedQuery.toLowerCase()
    const results: SearchResult[] = []

    // Determine which content types to search
    const typesToSearch = this.getTypesToSearch(options?.types)

    // Search each content type
    for (const type of typesToSearch) {
      const items = this.index.get(type) || []

      for (const item of items) {
        const matchResult = this.matchItem(item, queryLower)

        if (matchResult.matches.length > 0) {
          results.push({
            type: item.type,
            id: item.id,
            title: item.title,
            preview: this.generatePreview(item, queryLower, matchResult.matches),
            matches: matchResult.matches,
            score: matchResult.score
          })
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply limit if specified
    if (options?.limit && options.limit > 0) {
      return results.slice(0, options.limit)
    }

    return results
  }

  /**
   * Clear all indexed content
   */
  clearIndex(): void {
    this.index.clear()
  }

  /**
   * Determine which content types to search based on options
   */
  private getTypesToSearch(types?: ContentType[]): ContentType[] {
    // If no types specified or empty array, search all indexed types
    if (!types || types.length === 0) {
      return Array.from(this.index.keys())
    }
    return types
  }

  /**
   * Match an item against the query and calculate score
   */
  private matchItem(
    item: SearchableContent,
    queryLower: string
  ): { matches: string[]; score: number } {
    const matches: string[] = []
    let score = 0

    // Check title match
    if (item.title.toLowerCase().includes(queryLower)) {
      matches.push('title')
      score += SCORE_WEIGHTS.title
    }

    // Check body match
    const body = item.body || ''
    if (body.toLowerCase().includes(queryLower)) {
      matches.push('body')
      score += SCORE_WEIGHTS.body
    }

    // Check labels match
    const labels = item.labels || []
    if (labels.some((label) => label.toLowerCase().includes(queryLower))) {
      matches.push('labels')
      score += SCORE_WEIGHTS.labels
    }

    // Check tags match (for knowledge entries)
    const tags = item.tags || []
    if (tags.some((tag) => tag.toLowerCase().includes(queryLower))) {
      matches.push('tags')
      score += SCORE_WEIGHTS.tags
    }

    return { matches, score }
  }

  /**
   * Generate a preview snippet with match context
   */
  private generatePreview(
    item: SearchableContent,
    queryLower: string,
    matches: string[]
  ): string {
    // Prefer showing body match context, fall back to title
    const body = item.body || ''

    // If body matches, show context around the match
    if (matches.includes('body') && body) {
      const bodyLower = body.toLowerCase()
      const matchIndex = bodyLower.indexOf(queryLower)

      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - PREVIEW_CONTEXT)
        const end = Math.min(body.length, matchIndex + queryLower.length + PREVIEW_CONTEXT)

        let preview = body.slice(start, end)

        // Add ellipsis if truncated
        if (start > 0) {
          preview = '...' + preview
        }
        if (end < body.length) {
          preview = preview + '...'
        }

        // Clean up newlines and extra whitespace
        preview = preview.replace(/\s+/g, ' ').trim()

        return preview.slice(0, MAX_PREVIEW_LENGTH)
      }
    }

    // Fall back to title or truncated body
    if (body) {
      const truncated = body.slice(0, MAX_PREVIEW_LENGTH).replace(/\s+/g, ' ').trim()
      return truncated.length < body.length ? truncated + '...' : truncated
    }

    return item.title
  }
}

/**
 * Singleton instance for convenience
 */
export const searchService = new SearchService()

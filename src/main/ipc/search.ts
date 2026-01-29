import { ipcMain } from 'electron'
import {
  searchService,
  type ContentType,
  type SearchableContent,
  type SearchOptions
} from '../services/search-service'

export function registerSearchHandlers(): void {
  // Execute search query
  ipcMain.handle(
    'search:query',
    async (
      _,
      { query, options }: { query: string; options?: SearchOptions }
    ) => {
      return searchService.search(query, options)
    }
  )

  // Update index for a content type
  ipcMain.handle(
    'search:update-index',
    async (
      _,
      { type, items }: { type: ContentType; items: SearchableContent[] }
    ) => {
      searchService.updateIndex(type, items)
      return { success: true }
    }
  )

  // Clear entire search index
  ipcMain.handle('search:clear-index', async () => {
    searchService.clearIndex()
    return { success: true }
  })
}

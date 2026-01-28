import { ipcMain } from 'electron'
import {
  listKnowledgeEntries,
  getKnowledgeEntry,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeTags,
  type KnowledgeCategory
} from '../services/knowledge-service'

export function registerKnowledgeHandlers(): void {
  // List all entries (with optional filters)
  ipcMain.handle(
    'knowledge:list',
    async (
      _,
      {
        projectPath,
        category,
        search
      }: { projectPath: string; category?: KnowledgeCategory; search?: string }
    ) => {
      return listKnowledgeEntries(projectPath, { category, search })
    }
  )

  // Get single entry
  ipcMain.handle(
    'knowledge:get',
    async (_, { projectPath, id }: { projectPath: string; id: string }) => {
      return getKnowledgeEntry(projectPath, id)
    }
  )

  // Create new entry
  ipcMain.handle(
    'knowledge:create',
    async (
      _,
      {
        projectPath,
        title,
        category,
        content,
        tags,
        sourceIssue
      }: {
        projectPath: string
        title: string
        category: KnowledgeCategory
        content: string
        tags?: string[]
        sourceIssue?: number
      }
    ) => {
      return createKnowledgeEntry(projectPath, {
        title,
        category,
        content,
        tags,
        sourceIssue
      })
    }
  )

  // Update existing entry
  ipcMain.handle(
    'knowledge:update',
    async (
      _,
      {
        projectPath,
        id,
        data
      }: {
        projectPath: string
        id: string
        data: Partial<{
          title: string
          category: KnowledgeCategory
          content: string
          tags: string[]
          sourceIssue: number | null
        }>
      }
    ) => {
      return updateKnowledgeEntry(projectPath, id, data)
    }
  )

  // Delete entry
  ipcMain.handle(
    'knowledge:delete',
    async (_, { projectPath, id }: { projectPath: string; id: string }) => {
      return deleteKnowledgeEntry(projectPath, id)
    }
  )

  // Get all tags
  ipcMain.handle('knowledge:tags', async (_, { projectPath }: { projectPath: string }) => {
    return getKnowledgeTags(projectPath)
  })
}

import { ipcMain, shell } from 'electron'
import { readFile, getLanguageFromPath } from '../services/code-preview-service'

export function registerCodeHandlers(): void {
  // code:read-file - Read file content with language detection
  ipcMain.handle(
    'code:read-file',
    async (_, { cwd, filePath }: { cwd: string; filePath: string }) => {
      return readFile(cwd, filePath)
    }
  )

  // code:get-language - Get language from file path
  ipcMain.handle('code:get-language', (_, { filePath }: { filePath: string }) => {
    return getLanguageFromPath(filePath)
  })

  // code:open-in-editor - Open file in default system editor
  ipcMain.handle('code:open-in-editor', async (_, { filePath }: { filePath: string }) => {
    await shell.openPath(filePath)
    return { success: true }
  })
}

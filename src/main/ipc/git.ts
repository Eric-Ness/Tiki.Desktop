import { ipcMain } from 'electron'
import { getFileDiff, getChangedFiles, getDiffStats } from '../services/git-service'

export function registerGitHandlers(): void {
  // Get diff for a specific file
  ipcMain.handle(
    'git:get-file-diff',
    async (
      _,
      { cwd, filePath, fromRef, toRef }: { cwd: string; filePath: string; fromRef?: string; toRef?: string }
    ) => {
      return getFileDiff(cwd, filePath, fromRef, toRef)
    }
  )

  // Get list of changed files
  ipcMain.handle(
    'git:get-changed-files',
    async (_, { cwd, fromRef, toRef }: { cwd: string; fromRef?: string; toRef?: string }) => {
      return getChangedFiles(cwd, fromRef, toRef)
    }
  )

  // Get diff statistics (aggregated)
  ipcMain.handle(
    'git:get-diff-stats',
    async (_, { cwd, fromRef, toRef }: { cwd: string; fromRef?: string; toRef?: string }) => {
      return getDiffStats(cwd, fromRef, toRef)
    }
  )
}

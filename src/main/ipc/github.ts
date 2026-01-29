import { ipcMain } from 'electron'
import {
  getIssues,
  getIssue,
  refreshIssues,
  openIssueInBrowser,
  checkGhCli
} from '../services/github-bridge'
import { getPRForIssue, getPRChecks } from '../services/pr-service'

// Track current project path
let currentProjectPath: string = process.cwd()

export function setGitHubProjectPath(path: string): void {
  currentProjectPath = path
}

export function registerGitHubHandlers(): void {
  // Check if gh CLI is available
  ipcMain.handle('github:check-cli', async () => {
    return checkGhCli()
  })

  // Get all issues
  ipcMain.handle(
    'github:get-issues',
    async (_, { state, cwd }: { state?: 'open' | 'closed' | 'all'; cwd?: string }) => {
      return getIssues(state || 'open', cwd)
    }
  )

  // Get single issue
  ipcMain.handle('github:get-issue', async (_, { number, cwd }: { number: number; cwd?: string }) => {
    return getIssue(number, cwd)
  })

  // Refresh issues (force refresh)
  ipcMain.handle('github:refresh', async (_, { cwd }: { cwd?: string }) => {
    await refreshIssues(cwd)
  })

  // Open issue in browser
  ipcMain.handle('github:open-in-browser', async (_, { number, cwd }: { number: number; cwd?: string }) => {
    await openIssueInBrowser(number, cwd)
  })

  // Get PR for an issue
  ipcMain.handle('github:get-pr-for-issue', async (_, issueNumber: number) => {
    return getPRForIssue(currentProjectPath, issueNumber)
  })

  // Get PR checks
  ipcMain.handle('github:get-pr-checks', async (_, prNumber: number) => {
    return getPRChecks(currentProjectPath, prNumber)
  })
}

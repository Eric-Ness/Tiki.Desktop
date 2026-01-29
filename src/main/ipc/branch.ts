import { ipcMain } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  branchService,
  BranchInfo,
  WorkingTreeStatus,
  GitOperationResult,
  CreateBranchOptions,
  SwitchBranchOptions,
  IssueInfo
} from '../services/branch-service'

/**
 * Branch-issue associations stored in .tiki/branches.json
 */
interface BranchAssociations {
  [branchName: string]: {
    issueNumber: number
    createdAt: string
  }
}

/**
 * Get the path to branches.json for a project
 */
function getBranchesFilePath(cwd: string): string {
  return path.join(cwd, '.tiki', 'branches.json')
}

/**
 * Read branch associations from .tiki/branches.json
 */
async function readBranchAssociations(cwd: string): Promise<BranchAssociations> {
  const filePath = getBranchesFilePath(cwd)
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as BranchAssociations
  } catch {
    return {}
  }
}

/**
 * Write branch associations to .tiki/branches.json
 */
async function writeBranchAssociations(
  cwd: string,
  associations: BranchAssociations
): Promise<void> {
  const filePath = getBranchesFilePath(cwd)
  const tikiDir = path.dirname(filePath)

  // Ensure .tiki directory exists
  await fs.mkdir(tikiDir, { recursive: true })

  await fs.writeFile(filePath, JSON.stringify(associations, null, 2), 'utf-8')
}

export function registerBranchHandlers(): void {
  // List all branches with metadata
  ipcMain.handle(
    'branch:list',
    async (_, { cwd }: { cwd: string }): Promise<BranchInfo[]> => {
      return branchService.listBranches(cwd)
    }
  )

  // Get current branch details
  ipcMain.handle(
    'branch:current',
    async (_, { cwd }: { cwd: string }): Promise<BranchInfo> => {
      return branchService.getCurrentBranch(cwd)
    }
  )

  // Create new branch
  ipcMain.handle(
    'branch:create',
    async (_, { cwd, options }: { cwd: string; options: CreateBranchOptions }): Promise<GitOperationResult> => {
      return branchService.createBranch(cwd, options)
    }
  )

  // Switch to branch (with dirty check result)
  ipcMain.handle(
    'branch:switch',
    async (
      _,
      { cwd, branchName, options }: { cwd: string; branchName: string; options?: SwitchBranchOptions }
    ): Promise<GitOperationResult> => {
      return branchService.switchBranch(cwd, branchName, options)
    }
  )

  // Delete branch
  ipcMain.handle(
    'branch:delete',
    async (
      _,
      { cwd, branchName, force }: { cwd: string; branchName: string; force?: boolean }
    ): Promise<GitOperationResult> => {
      return branchService.deleteBranch(cwd, branchName, force)
    }
  )

  // Push branch to remote
  ipcMain.handle(
    'branch:push',
    async (_, { cwd, branchName }: { cwd: string; branchName: string }): Promise<GitOperationResult> => {
      return branchService.pushBranch(cwd, branchName)
    }
  )

  // Get uncommitted changes status
  ipcMain.handle(
    'branch:working-tree-status',
    async (_, { cwd }: { cwd: string }): Promise<WorkingTreeStatus> => {
      return branchService.checkWorkingTree(cwd)
    }
  )

  // Associate branch with issue (store in .tiki/branches.json)
  ipcMain.handle(
    'branch:associate-issue',
    async (
      _,
      { cwd, branchName, issueNumber }: { cwd: string; branchName: string; issueNumber: number }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const associations = await readBranchAssociations(cwd)
        associations[branchName] = {
          issueNumber,
          createdAt: new Date().toISOString()
        }
        await writeBranchAssociations(cwd, associations)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: message }
      }
    }
  )

  // Get branch associated with issue
  ipcMain.handle(
    'branch:get-for-issue',
    async (
      _,
      { cwd, issueNumber }: { cwd: string; issueNumber: number }
    ): Promise<{ branchName: string; createdAt: string } | null> => {
      const associations = await readBranchAssociations(cwd)

      for (const [branchName, info] of Object.entries(associations)) {
        if (info.issueNumber === issueNumber) {
          return { branchName, createdAt: info.createdAt }
        }
      }

      return null
    }
  )

  // Generate branch name from issue
  ipcMain.handle(
    'branch:generate-name',
    async (
      _,
      { issue, pattern }: { issue: IssueInfo; pattern?: string }
    ): Promise<string> => {
      return branchService.generateBranchName(issue, pattern)
    }
  )
}

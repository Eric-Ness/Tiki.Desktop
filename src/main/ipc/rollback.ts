import { ipcMain, BrowserWindow } from 'electron'
import {
  rollbackService,
  RollbackScope,
  RollbackTarget,
  RollbackOptions,
  RollbackPreview,
  RollbackResult,
  Checkpoint
} from '../services/rollback-service'
import { commitTrackerService, CommitTracking } from '../services/commit-tracker'

/**
 * Register IPC handlers for rollback operations
 */
export function registerRollbackHandlers(): void {
  // Get preview of rollback operation
  ipcMain.handle(
    'rollback:preview',
    async (
      _,
      { scope, target, cwd }: { scope: RollbackScope; target: RollbackTarget; cwd: string }
    ): Promise<RollbackPreview> => {
      return rollbackService.previewRollback(scope, target, cwd)
    }
  )

  // Execute rollback operation
  ipcMain.handle(
    'rollback:execute',
    async (
      _,
      {
        scope,
        target,
        options,
        cwd
      }: {
        scope: RollbackScope
        target: RollbackTarget
        options: RollbackOptions
        cwd: string
      }
    ): Promise<RollbackResult> => {
      return rollbackService.executeRollback(scope, target, options, cwd)
    }
  )

  // Get tracked commits for an issue
  ipcMain.handle(
    'rollback:get-issue-commits',
    async (
      _,
      { cwd, issueNumber }: { cwd: string; issueNumber: number }
    ): Promise<CommitTracking[]> => {
      return commitTrackerService.getCommitsForIssue(cwd, issueNumber)
    }
  )

  // Get tracked commits for a specific phase
  ipcMain.handle(
    'rollback:get-phase-commits',
    async (
      _,
      { cwd, issueNumber, phaseNumber }: { cwd: string; issueNumber: number; phaseNumber: number }
    ): Promise<CommitTracking[]> => {
      return commitTrackerService.getCommitsForPhase(cwd, issueNumber, phaseNumber)
    }
  )

  // Create a checkpoint at HEAD
  ipcMain.handle(
    'rollback:create-checkpoint',
    async (
      _,
      {
        name,
        issueNumber,
        cwd,
        description
      }: {
        name: string
        issueNumber?: number
        cwd: string
        description?: string
      }
    ): Promise<Checkpoint> => {
      return rollbackService.createCheckpoint(name, issueNumber, cwd, description)
    }
  )

  // List all checkpoints
  ipcMain.handle(
    'rollback:list-checkpoints',
    async (_, { cwd }: { cwd: string }): Promise<Checkpoint[]> => {
      return rollbackService.listCheckpoints(cwd)
    }
  )

  // Delete a checkpoint
  ipcMain.handle(
    'rollback:delete-checkpoint',
    async (_, { id, cwd }: { id: string; cwd: string }): Promise<boolean> => {
      return rollbackService.deleteCheckpoint(id, cwd)
    }
  )

  // Rollback to a checkpoint
  ipcMain.handle(
    'rollback:to-checkpoint',
    async (
      _,
      {
        id,
        options,
        cwd
      }: {
        id: string
        options: RollbackOptions
        cwd: string
      }
    ): Promise<RollbackResult> => {
      return rollbackService.rollbackToCheckpoint(id, options, cwd)
    }
  )
}

/**
 * Send rollback progress event to renderer
 * Can be used by rollback service for long-running operations
 */
export function sendRollbackProgress(
  window: BrowserWindow,
  data: {
    stage: 'preparing' | 'reverting' | 'resetting' | 'completing'
    current: number
    total: number
    message: string
  }
): void {
  window.webContents.send('rollback:progress', data)
}

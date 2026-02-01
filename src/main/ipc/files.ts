/**
 * File Operations IPC Handlers
 *
 * Provides filesystem operations for the Development Layout Mode.
 * All operations are async and return structured results.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import chokidar, { type FSWatcher } from 'chokidar'

// ============================================================================
// TYPES
// ============================================================================

interface DirectoryEntry {
  name: string
  path: string
  type: 'file' | 'directory'
}

interface ListDirectoryResult {
  success: boolean
  entries?: DirectoryEntry[]
  error?: string
}

interface FileOperationResult {
  success: boolean
  error?: string
}

interface FileChangeEvent {
  type: 'add' | 'unlink' | 'addDir' | 'unlinkDir' | 'change'
  path: string
}

// ============================================================================
// FILE WATCHER MANAGEMENT
// ============================================================================

// Track active watchers by directory path
const watchers = new Map<string, FSWatcher>()

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

export function registerFilesHandlers(): void {
  /**
   * List directory contents
   *
   * Returns files and directories sorted with directories first,
   * then alphabetically. Hidden files (starting with .) are excluded
   * except for .tiki which is project-relevant.
   */
  ipcMain.handle(
    'files:list-directory',
    async (
      _event: IpcMainInvokeEvent,
      { dirPath }: { dirPath: string }
    ): Promise<ListDirectoryResult> => {
      try {
        // Validate path exists and is a directory
        const stat = await fs.stat(dirPath)
        if (!stat.isDirectory()) {
          return { success: false, error: 'Path is not a directory' }
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        const result: DirectoryEntry[] = entries
          // Filter out hidden files except .tiki
          .filter((entry) => {
            if (entry.name.startsWith('.')) {
              return entry.name === '.tiki'
            }
            return true
          })
          // Exclude common non-essential directories
          .filter((entry) => {
            const excluded = [
              'node_modules',
              '.git',
              'dist',
              'out',
              '.next',
              '__pycache__',
              '.turbo',
              '.cache'
            ]
            return !excluded.includes(entry.name)
          })
          // Map to our structure
          .map((entry) => ({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            type: entry.isDirectory() ? ('directory' as const) : ('file' as const)
          }))
          // Sort: directories first, then alphabetically
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1
            }
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          })

        return { success: true, entries: result }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        // Provide user-friendly error messages
        if (message.includes('ENOENT')) {
          return { success: false, error: 'Directory does not exist' }
        }
        if (message.includes('EACCES')) {
          return { success: false, error: 'Permission denied' }
        }

        return { success: false, error: message }
      }
    }
  )

  /**
   * Write content to a file
   *
   * Overwrites existing file or creates new one.
   * Parent directories must exist.
   */
  ipcMain.handle(
    'files:write-file',
    async (
      _event: IpcMainInvokeEvent,
      { filePath, content }: { filePath: string; content: string }
    ): Promise<FileOperationResult> => {
      try {
        await fs.writeFile(filePath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (message.includes('ENOENT')) {
          return { success: false, error: 'Parent directory does not exist' }
        }
        if (message.includes('EACCES')) {
          return { success: false, error: 'Permission denied' }
        }

        return { success: false, error: message }
      }
    }
  )

  /**
   * Create a new file
   *
   * Fails if file already exists (use write-file for overwrite).
   */
  ipcMain.handle(
    'files:create-file',
    async (
      _event: IpcMainInvokeEvent,
      { filePath, content = '' }: { filePath: string; content?: string }
    ): Promise<FileOperationResult> => {
      try {
        // Check if file already exists
        try {
          await fs.access(filePath)
          return { success: false, error: 'File already exists' }
        } catch {
          // File does not exist, good to create
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(filePath)
        await fs.mkdir(parentDir, { recursive: true })

        await fs.writeFile(filePath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  /**
   * Create a new directory
   *
   * Creates parent directories if they do not exist.
   */
  ipcMain.handle(
    'files:create-directory',
    async (
      _event: IpcMainInvokeEvent,
      { dirPath }: { dirPath: string }
    ): Promise<FileOperationResult> => {
      try {
        await fs.mkdir(dirPath, { recursive: true })
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  /**
   * Rename a file or directory
   *
   * Can also be used to move files by providing a different parent path.
   */
  ipcMain.handle(
    'files:rename',
    async (
      _event: IpcMainInvokeEvent,
      { oldPath, newPath }: { oldPath: string; newPath: string }
    ): Promise<FileOperationResult> => {
      try {
        // Check source exists
        try {
          await fs.access(oldPath)
        } catch {
          return { success: false, error: 'Source file does not exist' }
        }

        // Check destination does not exist
        try {
          await fs.access(newPath)
          return { success: false, error: 'Destination already exists' }
        } catch {
          // Good, destination does not exist
        }

        await fs.rename(oldPath, newPath)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  /**
   * Delete a file or directory
   *
   * Directories are deleted recursively.
   * Use with caution!
   */
  ipcMain.handle(
    'files:delete',
    async (
      _event: IpcMainInvokeEvent,
      { targetPath }: { targetPath: string }
    ): Promise<FileOperationResult> => {
      try {
        const stat = await fs.stat(targetPath)

        if (stat.isDirectory()) {
          await fs.rm(targetPath, { recursive: true })
        } else {
          await fs.unlink(targetPath)
        }

        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        if (message.includes('ENOENT')) {
          return { success: false, error: 'File or directory does not exist' }
        }
        if (message.includes('EACCES')) {
          return { success: false, error: 'Permission denied' }
        }

        return { success: false, error: message }
      }
    }
  )

  /**
   * Start watching a directory for changes
   *
   * Sends file:changed events to the renderer when files are added/removed/changed.
   * Only watches immediate children (depth: 1) for performance.
   */
  ipcMain.handle(
    'files:watch-start',
    async (
      event: IpcMainInvokeEvent,
      { dirPath }: { dirPath: string }
    ): Promise<{ success: boolean; watcherId?: string; error?: string }> => {
      try {
        const watcherId = dirPath

        // Already watching this directory
        if (watchers.has(watcherId)) {
          return { success: true, watcherId }
        }

        const watcher = chokidar.watch(dirPath, {
          // Ignore hidden files except .tiki
          ignored: /(^|[\\/])\.(?!tiki)/,
          persistent: true,
          depth: 1, // Only immediate children for performance
          ignoreInitial: true // Do not fire events for existing files
        })

        // Send events to renderer
        const sendEvent = (type: FileChangeEvent['type'], filePath: string) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('files:changed', { type, path: filePath })
          }
        }

        watcher.on('add', (filePath) => sendEvent('add', filePath))
        watcher.on('unlink', (filePath) => sendEvent('unlink', filePath))
        watcher.on('addDir', (filePath) => sendEvent('addDir', filePath))
        watcher.on('unlinkDir', (filePath) => sendEvent('unlinkDir', filePath))
        watcher.on('change', (filePath) => sendEvent('change', filePath))

        watcher.on('error', (error) => {
          console.error('File watcher error:', error)
        })

        watchers.set(watcherId, watcher)
        return { success: true, watcherId }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  /**
   * Stop watching a directory
   *
   * Call this when navigating away or closing the file explorer.
   */
  ipcMain.handle(
    'files:watch-stop',
    async (
      _event: IpcMainInvokeEvent,
      { watcherId }: { watcherId: string }
    ): Promise<FileOperationResult> => {
      try {
        const watcher = watchers.get(watcherId)
        if (watcher) {
          await watcher.close()
          watchers.delete(watcherId)
        }
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )

  /**
   * Get file stats
   *
   * Returns file size, modification time, etc.
   */
  ipcMain.handle(
    'files:stat',
    async (
      _event: IpcMainInvokeEvent,
      { filePath }: { filePath: string }
    ): Promise<{
      success: boolean
      stats?: {
        size: number
        isDirectory: boolean
        isFile: boolean
        mtime: string
        ctime: string
      }
      error?: string
    }> => {
      try {
        const stats = await fs.stat(filePath)
        return {
          success: true,
          stats: {
            size: stats.size,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            mtime: stats.mtime.toISOString(),
            ctime: stats.ctime.toISOString()
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }
  )
}

/**
 * Stop all active watchers
 *
 * Called when app is closing or project is switched.
 */
export async function stopAllFileWatchers(): Promise<void> {
  const closePromises = Array.from(watchers.values()).map((w) => w.close())
  await Promise.all(closePromises)
  watchers.clear()
}

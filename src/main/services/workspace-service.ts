import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'

/**
 * Snapshot of a terminal tab
 */
export interface TerminalSnapshot {
  id: string
  name: string
  cwd: string
}

/**
 * Snapshot of the UI layout state
 */
export interface LayoutSnapshot {
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  sidebarWidth: number
  detailPanelWidth: number
}

/**
 * Complete workspace snapshot including terminal, UI, and context state
 */
export interface WorkspaceSnapshot {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string

  // Terminal state
  terminals: TerminalSnapshot[]
  activeTerminal?: string

  // UI state
  layout: LayoutSnapshot
  activeTab: string

  // Context
  activeIssue?: number
  currentPhase?: number
  selectedNode?: string

  // Metadata
  size: number // Bytes
}

/**
 * Options for capturing a workspace snapshot
 */
export interface CaptureOptions {
  name: string
  description?: string
}

/**
 * Options for restoring a workspace snapshot
 */
export interface RestoreOptions {
  keepExistingTerminals?: boolean
}

/**
 * Storage usage information
 */
export interface StorageInfo {
  used: number
  limit: number
  snapshots: number
}

/**
 * Index file structure for tracking snapshots
 */
interface SnapshotIndex {
  snapshots: SnapshotIndexEntry[]
}

/**
 * Entry in the snapshot index
 */
interface SnapshotIndexEntry {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  size: number
}

/**
 * Input type for saveSnapshot - excludes auto-generated fields
 */
type SnapshotInput = Omit<WorkspaceSnapshot, 'id' | 'createdAt' | 'updatedAt' | 'size'>

/**
 * Default storage limit: 50 MB
 */
const DEFAULT_STORAGE_LIMIT = 50 * 1024 * 1024

/**
 * Simple mutex for synchronizing file operations
 */
class SimpleMutex {
  private locked = false
  private queue: (() => void)[] = []

  async acquire(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.locked) {
        this.locked = true
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      next()
    } else {
      this.locked = false
    }
  }
}

/**
 * Service for managing workspace snapshots
 *
 * Provides functionality to save, restore, list, and delete workspace snapshots.
 * Snapshots capture the complete workspace state including terminal tabs, UI layout,
 * and context information (active issue, phase, etc.).
 *
 * Storage format:
 * - Base directory: .tiki-desktop/workspaces/
 * - Index file: index.json (list of all snapshots)
 * - Individual files: {id}.json (full snapshot data)
 */
export class WorkspaceService {
  private basePath: string
  private indexPath: string
  private mutex: SimpleMutex

  /**
   * Create a new WorkspaceService
   * @param basePath - Base directory for storing workspaces (e.g., .tiki-desktop/workspaces/)
   */
  constructor(basePath: string) {
    this.basePath = basePath
    this.indexPath = path.join(basePath, 'index.json')
    this.mutex = new SimpleMutex()
  }

  /**
   * Ensure the workspaces directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true })
    } catch {
      // Directory may already exist, ignore error
    }
  }

  /**
   * Load the snapshot index, creating an empty one if it doesn't exist
   */
  private async loadIndex(): Promise<SnapshotIndex> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.snapshots)) {
        return parsed as SnapshotIndex
      }
      return { snapshots: [] }
    } catch {
      return { snapshots: [] }
    }
  }

  /**
   * Save the snapshot index
   */
  private async saveIndex(index: SnapshotIndex): Promise<void> {
    await this.ensureDirectory()
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8')
  }

  /**
   * Get the file path for a snapshot
   */
  private getSnapshotPath(id: string): string {
    return path.join(this.basePath, `${id}.json`)
  }

  /**
   * Calculate the size of a snapshot in bytes
   */
  private calculateSize(snapshot: WorkspaceSnapshot): number {
    const json = JSON.stringify(snapshot, null, 2)
    return Buffer.byteLength(json, 'utf-8')
  }

  /**
   * Save a workspace snapshot
   *
   * @param input - Snapshot data without auto-generated fields (id, timestamps, size)
   * @returns The saved snapshot with all fields populated
   */
  async saveSnapshot(input: SnapshotInput): Promise<WorkspaceSnapshot> {
    await this.ensureDirectory()

    const now = new Date().toISOString()
    const id = randomUUID()

    // Create the full snapshot object with a placeholder size
    const snapshot: WorkspaceSnapshot = {
      id,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
      terminals: input.terminals,
      activeTerminal: input.activeTerminal,
      layout: input.layout,
      activeTab: input.activeTab,
      activeIssue: input.activeIssue,
      currentPhase: input.currentPhase,
      selectedNode: input.selectedNode,
      size: 0 // Will be calculated
    }

    // Calculate the final size by iterating until stable
    // (the size field itself affects the serialized length)
    let prevSize = -1
    while (snapshot.size !== prevSize) {
      prevSize = snapshot.size
      const jsonContent = JSON.stringify(snapshot, null, 2)
      snapshot.size = Buffer.byteLength(jsonContent, 'utf-8')
    }

    // Serialize to final content
    const finalContent = JSON.stringify(snapshot, null, 2)

    // Save the snapshot file
    const snapshotPath = this.getSnapshotPath(id)
    await fs.writeFile(snapshotPath, finalContent, 'utf-8')

    // Use mutex to safely update the index
    await this.mutex.acquire()
    try {
      const index = await this.loadIndex()
      const indexEntry: SnapshotIndexEntry = {
        id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        size: snapshot.size
      }
      index.snapshots.push(indexEntry)
      await this.saveIndex(index)
    } finally {
      this.mutex.release()
    }

    return snapshot
  }

  /**
   * Get a snapshot by ID
   *
   * @param id - Snapshot ID
   * @returns The snapshot, or null if not found or corrupted
   */
  async getSnapshot(id: string): Promise<WorkspaceSnapshot | null> {
    try {
      const snapshotPath = this.getSnapshotPath(id)
      const content = await fs.readFile(snapshotPath, 'utf-8')
      const snapshot = JSON.parse(content) as WorkspaceSnapshot

      // Validate basic structure
      if (!snapshot || typeof snapshot !== 'object' || !snapshot.id) {
        return null
      }

      return snapshot
    } catch {
      return null
    }
  }

  /**
   * List all snapshots
   *
   * @returns Array of snapshots, sorted by updatedAt descending (most recent first)
   */
  async listSnapshots(): Promise<WorkspaceSnapshot[]> {
    const index = await this.loadIndex()
    const snapshots: WorkspaceSnapshot[] = []

    for (const entry of index.snapshots) {
      const snapshot = await this.getSnapshot(entry.id)
      if (snapshot) {
        snapshots.push(snapshot)
      }
    }

    // Sort by updatedAt descending
    snapshots.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return snapshots
  }

  /**
   * Delete a snapshot
   *
   * @param id - Snapshot ID to delete
   * @returns true if deleted, false if not found
   */
  async deleteSnapshot(id: string): Promise<boolean> {
    const index = await this.loadIndex()
    const entryIndex = index.snapshots.findIndex(s => s.id === id)

    if (entryIndex === -1) {
      return false
    }

    // Remove from index
    index.snapshots.splice(entryIndex, 1)
    await this.saveIndex(index)

    // Delete the snapshot file (ignore errors if file doesn't exist)
    try {
      await fs.unlink(this.getSnapshotPath(id))
    } catch {
      // File may already be deleted, ignore
    }

    return true
  }

  /**
   * Rename a snapshot
   *
   * @param id - Snapshot ID
   * @param name - New name
   * @returns Updated snapshot, or null if not found
   */
  async renameSnapshot(id: string, name: string): Promise<WorkspaceSnapshot | null> {
    const snapshot = await this.getSnapshot(id)
    if (!snapshot) {
      return null
    }

    // Update the snapshot
    snapshot.name = name
    snapshot.updatedAt = new Date().toISOString()
    snapshot.size = this.calculateSize(snapshot)

    // Save the updated snapshot file
    await fs.writeFile(
      this.getSnapshotPath(id),
      JSON.stringify(snapshot, null, 2),
      'utf-8'
    )

    // Update the index
    const index = await this.loadIndex()
    const entry = index.snapshots.find(s => s.id === id)
    if (entry) {
      entry.name = name
      entry.updatedAt = snapshot.updatedAt
      entry.size = snapshot.size
      await this.saveIndex(index)
    }

    return snapshot
  }

  /**
   * Get storage usage information
   *
   * @returns Storage info with used bytes, limit, and snapshot count
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const index = await this.loadIndex()

    // Calculate total used space from valid snapshots
    let used = 0
    let validCount = 0

    for (const entry of index.snapshots) {
      const snapshot = await this.getSnapshot(entry.id)
      if (snapshot) {
        used += snapshot.size
        validCount++
      }
    }

    return {
      used,
      limit: DEFAULT_STORAGE_LIMIT,
      snapshots: validCount
    }
  }
}

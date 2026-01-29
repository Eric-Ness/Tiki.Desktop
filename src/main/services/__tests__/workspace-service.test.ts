/**
 * @vitest-environment node
 *
 * Comprehensive tests for WorkspaceService
 * Tests workspace snapshot save, restore, list, delete, and rename functionality
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  WorkspaceService,
  type WorkspaceSnapshot,
  type TerminalSnapshot,
  type LayoutSnapshot
} from '../workspace-service'

describe('WorkspaceService', () => {
  let tempDir: string
  let workspacesDir: string
  let service: WorkspaceService

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-service-test-'))
    workspacesDir = path.join(tempDir, 'workspaces')
    service = new WorkspaceService(workspacesDir)
  })

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  // Helper to create a valid snapshot input (without id, createdAt, updatedAt, size)
  function createSnapshotInput(overrides?: Partial<Omit<WorkspaceSnapshot, 'id' | 'createdAt' | 'updatedAt' | 'size'>>) {
    const terminals: TerminalSnapshot[] = [
      { id: 'term-1', name: 'Terminal 1', cwd: '/home/user/project' },
      { id: 'term-2', name: 'Build', cwd: '/home/user/project/src' }
    ]

    const layout: LayoutSnapshot = {
      sidebarCollapsed: false,
      detailPanelCollapsed: false,
      sidebarWidth: 300,
      detailPanelWidth: 400
    }

    return {
      name: 'Test Snapshot',
      description: 'A test snapshot',
      terminals,
      activeTerminal: 'term-1',
      layout,
      activeTab: 'terminal',
      activeIssue: 42,
      currentPhase: 2,
      selectedNode: 'node-1',
      ...overrides
    }
  }

  describe('Interface Types', () => {
    it('should define TerminalSnapshot with required fields', () => {
      const terminal: TerminalSnapshot = {
        id: 'term-1',
        name: 'Terminal',
        cwd: '/path/to/dir'
      }

      expect(terminal.id).toBe('term-1')
      expect(terminal.name).toBe('Terminal')
      expect(terminal.cwd).toBe('/path/to/dir')
    })

    it('should define LayoutSnapshot with required fields', () => {
      const layout: LayoutSnapshot = {
        sidebarCollapsed: true,
        detailPanelCollapsed: false,
        sidebarWidth: 250,
        detailPanelWidth: 350
      }

      expect(layout.sidebarCollapsed).toBe(true)
      expect(layout.detailPanelCollapsed).toBe(false)
      expect(layout.sidebarWidth).toBe(250)
      expect(layout.detailPanelWidth).toBe(350)
    })

    it('should define WorkspaceSnapshot with all required fields', () => {
      const snapshot: WorkspaceSnapshot = {
        id: 'snap-1',
        name: 'My Snapshot',
        description: 'Description',
        createdAt: '2024-01-15T12:00:00.000Z',
        updatedAt: '2024-01-15T12:00:00.000Z',
        terminals: [],
        activeTerminal: undefined,
        layout: {
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          sidebarWidth: 300,
          detailPanelWidth: 400
        },
        activeTab: 'terminal',
        activeIssue: 42,
        currentPhase: 1,
        selectedNode: 'node-1',
        size: 100
      }

      expect(snapshot.id).toBe('snap-1')
      expect(snapshot.name).toBe('My Snapshot')
      expect(snapshot.description).toBe('Description')
      expect(snapshot.createdAt).toBe('2024-01-15T12:00:00.000Z')
      expect(snapshot.updatedAt).toBe('2024-01-15T12:00:00.000Z')
      expect(snapshot.terminals).toEqual([])
      expect(snapshot.activeTerminal).toBeUndefined()
      expect(snapshot.layout).toBeDefined()
      expect(snapshot.activeTab).toBe('terminal')
      expect(snapshot.activeIssue).toBe(42)
      expect(snapshot.currentPhase).toBe(1)
      expect(snapshot.selectedNode).toBe('node-1')
      expect(snapshot.size).toBe(100)
    })

    it('should allow optional fields to be undefined', () => {
      const snapshot: WorkspaceSnapshot = {
        id: 'snap-1',
        name: 'Minimal Snapshot',
        createdAt: '2024-01-15T12:00:00.000Z',
        updatedAt: '2024-01-15T12:00:00.000Z',
        terminals: [],
        layout: {
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          sidebarWidth: 300,
          detailPanelWidth: 400
        },
        activeTab: 'issues',
        size: 50
      }

      expect(snapshot.description).toBeUndefined()
      expect(snapshot.activeTerminal).toBeUndefined()
      expect(snapshot.activeIssue).toBeUndefined()
      expect(snapshot.currentPhase).toBeUndefined()
      expect(snapshot.selectedNode).toBeUndefined()
    })
  })

  describe('constructor', () => {
    it('should create workspaces directory if it does not exist', async () => {
      // Directory doesn't exist yet
      expect(fs.existsSync(workspacesDir)).toBe(false)

      // Save a snapshot to trigger directory creation
      await service.saveSnapshot(createSnapshotInput())

      // Directory should now exist
      expect(fs.existsSync(workspacesDir)).toBe(true)
    })

    it('should work with existing workspaces directory', async () => {
      // Pre-create the directory
      fs.mkdirSync(workspacesDir, { recursive: true })
      expect(fs.existsSync(workspacesDir)).toBe(true)

      // Should still work
      const snapshot = await service.saveSnapshot(createSnapshotInput())
      expect(snapshot.id).toBeDefined()
    })
  })

  describe('saveSnapshot', () => {
    it('should save a snapshot and return it with generated fields', async () => {
      const input = createSnapshotInput({ name: 'My Workspace' })

      const snapshot = await service.saveSnapshot(input)

      expect(snapshot.id).toBeDefined()
      expect(snapshot.id.length).toBeGreaterThan(0)
      expect(snapshot.name).toBe('My Workspace')
      expect(snapshot.description).toBe('A test snapshot')
      expect(snapshot.createdAt).toBeDefined()
      expect(snapshot.updatedAt).toBeDefined()
      expect(snapshot.size).toBeGreaterThan(0)
    })

    it('should generate a UUID for the snapshot id', async () => {
      const snapshot = await service.saveSnapshot(createSnapshotInput())

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(snapshot.id).toMatch(uuidRegex)
    })

    it('should set createdAt and updatedAt to current time', async () => {
      const before = new Date()
      const snapshot = await service.saveSnapshot(createSnapshotInput())
      const after = new Date()

      const createdAt = new Date(snapshot.createdAt)
      const updatedAt = new Date(snapshot.updatedAt)

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(updatedAt.getTime()).toBe(createdAt.getTime())
    })

    it('should calculate size as JSON string length in bytes', async () => {
      const input = createSnapshotInput()
      const snapshot = await service.saveSnapshot(input)

      // Read the saved file and check its size
      const filePath = path.join(workspacesDir, `${snapshot.id}.json`)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const fileSize = Buffer.byteLength(fileContent, 'utf-8')

      // The size should match the actual file size
      expect(snapshot.size).toBe(fileSize)
      // Size should be reasonable (greater than zero)
      expect(snapshot.size).toBeGreaterThan(0)
    })

    it('should save snapshot to individual file', async () => {
      const snapshot = await service.saveSnapshot(createSnapshotInput())

      const filePath = path.join(workspacesDir, `${snapshot.id}.json`)
      expect(fs.existsSync(filePath)).toBe(true)

      const savedData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      expect(savedData.id).toBe(snapshot.id)
      expect(savedData.name).toBe(snapshot.name)
    })

    it('should update index.json with new snapshot entry', async () => {
      const snapshot = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 1' }))

      const indexPath = path.join(workspacesDir, 'index.json')
      expect(fs.existsSync(indexPath)).toBe(true)

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      expect(index.snapshots).toHaveLength(1)
      expect(index.snapshots[0].id).toBe(snapshot.id)
      expect(index.snapshots[0].name).toBe('Snapshot 1')
    })

    it('should preserve all terminal data', async () => {
      const terminals: TerminalSnapshot[] = [
        { id: 'term-1', name: 'Terminal 1', cwd: '/home/user/project' },
        { id: 'term-2', name: 'Build Server', cwd: '/home/user/project/build' }
      ]
      const input = createSnapshotInput({ terminals, activeTerminal: 'term-2' })

      const snapshot = await service.saveSnapshot(input)

      expect(snapshot.terminals).toHaveLength(2)
      expect(snapshot.terminals[0].id).toBe('term-1')
      expect(snapshot.terminals[0].name).toBe('Terminal 1')
      expect(snapshot.terminals[1].id).toBe('term-2')
      expect(snapshot.activeTerminal).toBe('term-2')
    })

    it('should preserve all layout data', async () => {
      const layout: LayoutSnapshot = {
        sidebarCollapsed: true,
        detailPanelCollapsed: true,
        sidebarWidth: 200,
        detailPanelWidth: 500
      }
      const input = createSnapshotInput({ layout })

      const snapshot = await service.saveSnapshot(input)

      expect(snapshot.layout.sidebarCollapsed).toBe(true)
      expect(snapshot.layout.detailPanelCollapsed).toBe(true)
      expect(snapshot.layout.sidebarWidth).toBe(200)
      expect(snapshot.layout.detailPanelWidth).toBe(500)
    })

    it('should preserve context fields', async () => {
      const input = createSnapshotInput({
        activeIssue: 123,
        currentPhase: 3,
        selectedNode: 'phase-3-node'
      })

      const snapshot = await service.saveSnapshot(input)

      expect(snapshot.activeIssue).toBe(123)
      expect(snapshot.currentPhase).toBe(3)
      expect(snapshot.selectedNode).toBe('phase-3-node')
    })

    it('should handle snapshot without optional fields', async () => {
      const input = {
        name: 'Minimal Snapshot',
        terminals: [],
        layout: {
          sidebarCollapsed: false,
          detailPanelCollapsed: false,
          sidebarWidth: 300,
          detailPanelWidth: 400
        },
        activeTab: 'issues'
      }

      const snapshot = await service.saveSnapshot(input)

      expect(snapshot.id).toBeDefined()
      expect(snapshot.name).toBe('Minimal Snapshot')
      expect(snapshot.description).toBeUndefined()
      expect(snapshot.activeTerminal).toBeUndefined()
      expect(snapshot.activeIssue).toBeUndefined()
      expect(snapshot.currentPhase).toBeUndefined()
      expect(snapshot.selectedNode).toBeUndefined()
    })

    it('should save multiple snapshots with unique IDs', async () => {
      const snapshot1 = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 1' }))
      const snapshot2 = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 2' }))
      const snapshot3 = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 3' }))

      expect(snapshot1.id).not.toBe(snapshot2.id)
      expect(snapshot2.id).not.toBe(snapshot3.id)
      expect(snapshot1.id).not.toBe(snapshot3.id)

      // All should be in index
      const indexPath = path.join(workspacesDir, 'index.json')
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      expect(index.snapshots).toHaveLength(3)
    })
  })

  describe('getSnapshot', () => {
    it('should retrieve a saved snapshot by ID', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput({ name: 'Find Me' }))

      const retrieved = await service.getSnapshot(saved.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(saved.id)
      expect(retrieved!.name).toBe('Find Me')
    })

    it('should return null for non-existent ID', async () => {
      const result = await service.getSnapshot('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return full snapshot with all fields', async () => {
      const input = createSnapshotInput({
        name: 'Full Snapshot',
        description: 'Complete data',
        activeIssue: 99,
        currentPhase: 5
      })
      const saved = await service.saveSnapshot(input)

      const retrieved = await service.getSnapshot(saved.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.name).toBe('Full Snapshot')
      expect(retrieved!.description).toBe('Complete data')
      expect(retrieved!.terminals).toEqual(input.terminals)
      expect(retrieved!.layout).toEqual(input.layout)
      expect(retrieved!.activeIssue).toBe(99)
      expect(retrieved!.currentPhase).toBe(5)
      expect(retrieved!.size).toBeGreaterThan(0)
    })

    it('should handle corrupted snapshot file gracefully', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      // Corrupt the file
      const filePath = path.join(workspacesDir, `${saved.id}.json`)
      fs.writeFileSync(filePath, 'invalid json {{{')

      const result = await service.getSnapshot(saved.id)

      expect(result).toBeNull()
    })

    it('should handle missing snapshot file (file deleted but in index)', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      // Delete the snapshot file but leave the index entry
      const filePath = path.join(workspacesDir, `${saved.id}.json`)
      fs.unlinkSync(filePath)

      const result = await service.getSnapshot(saved.id)

      expect(result).toBeNull()
    })
  })

  describe('listSnapshots', () => {
    it('should return empty array when no snapshots exist', async () => {
      const snapshots = await service.listSnapshots()

      expect(snapshots).toEqual([])
    })

    it('should return all saved snapshots', async () => {
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 1' }))
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 2' }))
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 3' }))

      const snapshots = await service.listSnapshots()

      expect(snapshots).toHaveLength(3)
      const names = snapshots.map(s => s.name)
      expect(names).toContain('Snapshot 1')
      expect(names).toContain('Snapshot 2')
      expect(names).toContain('Snapshot 3')
    })

    it('should return snapshots sorted by updatedAt descending (most recent first)', async () => {
      // Save snapshots with small delays to ensure different timestamps
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'First' }))
      await new Promise(resolve => setTimeout(resolve, 10))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Second' }))
      await new Promise(resolve => setTimeout(resolve, 10))
      const snap3 = await service.saveSnapshot(createSnapshotInput({ name: 'Third' }))

      const snapshots = await service.listSnapshots()

      expect(snapshots[0].id).toBe(snap3.id)
      expect(snapshots[1].id).toBe(snap2.id)
      expect(snapshots[2].id).toBe(snap1.id)
    })

    it('should return summary information for each snapshot', async () => {
      await service.saveSnapshot(createSnapshotInput({
        name: 'Test Snapshot',
        description: 'Test description'
      }))

      const snapshots = await service.listSnapshots()

      expect(snapshots).toHaveLength(1)
      const snapshot = snapshots[0]
      expect(snapshot.id).toBeDefined()
      expect(snapshot.name).toBe('Test Snapshot')
      expect(snapshot.description).toBe('Test description')
      expect(snapshot.createdAt).toBeDefined()
      expect(snapshot.updatedAt).toBeDefined()
      expect(snapshot.size).toBeGreaterThan(0)
    })

    it('should handle corrupted index file gracefully', async () => {
      // First save a snapshot to create the directory and index
      await service.saveSnapshot(createSnapshotInput())

      // Corrupt the index file
      const indexPath = path.join(workspacesDir, 'index.json')
      fs.writeFileSync(indexPath, 'invalid json')

      const snapshots = await service.listSnapshots()

      expect(snapshots).toEqual([])
    })

    it('should skip entries with missing snapshot files', async () => {
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'Keep' }))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Delete' }))

      // Delete one snapshot file but keep its index entry
      fs.unlinkSync(path.join(workspacesDir, `${snap2.id}.json`))

      const snapshots = await service.listSnapshots()

      expect(snapshots).toHaveLength(1)
      expect(snapshots[0].id).toBe(snap1.id)
    })
  })

  describe('deleteSnapshot', () => {
    it('should delete a snapshot by ID and return true', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      const result = await service.deleteSnapshot(saved.id)

      expect(result).toBe(true)
    })

    it('should remove snapshot file', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())
      const filePath = path.join(workspacesDir, `${saved.id}.json`)
      expect(fs.existsSync(filePath)).toBe(true)

      await service.deleteSnapshot(saved.id)

      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('should remove snapshot from index', async () => {
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'Keep' }))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Delete' }))

      await service.deleteSnapshot(snap2.id)

      const indexPath = path.join(workspacesDir, 'index.json')
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      expect(index.snapshots).toHaveLength(1)
      expect(index.snapshots[0].id).toBe(snap1.id)
    })

    it('should return false for non-existent ID', async () => {
      const result = await service.deleteSnapshot('non-existent-id')

      expect(result).toBe(false)
    })

    it('should handle deleting when file already missing', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      // Delete the file manually
      fs.unlinkSync(path.join(workspacesDir, `${saved.id}.json`))

      // Should still succeed (removes from index)
      const result = await service.deleteSnapshot(saved.id)

      expect(result).toBe(true)
    })

    it('should return false when deleting from empty directory', async () => {
      const result = await service.deleteSnapshot('any-id')

      expect(result).toBe(false)
    })
  })

  describe('renameSnapshot', () => {
    it('should rename a snapshot and return updated snapshot', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput({ name: 'Original Name' }))

      const updated = await service.renameSnapshot(saved.id, 'New Name')

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
    })

    it('should update the updatedAt timestamp', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      await new Promise(resolve => setTimeout(resolve, 10))
      const updated = await service.renameSnapshot(saved.id, 'Renamed')

      expect(new Date(updated!.updatedAt).getTime())
        .toBeGreaterThan(new Date(saved.updatedAt).getTime())
    })

    it('should preserve createdAt timestamp', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput())

      const updated = await service.renameSnapshot(saved.id, 'Renamed')

      expect(updated!.createdAt).toBe(saved.createdAt)
    })

    it('should update the snapshot file', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput({ name: 'Original' }))

      await service.renameSnapshot(saved.id, 'Renamed')

      const filePath = path.join(workspacesDir, `${saved.id}.json`)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      expect(data.name).toBe('Renamed')
    })

    it('should update the index file', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput({ name: 'Original' }))

      await service.renameSnapshot(saved.id, 'Renamed')

      const indexPath = path.join(workspacesDir, 'index.json')
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      const entry = index.snapshots.find((s: { id: string }) => s.id === saved.id)
      expect(entry.name).toBe('Renamed')
    })

    it('should return null for non-existent ID', async () => {
      const result = await service.renameSnapshot('non-existent-id', 'New Name')

      expect(result).toBeNull()
    })

    it('should update size after rename', async () => {
      const saved = await service.saveSnapshot(createSnapshotInput({ name: 'Short' }))

      const updated = await service.renameSnapshot(saved.id, 'A much longer name that takes more bytes')

      expect(updated!.size).toBeGreaterThan(saved.size)
    })
  })

  describe('getStorageInfo', () => {
    it('should return storage info with default limit of 50MB', async () => {
      const info = await service.getStorageInfo()

      expect(info.limit).toBe(50 * 1024 * 1024) // 50 MB in bytes
    })

    it('should return zero used and zero snapshots when empty', async () => {
      const info = await service.getStorageInfo()

      expect(info.used).toBe(0)
      expect(info.snapshots).toBe(0)
    })

    it('should count total bytes used', async () => {
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 1' }))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 2' }))

      const info = await service.getStorageInfo()

      expect(info.used).toBe(snap1.size + snap2.size)
    })

    it('should count number of snapshots', async () => {
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 1' }))
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 2' }))
      await service.saveSnapshot(createSnapshotInput({ name: 'Snapshot 3' }))

      const info = await service.getStorageInfo()

      expect(info.snapshots).toBe(3)
    })

    it('should update after deletion', async () => {
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'Keep' }))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Delete' }))

      let info = await service.getStorageInfo()
      expect(info.snapshots).toBe(2)
      const totalSize = info.used

      await service.deleteSnapshot(snap2.id)

      info = await service.getStorageInfo()
      expect(info.snapshots).toBe(1)
      expect(info.used).toBe(snap1.size)
      expect(info.used).toBeLessThan(totalSize)
    })

    it('should handle corrupted index gracefully', async () => {
      await service.saveSnapshot(createSnapshotInput())

      const indexPath = path.join(workspacesDir, 'index.json')
      fs.writeFileSync(indexPath, 'invalid json')

      const info = await service.getStorageInfo()

      expect(info.used).toBe(0)
      expect(info.snapshots).toBe(0)
    })
  })

  describe('Storage Format', () => {
    it('should store snapshots in .tiki-desktop/workspaces/ structure', async () => {
      // Use a path that simulates the real structure
      const customDir = path.join(tempDir, '.tiki-desktop', 'workspaces')
      const customService = new WorkspaceService(customDir)

      await customService.saveSnapshot(createSnapshotInput())

      expect(fs.existsSync(customDir)).toBe(true)
      expect(fs.existsSync(path.join(customDir, 'index.json'))).toBe(true)
    })

    it('should create index.json with proper structure', async () => {
      await service.saveSnapshot(createSnapshotInput({ name: 'Test' }))

      const indexPath = path.join(workspacesDir, 'index.json')
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

      expect(index).toHaveProperty('snapshots')
      expect(Array.isArray(index.snapshots)).toBe(true)
      expect(index.snapshots[0]).toHaveProperty('id')
      expect(index.snapshots[0]).toHaveProperty('name')
      expect(index.snapshots[0]).toHaveProperty('createdAt')
      expect(index.snapshots[0]).toHaveProperty('updatedAt')
      expect(index.snapshots[0]).toHaveProperty('size')
    })

    it('should store individual snapshots as {id}.json files', async () => {
      const snap1 = await service.saveSnapshot(createSnapshotInput({ name: 'First' }))
      const snap2 = await service.saveSnapshot(createSnapshotInput({ name: 'Second' }))

      expect(fs.existsSync(path.join(workspacesDir, `${snap1.id}.json`))).toBe(true)
      expect(fs.existsSync(path.join(workspacesDir, `${snap2.id}.json`))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long snapshot names', async () => {
      const longName = 'A'.repeat(1000)
      const snapshot = await service.saveSnapshot(createSnapshotInput({ name: longName }))

      expect(snapshot.name).toBe(longName)

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.name).toBe(longName)
    })

    it('should handle special characters in names', async () => {
      const specialName = 'Test <Snapshot> "with" special & characters!'
      const snapshot = await service.saveSnapshot(createSnapshotInput({ name: specialName }))

      expect(snapshot.name).toBe(specialName)

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.name).toBe(specialName)
    })

    it('should handle paths with special characters in terminal cwd', async () => {
      const terminals: TerminalSnapshot[] = [
        { id: 'term-1', name: 'Terminal', cwd: '/home/user/My Project (1)/src' }
      ]
      const snapshot = await service.saveSnapshot(createSnapshotInput({ terminals }))

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.terminals[0].cwd).toBe('/home/user/My Project (1)/src')
    })

    it('should handle Windows-style paths in terminal cwd', async () => {
      const terminals: TerminalSnapshot[] = [
        { id: 'term-1', name: 'Terminal', cwd: 'C:\\Users\\user\\Documents\\Project' }
      ]
      const snapshot = await service.saveSnapshot(createSnapshotInput({ terminals }))

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.terminals[0].cwd).toBe('C:\\Users\\user\\Documents\\Project')
    })

    it('should handle empty terminals array', async () => {
      const snapshot = await service.saveSnapshot(createSnapshotInput({ terminals: [] }))

      expect(snapshot.terminals).toEqual([])

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.terminals).toEqual([])
    })

    it('should handle many terminals', async () => {
      const terminals: TerminalSnapshot[] = Array.from({ length: 50 }, (_, i) => ({
        id: `term-${i}`,
        name: `Terminal ${i}`,
        cwd: `/path/to/dir/${i}`
      }))
      const snapshot = await service.saveSnapshot(createSnapshotInput({ terminals }))

      expect(snapshot.terminals).toHaveLength(50)

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.terminals).toHaveLength(50)
    })

    it('should handle concurrent saves', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.saveSnapshot(createSnapshotInput({ name: `Concurrent ${i}` }))
      )

      const snapshots = await Promise.all(promises)

      // All should have unique IDs
      const ids = new Set(snapshots.map(s => s.id))
      expect(ids.size).toBe(10)

      // All should be in the list
      const list = await service.listSnapshots()
      expect(list).toHaveLength(10)
    })

    it('should handle unicode in names and descriptions', async () => {
      const snapshot = await service.saveSnapshot(createSnapshotInput({
        name: 'Test with emoji and unicode characters',
        description: 'Description with special chars: e acute, Chinese, Japanese'
      }))

      const retrieved = await service.getSnapshot(snapshot.id)
      expect(retrieved!.name).toBe('Test with emoji and unicode characters')
    })
  })
})

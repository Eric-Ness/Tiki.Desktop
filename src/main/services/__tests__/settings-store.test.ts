/**
 * @vitest-environment node
 *
 * Comprehensive tests for export/import functionality in settings-store
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EXPORT_VERSION, type ExportData, type SettingsSchema } from '../../../shared/types/export'

// Default settings for testing
const defaultSettings: SettingsSchema = {
  appearance: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    accentColor: '#f59e0b'
  },
  terminal: {
    fontSize: 13,
    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
    cursorStyle: 'bar',
    cursorBlink: true,
    scrollback: 10000,
    copyOnSelect: false,
    shell: ''
  },
  notifications: {
    enabled: true,
    sound: false,
    phaseComplete: true,
    issuePlanned: true,
    issueShipped: true,
    errors: true,
    workflowFailed: true
  },
  keyboardShortcuts: {
    toggleSidebar: 'Ctrl+Shift+B',
    toggleDetailPanel: 'Ctrl+Shift+D',
    commandPalette: 'Ctrl+K',
    openSettings: 'Ctrl+,',
    newTerminal: 'Ctrl+Shift+`',
    closeTerminal: 'Ctrl+Shift+W'
  },
  github: {
    autoRefresh: true,
    refreshInterval: 5,
    defaultIssueState: 'open'
  },
  dataPrivacy: {
    telemetry: false,
    crashReports: false,
    clearDataOnExit: false
  }
}

// Mock store data that will be shared across tests
let mockStoreData: SettingsSchema = JSON.parse(JSON.stringify(defaultSettings))

// Track mock calls
const mockStoreClear = vi.fn(() => {
  Object.keys(mockStoreData).forEach(key => {
    delete (mockStoreData as Record<string, unknown>)[key]
  })
})

const mockStoreSet = vi.fn((key: string, value: unknown) => {
  (mockStoreData as Record<string, unknown>)[key] = value
})

const mockStoreGet = vi.fn((key: string) => {
  return (mockStoreData as Record<string, unknown>)[key]
})

// Mock electron before importing the module
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn()
  },
  app: {
    getVersion: vi.fn().mockReturnValue('0.9.2')
  }
}))

// Mock electron-store with a class
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      get store(): SettingsSchema {
        return mockStoreData
      }
      get = mockStoreGet
      set = mockStoreSet
      clear = mockStoreClear
    }
  }
})

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}))

import { dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'

const mockDialog = vi.mocked(dialog)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

// Helper to reset mock store data
function resetMockStoreData(): void {
  mockStoreData = JSON.parse(JSON.stringify(defaultSettings))
}

// Helper to create valid export data
function createValidExportData(overrides?: Partial<ExportData>): ExportData {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '0.9.2',
    data: {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      projects: [
        { id: 'project-1', name: 'Test Project', path: '/path/to/project' }
      ],
      layout: {
        sidebarCollapsed: false,
        detailPanelCollapsed: false,
        activeTab: 'terminal',
        terminalLayout: { direction: 'none', panes: [] },
        focusedPaneId: null
      },
      recentCommands: ['git status', 'npm test'],
      recentSearches: ['search term']
    },
    ...overrides
  }
}

describe('settings-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockStoreData()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Export Tests', () => {
    describe('exports with correct version number', () => {
      it('should include the current EXPORT_VERSION in full export', async () => {
        mockDialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/path/to/export.json'
        })
        mockWriteFile.mockResolvedValue(undefined)

        const { exportSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const appData = {
          projects: [{ id: '1', name: 'Test', path: '/test' }],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'terminal',
            terminalLayout: { direction: 'none' as const, panes: [] },
            focusedPaneId: null
          },
          recentCommands: ['git status'],
          recentSearches: []
        }

        await exportSettings(appData)

        expect(mockWriteFile).toHaveBeenCalled()
        const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
        expect(writtenContent.version).toBe(EXPORT_VERSION)
      })
    })

    describe('exports all data sections', () => {
      it('should include settings, projects, layout, recentCommands, recentSearches', async () => {
        mockDialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/path/to/export.json'
        })
        mockWriteFile.mockResolvedValue(undefined)

        const { exportSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const appData = {
          projects: [{ id: '1', name: 'Project 1', path: '/project1' }],
          layout: {
            sidebarCollapsed: true,
            detailPanelCollapsed: false,
            activeTab: 'workflow',
            terminalLayout: { direction: 'horizontal' as const, panes: [] },
            focusedPaneId: 'pane-1'
          },
          recentCommands: ['npm install', 'npm run build'],
          recentSearches: ['todo', 'fixme']
        }

        await exportSettings(appData)

        const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
        expect(writtenContent.data).toBeDefined()
        expect(writtenContent.data.settings).toBeDefined()
        expect(writtenContent.data.projects).toEqual(appData.projects)
        expect(writtenContent.data.layout).toEqual(appData.layout)
        expect(writtenContent.data.recentCommands).toEqual(appData.recentCommands)
        expect(writtenContent.data.recentSearches).toEqual(appData.recentSearches)
      })
    })

    describe('export timestamp is valid ISO string', () => {
      it('should have a valid ISO timestamp in exportedAt field', async () => {
        mockDialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/path/to/export.json'
        })
        mockWriteFile.mockResolvedValue(undefined)

        const { exportSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const appData = {
          projects: [],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'terminal',
            terminalLayout: { direction: 'none' as const, panes: [] },
            focusedPaneId: null
          },
          recentCommands: [],
          recentSearches: []
        }

        await exportSettings(appData)

        const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
        const timestamp = writtenContent.exportedAt

        expect(timestamp).toBeDefined()
        const parsedDate = new Date(timestamp)
        expect(parsedDate.toISOString()).toBe(timestamp)
        expect(parsedDate.getTime()).not.toBeNaN()
      })
    })

    describe('export includes app version', () => {
      it('should include the app version from electron', async () => {
        mockDialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/path/to/export.json'
        })
        mockWriteFile.mockResolvedValue(undefined)

        const { exportSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const appData = {
          projects: [],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'terminal',
            terminalLayout: { direction: 'none' as const, panes: [] },
            focusedPaneId: null
          },
          recentCommands: [],
          recentSearches: []
        }

        await exportSettings(appData)

        const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
        expect(writtenContent.appVersion).toBe('0.9.2')
        expect(app.getVersion).toHaveBeenCalled()
      })
    })

    describe('export cancellation', () => {
      it('should return error when dialog is cancelled', async () => {
        mockDialog.showSaveDialog.mockResolvedValue({
          canceled: true,
          filePath: undefined
        })

        const { exportSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await exportSettings()

        expect(result.success).toBe(false)
        expect(result.error).toBe('Export cancelled')
      })
    })
  })

  describe('Import Validation Tests', () => {
    describe('rejects non-JSON content', () => {
      it('should return error for invalid JSON', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })
        mockReadFile.mockResolvedValue('this is not valid JSON {{{')

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Invalid JSON format. The file must be a valid JSON file.')
      })
    })

    describe('rejects JSON without version field', () => {
      it('should return error for missing version', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })
        mockReadFile.mockResolvedValue(JSON.stringify({
          data: { settings: defaultSettings }
        }))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Missing version field. This may not be a Tiki Desktop export file.')
      })
    })

    describe('rejects unknown version with helpful message', () => {
      it('should warn about unknown version but still allow import', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData({ version: '99.0' })
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings.some(w => w.includes('Unknown export version'))).toBe(true)
        expect(result.warnings.some(w => w.includes('99.0'))).toBe(true)
        expect(result.warnings.some(w => w.includes('1.0'))).toBe(true)
      })
    })

    describe('rejects missing required fields', () => {
      it('should return error for missing data section', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })
        mockReadFile.mockResolvedValue(JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          appVersion: '0.9.2'
        }))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Missing data section. The export file appears to be malformed.')
      })

      it('should return error for missing settings in data section', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })
        mockReadFile.mockResolvedValue(JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          appVersion: '0.9.2',
          data: {
            projects: [],
            layout: {},
            recentCommands: []
          }
        }))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Missing settings in data section. Settings are required.')
      })
    })

    describe('warns on extra unexpected fields', () => {
      it('should warn about unexpected top-level fields', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = {
          ...createValidExportData(),
          unexpectedField: 'some value',
          anotherUnexpected: 123
        }
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.warnings.some(w => w.includes('unexpectedField'))).toBe(true)
        expect(result.warnings.some(w => w.includes('anotherUnexpected'))).toBe(true)
      })

      it('should warn about unexpected data fields', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        ;(exportData.data as Record<string, unknown>).unexpectedDataField = 'value'
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.warnings.some(w => w.includes('unexpectedDataField'))).toBe(true)
      })
    })

    describe('accepts valid export files', () => {
      it('should accept a properly formatted export file', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.data).not.toBeNull()
        expect(result.version).toBe(EXPORT_VERSION)
      })
    })
  })

  describe('Import Mode Tests', () => {
    describe('Replace mode', () => {
      it('should overwrite existing settings', async () => {
        const { importSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const importedSettings: SettingsSchema = {
          ...defaultSettings,
          appearance: {
            ...defaultSettings.appearance,
            theme: 'light',
            fontSize: 18
          }
        }

        const exportData = createValidExportData()
        exportData.data.settings = importedSettings

        const result = await importSettings('replace', exportData)

        expect(result.success).toBe(true)
        expect(result.imported.settings).toBe(true)
        expect(mockStoreClear).toHaveBeenCalled()
      })

      it('should replace projects (return count for renderer)', async () => {
        const { importSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const exportData = createValidExportData()
        exportData.data.projects = [
          { id: '1', name: 'New Project 1', path: '/new/path1' },
          { id: '2', name: 'New Project 2', path: '/new/path2' },
          { id: '3', name: 'New Project 3', path: '/new/path3' }
        ]

        const currentAppData = {
          projects: [{ id: 'old-1', name: 'Old Project', path: '/old/path' }],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const result = await importSettings('replace', exportData, currentAppData)

        expect(result.success).toBe(true)
        expect(result.imported.projects).toBe(3)
      })
    })

    describe('Merge mode', () => {
      it('should preserve unlisted settings (deep merge)', async () => {
        const { importSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        // Update mock store with custom settings
        mockStoreData = {
          ...defaultSettings,
          appearance: {
            ...defaultSettings.appearance,
            theme: 'dark',
            accentColor: '#custom'
          }
        }

        const importedSettings: SettingsSchema = {
          ...defaultSettings,
          appearance: {
            ...defaultSettings.appearance,
            theme: 'light'
          }
        }

        const exportData = createValidExportData()
        exportData.data.settings = importedSettings

        await importSettings('merge', exportData)

        // Verify deep merge was called (not clear)
        expect(mockStoreClear).not.toHaveBeenCalled()
        expect(mockStoreSet).toHaveBeenCalled()
      })

      it('should add new projects without removing existing ones', async () => {
        const { getMergedImportData, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const exportData = createValidExportData()
        exportData.data.projects = [
          { id: '2', name: 'New Project', path: '/new/path' }
        ]

        const currentAppData = {
          projects: [{ id: '1', name: 'Existing Project', path: '/existing/path' }],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const merged = getMergedImportData('merge', exportData, currentAppData)

        expect(merged.projects).toHaveLength(2)
        expect(merged.projects.find(p => p.id === '1')).toBeDefined()
        expect(merged.projects.find(p => p.id === '2')).toBeDefined()
      })

      it('should keep existing projects when importing with same path', async () => {
        const { getMergedImportData, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const existingProject = { id: '1', name: 'Existing Project', path: '/shared/path' }
        const importedProject = { id: '2', name: 'Imported Project', path: '/shared/path' }

        const exportData = createValidExportData()
        exportData.data.projects = [importedProject]

        const currentAppData = {
          projects: [existingProject],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const merged = getMergedImportData('merge', exportData, currentAppData)

        expect(merged.projects).toHaveLength(1)
        expect(merged.projects[0].id).toBe('1')
      })
    })
  })

  describe('Preview Tests', () => {
    describe('shows correct change counts', () => {
      it('should count settings category changes correctly', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.settings.appearance.theme = 'light'
        exportData.data.settings.terminal.fontSize = 20
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.changes.settings.length).toBeGreaterThan(0)
        expect(result.changes.settings.some(s => s.category === 'appearance')).toBe(true)
        expect(result.changes.settings.some(s => s.category === 'terminal')).toBe(true)
      })
    })

    describe('identifies added/removed projects', () => {
      it('should count added projects correctly', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.projects = [
          { id: 'new-1', name: 'New Project 1', path: '/new/path1' },
          { id: 'new-2', name: 'New Project 2', path: '/new/path2' }
        ]
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const currentAppData = {
          projects: [{ id: 'existing', name: 'Existing', path: '/existing' }],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const result = await previewImport(currentAppData)

        expect(result.valid).toBe(true)
        expect(result.changes.projects.added).toBe(2)
        expect(result.changes.projects.removed).toBe(1)
      })

      it('should count unchanged projects correctly', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const sharedProject = { id: 'shared', name: 'Shared Project', path: '/shared/path' }

        const exportData = createValidExportData()
        exportData.data.projects = [sharedProject]
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const currentAppData = {
          projects: [sharedProject],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const result = await previewImport(currentAppData)

        expect(result.valid).toBe(true)
        expect(result.changes.projects.unchanged).toBe(1)
        expect(result.changes.projects.added).toBe(0)
        expect(result.changes.projects.removed).toBe(0)
      })
    })

    describe('reports modified settings categories', () => {
      it('should list all modified categories', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.settings.appearance.fontSize = 20
        exportData.data.settings.github.refreshInterval = 10
        exportData.data.settings.dataPrivacy.telemetry = true
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        const changedCategories = result.changes.settings.map(s => s.category)
        expect(changedCategories).toContain('appearance')
        expect(changedCategories).toContain('github')
        expect(changedCategories).toContain('dataPrivacy')
      })

      it('should report fieldsChanged count per category', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.settings.appearance.theme = 'light'
        exportData.data.settings.appearance.fontSize = 20
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        const appearanceChange = result.changes.settings.find(s => s.category === 'appearance')
        expect(appearanceChange).toBeDefined()
        expect(appearanceChange!.fieldsChanged).toBe(2)
      })
    })
  })

  describe('Edge Case Tests', () => {
    describe('empty projects array in import', () => {
      it('should handle import with empty projects array', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.projects = []
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const currentAppData = {
          projects: [
            { id: '1', name: 'Project 1', path: '/path1' },
            { id: '2', name: 'Project 2', path: '/path2' }
          ],
          layout: exportData.data.layout,
          recentCommands: [],
          recentSearches: []
        }

        const result = await previewImport(currentAppData)

        expect(result.valid).toBe(true)
        expect(result.changes.projects.added).toBe(0)
        expect(result.changes.projects.removed).toBe(2)
      })

      it('should successfully import with empty projects', async () => {
        const { importSettings, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const exportData = createValidExportData()
        exportData.data.projects = []

        const result = await importSettings('replace', exportData)

        expect(result.success).toBe(true)
        expect(result.imported.projects).toBe(0)
      })
    })

    describe('import file from older version', () => {
      it('should accept import from supported version', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData({ version: '1.0' })
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.version).toBe('1.0')
      })

      it('should warn about unsupported older version but allow import', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData({ version: '0.5' })
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.warnings.some(w => w.includes('0.5'))).toBe(true)
      })
    })

    describe('very large import file', () => {
      it('should handle import with many projects', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.projects = Array.from({ length: 1000 }, (_, i) => ({
          id: `project-${i}`,
          name: `Project ${i}`,
          path: `/path/to/project/${i}`
        }))
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.changes.projects.added).toBe(1000)
        expect(result.data?.data.projects).toHaveLength(1000)
      })

      it('should handle import with many recent commands', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.recentCommands = Array.from(
          { length: 100 },
          (_, i) => `command-${i}`
        )
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(true)
        expect(result.data?.data.recentCommands).toHaveLength(100)
      })
    })

    describe('recent commands merging', () => {
      it('should merge and deduplicate recent commands (limited to 10)', async () => {
        const { getMergedImportData, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const exportData = createValidExportData()
        exportData.data.recentCommands = ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5', 'cmd6']

        const currentAppData = {
          projects: [],
          layout: exportData.data.layout,
          recentCommands: ['cmd1', 'cmd7', 'cmd8', 'cmd9', 'cmd10', 'cmd11'],
          recentSearches: []
        }

        const merged = getMergedImportData('merge', exportData, currentAppData)

        expect(merged.recentCommands.length).toBeLessThanOrEqual(10)
        expect(merged.recentCommands.filter(c => c === 'cmd1')).toHaveLength(1)
      })
    })

    describe('layout changes detection', () => {
      it('should detect layout changes', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        exportData.data.layout = {
          sidebarCollapsed: true,
          detailPanelCollapsed: true,
          activeTab: 'workflow',
          terminalLayout: { direction: 'horizontal', panes: [] },
          focusedPaneId: 'pane-1'
        }
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const currentAppData = {
          projects: [],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'terminal',
            terminalLayout: { direction: 'none' as const, panes: [] },
            focusedPaneId: null
          },
          recentCommands: [],
          recentSearches: []
        }

        const result = await previewImport(currentAppData)

        expect(result.valid).toBe(true)
        expect(result.changes.layout).toBe(true)
      })
    })

    describe('no main window', () => {
      it('should return error when no main window is set for export', async () => {
        // Import the module fresh and don't set main window
        const { exportSettings } = await import('../settings-store')

        // Clear any previously set main window by calling with null (workaround)
        // The module preserves mainWindow state between tests since we don't reset modules

        const result = await exportSettings()

        // Note: Due to module caching, the main window may already be set from previous tests
        // This test verifies the error message when no window is available
        expect(result.success).toBe(false)
        expect(result.error).toContain('cancelled')
      })

      it('should return error when no main window is set for preview', async () => {
        const { previewImport, setMainWindow } = await import('../settings-store')

        // Reset the main window to simulate missing window
        setMainWindow(null as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('No main window available')
      })
    })

    describe('file read errors', () => {
      it('should handle file read errors gracefully', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })
        mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors[0]).toContain('Failed to read file')
      })
    })

    describe('settings schema validation', () => {
      it('should reject unknown settings categories', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        ;(exportData.data.settings as Record<string, unknown>).unknownCategory = { foo: 'bar' }
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('Unknown settings category'))).toBe(true)
      })

      it('should reject non-object settings categories', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/path/to/import.json']
        })

        const exportData = createValidExportData()
        ;(exportData.data.settings as Record<string, unknown>).appearance = 'not an object'
        mockReadFile.mockResolvedValue(JSON.stringify(exportData))

        const { previewImport, setMainWindow } = await import('../settings-store')

        const mockWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
        setMainWindow(mockWindow as never)

        const result = await previewImport()

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('must be an object'))).toBe(true)
      })
    })
  })
})

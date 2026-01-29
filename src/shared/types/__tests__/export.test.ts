import { describe, it, expect } from 'vitest'
import {
  EXPORT_VERSION,
  type ExportData,
  type ImportPreview,
  type ImportMode
} from '../export'

describe('Export Types', () => {
  describe('EXPORT_VERSION', () => {
    it('should be version 1.0', () => {
      expect(EXPORT_VERSION).toBe('1.0')
    })
  })

  describe('ExportData structure', () => {
    it('should have required top-level fields', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-15T10:30:00.000Z',
        appVersion: '0.9.2',
        data: {
          settings: {
            appearance: {
              theme: 'dark',
              fontSize: 14,
              fontFamily: 'Inter',
              accentColor: '#f59e0b'
            },
            terminal: {
              fontSize: 13,
              fontFamily: 'monospace',
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
          },
          projects: [
            { id: '1', name: 'Test Project', path: '/path/to/project' }
          ],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: false,
            activeTab: 'terminal',
            terminalLayout: {
              direction: 'none',
              panes: [{ id: 'pane-1', terminalId: 'term-1', size: 100 }]
            },
            focusedPaneId: 'pane-1'
          },
          recentCommands: ['git status', 'npm test'],
          recentSearches: ['search term']
        }
      }

      // Verify top-level structure
      expect(exportData.version).toBe('1.0')
      expect(exportData.exportedAt).toBeDefined()
      expect(exportData.appVersion).toBeDefined()
      expect(exportData.data).toBeDefined()
    })

    it('should have nested data structure with all required fields', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        appVersion: '0.9.2',
        data: {
          settings: {
            appearance: {
              theme: 'dark',
              fontSize: 14,
              fontFamily: 'Inter',
              accentColor: '#f59e0b'
            },
            terminal: {
              fontSize: 13,
              fontFamily: 'monospace',
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
          },
          projects: [],
          layout: {
            sidebarCollapsed: false,
            detailPanelCollapsed: true,
            activeTab: 'workflow',
            terminalLayout: {
              direction: 'horizontal',
              panes: []
            },
            focusedPaneId: null
          },
          recentCommands: [],
          recentSearches: []
        }
      }

      // Verify data structure
      expect(exportData.data.settings).toBeDefined()
      expect(exportData.data.projects).toBeDefined()
      expect(exportData.data.layout).toBeDefined()
      expect(exportData.data.recentCommands).toBeDefined()
      expect(exportData.data.recentSearches).toBeDefined()
    })
  })

  describe('ImportPreview structure', () => {
    it('should show changes for each category', () => {
      const preview: ImportPreview = {
        settings: {
          hasChanges: true,
          changedCategories: ['appearance', 'terminal']
        },
        projects: {
          hasChanges: true,
          toAdd: 2,
          toReplace: 1,
          toKeep: 3
        },
        layout: {
          hasChanges: true
        },
        recentCommands: {
          hasChanges: true,
          newCount: 5
        },
        recentSearches: {
          hasChanges: false,
          newCount: 0
        }
      }

      expect(preview.settings.hasChanges).toBe(true)
      expect(preview.settings.changedCategories).toContain('appearance')
      expect(preview.projects.toAdd).toBe(2)
      expect(preview.layout.hasChanges).toBe(true)
      expect(preview.recentCommands.newCount).toBe(5)
    })

    it('should support no changes preview', () => {
      const preview: ImportPreview = {
        settings: {
          hasChanges: false,
          changedCategories: []
        },
        projects: {
          hasChanges: false,
          toAdd: 0,
          toReplace: 0,
          toKeep: 0
        },
        layout: {
          hasChanges: false
        },
        recentCommands: {
          hasChanges: false,
          newCount: 0
        },
        recentSearches: {
          hasChanges: false,
          newCount: 0
        }
      }

      expect(preview.settings.hasChanges).toBe(false)
      expect(preview.projects.hasChanges).toBe(false)
    })
  })

  describe('ImportMode type', () => {
    it('should accept replace mode', () => {
      const mode: ImportMode = 'replace'
      expect(mode).toBe('replace')
    })

    it('should accept merge mode', () => {
      const mode: ImportMode = 'merge'
      expect(mode).toBe('merge')
    })
  })
})

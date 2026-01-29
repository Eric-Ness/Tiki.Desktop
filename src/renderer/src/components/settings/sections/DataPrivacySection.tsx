import { useState, useCallback } from 'react'
import { useSettings } from '../../../contexts/SettingsContext'
import { useTikiStore } from '../../../stores/tiki-store'
import { SettingsToggle } from '../controls'
import { ImportPreviewDialog } from '../ImportPreviewDialog'
import type {
  ImportPreviewResult,
  ImportModeType,
  ExportAppDataInput
} from '../../../../../preload'

export function DataPrivacySection() {
  const {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    previewImport,
    importSettings
  } = useSettings()
  const { dataPrivacy } = settings

  // Get store data for export/import
  const projects = useTikiStore((state) => state.projects)
  const sidebarCollapsed = useTikiStore((state) => state.sidebarCollapsed)
  const detailPanelCollapsed = useTikiStore((state) => state.detailPanelCollapsed)
  const activeTab = useTikiStore((state) => state.activeTab)
  const terminalLayout = useTikiStore((state) => state.terminalLayout)
  const focusedPaneId = useTikiStore((state) => state.focusedPaneId)
  const recentCommands = useTikiStore((state) => state.recentCommands)
  const recentSearches = useTikiStore((state) => state.recentSearches)
  const clearRecentCommands = useTikiStore((state) => state.clearRecentCommands)

  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null)

  // Build app data for export/import
  const getAppData = useCallback((): ExportAppDataInput => {
    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path
      })),
      layout: {
        sidebarCollapsed,
        detailPanelCollapsed,
        activeTab,
        terminalLayout: {
          direction: terminalLayout.direction,
          panes: terminalLayout.panes.map((p) => ({
            id: p.id,
            terminalId: p.terminalId,
            size: p.size
          }))
        },
        focusedPaneId
      },
      recentCommands,
      recentSearches
    }
  }, [
    projects,
    sidebarCollapsed,
    detailPanelCollapsed,
    activeTab,
    terminalLayout,
    focusedPaneId,
    recentCommands,
    recentSearches
  ])

  const handleExport = async () => {
    setExportStatus('Exporting...')
    const appData = getAppData()
    const result = await exportSettings(appData)
    if (result.success) {
      setExportStatus('Data exported successfully')
    } else {
      setExportStatus(result.error || 'Export failed')
    }
    setTimeout(() => setExportStatus(null), 3000)
  }

  const handleImportClick = async () => {
    setImportStatus('Loading file...')
    const appData = getAppData()
    const preview = await previewImport(appData)

    if (!preview) {
      setImportStatus('No file selected')
      setTimeout(() => setImportStatus(null), 3000)
      return
    }

    setImportPreview(preview)
    setPreviewDialogOpen(true)
    setImportStatus(null)
  }

  const handleImport = async (mode: ImportModeType) => {
    if (!importPreview?.data) {
      throw new Error('No import data available')
    }

    const appData = getAppData()
    const result = await importSettings(mode, importPreview.data, appData)

    if (!result.success) {
      throw new Error(result.error || 'Import failed')
    }

    // Apply merged data to the store if available
    if (result.mergedData) {
      const store = useTikiStore.getState()

      // Update projects
      if (result.imported.projects > 0 || mode === 'replace') {
        // Clear existing projects
        store.projects.forEach((p) => store.removeProject(p.id))
        // Add imported/merged projects
        result.mergedData.projects.forEach((p) => store.addProject(p))
      }

      // Update layout
      if (result.imported.layout) {
        store.setSidebarCollapsed(result.mergedData.layout.sidebarCollapsed)
        store.setDetailPanelCollapsed(result.mergedData.layout.detailPanelCollapsed)
        store.setActiveTab(result.mergedData.layout.activeTab as 'terminal' | 'workflow' | 'config')
        store.setTerminalLayout({
          direction: result.mergedData.layout.terminalLayout.direction,
          panes: result.mergedData.layout.terminalLayout.panes.map((p) => ({
            id: p.id,
            terminalId: p.terminalId,
            size: p.size
          }))
        })
        if (result.mergedData.layout.focusedPaneId) {
          store.setFocusedPane(result.mergedData.layout.focusedPaneId)
        }
      }

      // Update recent commands
      if (result.imported.recentCommands) {
        store.clearRecentCommands()
        // Add in reverse order so the most recent is first
        ;[...result.mergedData.recentCommands].reverse().forEach((cmd) => {
          store.addRecentCommand(cmd)
        })
      }

      // Update recent searches
      if (result.mergedData.recentSearches) {
        store.clearRecentSearches()
        ;[...result.mergedData.recentSearches].reverse().forEach((search) => {
          store.addRecentSearch(search)
        })
      }
    }

    setImportStatus('Data imported successfully')
    setTimeout(() => setImportStatus(null), 3000)
  }

  const handleClearRecentCommands = () => {
    clearRecentCommands()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">
          Data & Privacy
        </h3>
        <p className="text-sm text-slate-500">
          Manage your data and privacy preferences.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        <SettingsToggle
          label="Usage Analytics"
          description="Help improve Tiki Desktop by sharing anonymous usage data"
          checked={dataPrivacy.telemetry}
          onChange={(checked) =>
            updateSettings({ dataPrivacy: { telemetry: checked } })
          }
        />

        <SettingsToggle
          label="Crash Reports"
          description="Automatically send crash reports to help fix issues"
          checked={dataPrivacy.crashReports}
          onChange={(checked) =>
            updateSettings({ dataPrivacy: { crashReports: checked } })
          }
        />

        <SettingsToggle
          label="Clear Data on Exit"
          description="Clear cached data when closing the application"
          checked={dataPrivacy.clearDataOnExit}
          onChange={(checked) =>
            updateSettings({ dataPrivacy: { clearDataOnExit: checked } })
          }
        />
      </div>

      {/* Clear Data Section */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-slate-200 mb-3">Clear Data</h4>
        <div className="space-y-3">
          <button
            onClick={handleClearRecentCommands}
            className="w-full flex items-center justify-between px-3 py-2 bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded transition-colors"
          >
            <div className="text-left">
              <div className="text-sm text-slate-200">Clear Recent Commands</div>
              <div className="text-xs text-slate-500">
                Remove command history from the palette
              </div>
            </div>
            <svg
              className="w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Export/Import Section */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-slate-200 mb-3">
          Data Export & Import
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Export all your settings, projects, and preferences to a file. Import
          to restore or transfer your data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 px-3 py-2 text-sm bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded transition-colors text-slate-200"
          >
            Export Data
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 px-3 py-2 text-sm bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded transition-colors text-slate-200"
          >
            Import Data
          </button>
        </div>
        {(exportStatus || importStatus) && (
          <div className="mt-2 text-xs text-slate-400">
            {exportStatus || importStatus}
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={() => resetSettings('dataPrivacy')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        isOpen={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false)
          setImportPreview(null)
        }}
        preview={importPreview}
        onImport={handleImport}
      />
    </div>
  )
}

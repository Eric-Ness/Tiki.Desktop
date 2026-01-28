import { useState } from 'react'
import { useSettings } from '../../../contexts/SettingsContext'
import { useTikiStore } from '../../../stores/tiki-store'
import { SettingsToggle } from '../controls'

export function DataPrivacySection() {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } =
    useSettings()
  const { dataPrivacy } = settings
  const clearRecentCommands = useTikiStore((state) => state.clearRecentCommands)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const handleExport = async () => {
    setExportStatus('Exporting...')
    const result = await exportSettings()
    if (result.success) {
      setExportStatus('Settings exported successfully')
    } else {
      setExportStatus(result.error || 'Export failed')
    }
    setTimeout(() => setExportStatus(null), 3000)
  }

  const handleImport = async () => {
    setImportStatus('Importing...')
    const result = await importSettings()
    if (result.success) {
      setImportStatus('Settings imported successfully')
    } else {
      setImportStatus(result.error || 'Import failed')
    }
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
          Settings Backup
        </h4>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 px-3 py-2 text-sm bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded transition-colors text-slate-200"
          >
            Export Settings
          </button>
          <button
            onClick={handleImport}
            className="flex-1 px-3 py-2 text-sm bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded transition-colors text-slate-200"
          >
            Import Settings
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
    </div>
  )
}

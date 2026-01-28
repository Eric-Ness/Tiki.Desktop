import { useSettings } from '../../../contexts/SettingsContext'
import { SettingsSelect, SettingsInput, SettingsToggle } from '../controls'

export function GitHubSection() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { github } = settings

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">
          GitHub Integration
        </h3>
        <p className="text-sm text-slate-500">
          Configure GitHub issues and CLI integration.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        <SettingsToggle
          label="Auto Refresh"
          description="Automatically refresh GitHub issues periodically"
          checked={github.autoRefresh}
          onChange={(checked) =>
            updateSettings({ github: { autoRefresh: checked } })
          }
        />

        <SettingsInput
          label="Refresh Interval"
          description="How often to refresh issues (in minutes)"
          type="number"
          value={github.refreshInterval}
          min={1}
          max={60}
          onChange={(value) =>
            updateSettings({ github: { refreshInterval: value as number } })
          }
          disabled={!github.autoRefresh}
        />

        <SettingsSelect
          label="Default Issue State"
          description="Which issues to show by default"
          value={github.defaultIssueState}
          options={[
            { value: 'open', label: 'Open issues' },
            { value: 'closed', label: 'Closed issues' },
            { value: 'all', label: 'All issues' }
          ]}
          onChange={(value) =>
            updateSettings({
              github: { defaultIssueState: value as 'open' | 'closed' | 'all' }
            })
          }
        />
      </div>

      <div className="mt-6 p-4 bg-background-tertiary/50 rounded-lg border border-border">
        <h4 className="text-sm font-medium text-slate-200 mb-2">
          GitHub CLI Status
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Tiki Desktop uses the GitHub CLI (gh) for issue management.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-300">Connected</span>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={() => resetSettings('github')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

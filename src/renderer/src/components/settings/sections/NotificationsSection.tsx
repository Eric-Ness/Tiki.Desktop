import { useSettings } from '../../../contexts/SettingsContext'
import { SettingsToggle } from '../controls'

export function NotificationsSection() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { notifications } = settings

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">Notifications</h3>
        <p className="text-sm text-slate-500">
          Configure when and how you receive notifications.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        <SettingsToggle
          label="Enable Notifications"
          description="Show desktop notifications for important events"
          checked={notifications.enabled}
          onChange={(checked) =>
            updateSettings({ notifications: { enabled: checked } })
          }
        />

        <SettingsToggle
          label="Sound"
          description="Play a sound when notifications appear"
          checked={notifications.sound}
          onChange={(checked) =>
            updateSettings({ notifications: { sound: checked } })
          }
          disabled={!notifications.enabled}
        />

        <div className="py-4">
          <div className="text-sm font-medium text-slate-300 mb-3">
            Notify me when...
          </div>
          <div className="space-y-3 pl-2">
            <SettingsToggle
              label="Phase Completes"
              description="A workflow phase finishes execution"
              checked={notifications.phaseComplete}
              onChange={(checked) =>
                updateSettings({ notifications: { phaseComplete: checked } })
              }
              disabled={!notifications.enabled}
            />

            <SettingsToggle
              label="Issue Planned"
              description="An issue plan is created"
              checked={notifications.issuePlanned}
              onChange={(checked) =>
                updateSettings({ notifications: { issuePlanned: checked } })
              }
              disabled={!notifications.enabled}
            />

            <SettingsToggle
              label="Issue Shipped"
              description="An issue is marked as shipped"
              checked={notifications.issueShipped}
              onChange={(checked) =>
                updateSettings({ notifications: { issueShipped: checked } })
              }
              disabled={!notifications.enabled}
            />

            <SettingsToggle
              label="Errors"
              description="An error occurs during execution"
              checked={notifications.errors}
              onChange={(checked) =>
                updateSettings({ notifications: { errors: checked } })
              }
              disabled={!notifications.enabled}
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={() => resetSettings('notifications')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

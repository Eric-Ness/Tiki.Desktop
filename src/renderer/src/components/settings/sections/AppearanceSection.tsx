import { useSettings } from '../../../contexts/SettingsContext'
import { SettingsSelect } from '../controls'
import { SettingsInput } from '../controls'

export function AppearanceSection() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { appearance } = settings

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">Appearance</h3>
        <p className="text-sm text-slate-500">
          Customize the look and feel of Tiki Desktop.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        <SettingsSelect
          label="Theme"
          description="Choose between dark, light, or system theme"
          value={appearance.theme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' }
          ]}
          onChange={(value) =>
            updateSettings({
              appearance: { theme: value as 'dark' | 'light' | 'system' }
            })
          }
        />

        <SettingsInput
          label="Font Size"
          description="Base font size for the application (10-24)"
          type="number"
          value={appearance.fontSize}
          min={10}
          max={24}
          onChange={(value) =>
            updateSettings({ appearance: { fontSize: value as number } })
          }
        />

        <SettingsInput
          label="Font Family"
          description="Primary font for the application interface"
          value={appearance.fontFamily}
          placeholder="Inter, system-ui, sans-serif"
          onChange={(value) =>
            updateSettings({ appearance: { fontFamily: value as string } })
          }
        />

        <SettingsInput
          label="Accent Color"
          description="Primary accent color (hex value)"
          value={appearance.accentColor}
          placeholder="#f59e0b"
          onChange={(value) =>
            updateSettings({ appearance: { accentColor: value as string } })
          }
        />
      </div>

      <div className="pt-4">
        <button
          onClick={() => resetSettings('appearance')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

import { useSettings } from '../../../contexts/SettingsContext'
import { SettingsSelect, SettingsInput, SettingsToggle } from '../controls'

export function TerminalSection() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { terminal } = settings

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">Terminal</h3>
        <p className="text-sm text-slate-500">
          Configure terminal appearance and behavior.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        <SettingsInput
          label="Font Size"
          description="Terminal font size (8-24)"
          type="number"
          value={terminal.fontSize}
          min={8}
          max={24}
          onChange={(value) =>
            updateSettings({ terminal: { fontSize: value as number } })
          }
        />

        <SettingsInput
          label="Font Family"
          description="Monospace font for terminal output"
          value={terminal.fontFamily}
          placeholder='"Cascadia Code", Consolas, monospace'
          onChange={(value) =>
            updateSettings({ terminal: { fontFamily: value as string } })
          }
        />

        <SettingsSelect
          label="Cursor Style"
          description="Shape of the terminal cursor"
          value={terminal.cursorStyle}
          options={[
            { value: 'block', label: 'Block' },
            { value: 'underline', label: 'Underline' },
            { value: 'bar', label: 'Bar' }
          ]}
          onChange={(value) =>
            updateSettings({
              terminal: { cursorStyle: value as 'block' | 'underline' | 'bar' }
            })
          }
        />

        <SettingsToggle
          label="Cursor Blink"
          description="Enable cursor blinking animation"
          checked={terminal.cursorBlink}
          onChange={(checked) =>
            updateSettings({ terminal: { cursorBlink: checked } })
          }
        />

        <SettingsInput
          label="Scrollback Lines"
          description="Number of lines to keep in terminal history (1000-50000)"
          type="number"
          value={terminal.scrollback}
          min={1000}
          max={50000}
          onChange={(value) =>
            updateSettings({ terminal: { scrollback: value as number } })
          }
        />

        <SettingsToggle
          label="Copy on Select"
          description="Automatically copy selected text to clipboard"
          checked={terminal.copyOnSelect}
          onChange={(checked) =>
            updateSettings({ terminal: { copyOnSelect: checked } })
          }
        />

        <SettingsInput
          label="Shell"
          description="Custom shell path (leave empty for auto-detect)"
          value={terminal.shell}
          placeholder="Auto-detect"
          onChange={(value) =>
            updateSettings({ terminal: { shell: value as string } })
          }
        />
      </div>

      <div className="pt-4">
        <button
          onClick={() => resetSettings('terminal')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

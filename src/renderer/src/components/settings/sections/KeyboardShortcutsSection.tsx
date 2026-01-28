import { useSettings } from '../../../contexts/SettingsContext'

interface ShortcutRowProps {
  label: string
  shortcut: string
}

function ShortcutRow({ label, shortcut }: ShortcutRowProps) {
  // Parse the shortcut for display
  const keys = shortcut.split('+').map((key) => key.trim())

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-2 py-1 text-xs bg-background-tertiary border border-border rounded text-slate-300">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-slate-500 mx-0.5">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsSection() {
  const { settings, resetSettings } = useSettings()
  const { keyboardShortcuts } = settings

  const shortcuts = [
    { label: 'Toggle Sidebar', shortcut: keyboardShortcuts.toggleSidebar },
    { label: 'Toggle Detail Panel', shortcut: keyboardShortcuts.toggleDetailPanel },
    { label: 'Command Palette', shortcut: keyboardShortcuts.commandPalette },
    { label: 'Open Settings', shortcut: keyboardShortcuts.openSettings },
    { label: 'New Terminal', shortcut: keyboardShortcuts.newTerminal },
    { label: 'Close Terminal', shortcut: keyboardShortcuts.closeTerminal }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-slate-100 mb-1">
          Keyboard Shortcuts
        </h3>
        <p className="text-sm text-slate-500">
          View and customize keyboard shortcuts.
        </p>
      </div>

      <div className="space-y-1 divide-y divide-border/50">
        {shortcuts.map((item) => (
          <ShortcutRow
            key={item.label}
            label={item.label}
            shortcut={item.shortcut}
          />
        ))}
      </div>

      <div className="pt-4 flex items-center gap-4">
        <button
          onClick={() => resetSettings('keyboardShortcuts')}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors"
        >
          Reset to Defaults
        </button>
        <span className="text-xs text-slate-500">
          Custom shortcuts coming in a future update
        </span>
      </div>
    </div>
  )
}

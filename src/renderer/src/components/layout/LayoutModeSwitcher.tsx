/**
 * LayoutModeSwitcher Component
 *
 * Toggle button to switch between Workflow and Development modes.
 * Placed in the title bar or status bar.
 */

import { Workflow, Code2 } from 'lucide-react'
import { useTikiStore } from '../../stores/tiki-store'
import type { LayoutMode } from '../../types/layout'

interface LayoutModeSwitcherProps {
  /** Variant affects styling */
  variant?: 'titlebar' | 'statusbar'
}

export function LayoutModeSwitcher({ variant = 'titlebar' }: LayoutModeSwitcherProps) {
  const layoutMode = useTikiStore((state) => state.layoutMode)
  const setLayoutMode = useTikiStore((state) => state.setLayoutMode)

  const modes: { id: LayoutMode; label: string; icon: typeof Workflow; shortcut: string }[] = [
    { id: 'workflow', label: 'Workflow', icon: Workflow, shortcut: 'Ctrl+Shift+W' },
    { id: 'development', label: 'Development', icon: Code2, shortcut: 'Ctrl+Shift+D' }
  ]

  if (variant === 'statusbar') {
    return (
      <div className="flex items-center">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = layoutMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => setLayoutMode(mode.id)}
              className={`
                flex items-center gap-1 px-2 py-1 text-xs
                transition-colors duration-75
                ${isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}
              `}
              title={`${mode.label} mode (${mode.shortcut})`}
            >
              <Icon className="w-3.5 h-3.5" />
              {isActive && <span>{mode.label}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  // Titlebar variant
  return (
    <div className="flex items-center gap-0.5 bg-background-secondary/50 rounded-md p-0.5 border border-border/50">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = layoutMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => setLayoutMode(mode.id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
              transition-all duration-150
              ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-background-tertiary'
              }
            `}
            title={`Switch to ${mode.label} mode (${mode.shortcut})`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}

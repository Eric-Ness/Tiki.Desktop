import { useState, useEffect, useRef, useCallback } from 'react'
import { Command } from 'cmdk'
import type { TikiCommand } from '../../lib/command-registry'
import { ArgumentInput } from './ArgumentInput'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: TikiCommand[]
  recentCommands: string[]
  onSelect: (command: TikiCommand) => void
  onSelectWithArgs?: (command: TikiCommand, args: string) => void
}

export function CommandPalette({
  isOpen,
  onClose,
  commands,
  recentCommands,
  onSelect,
  onSelectWithArgs
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingCommand, setPendingCommand] = useState<TikiCommand | null>(null)

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current && !pendingCommand) {
      inputRef.current.focus()
    }
  }, [isOpen, pendingCommand])

  // Reset pending command when palette closes
  useEffect(() => {
    if (!isOpen) {
      setPendingCommand(null)
    }
  }, [isOpen])

  // Handle command selection - show argument input for commands with args
  const handleCommandSelect = useCallback(
    (command: TikiCommand) => {
      if (command.argumentHint && onSelectWithArgs) {
        // Command requires arguments - show argument input
        setPendingCommand(command)
      } else {
        // Command doesn't require arguments - execute directly
        onSelect(command)
      }
    },
    [onSelect, onSelectWithArgs]
  )

  // Handle argument submission
  const handleArgumentSubmit = useCallback(
    (args: string) => {
      if (pendingCommand && onSelectWithArgs) {
        onSelectWithArgs(pendingCommand, args)
        setPendingCommand(null)
      }
    },
    [pendingCommand, onSelectWithArgs]
  )

  // Handle argument cancel - go back to command list
  const handleArgumentCancel = useCallback(() => {
    setPendingCommand(null)
    // Re-focus the search input
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  // Get recent commands as full command objects
  const recentCommandObjects = recentCommands
    .map((name) => commands.find((c) => c.name === name))
    .filter((c): c is TikiCommand => c !== undefined)

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="absolute inset-0 flex items-start justify-center pt-[20vh]">
        <Command
          className="w-[560px] max-h-[400px] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden"
          loop
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-3">
            <svg
              className="w-4 h-4 text-slate-500 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <Command.Input
              ref={inputRef}
              placeholder="Search commands..."
              className="flex-1 py-3 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-500 bg-background-tertiary rounded border border-border">
              esc
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No commands found.
            </Command.Empty>

            {/* Argument Input (when a command with args is selected) */}
            {pendingCommand ? (
              <div className="p-2">
                <ArgumentInput
                  command={pendingCommand}
                  onSubmit={handleArgumentSubmit}
                  onCancel={handleArgumentCancel}
                />
              </div>
            ) : (
              <>
                {/* Recent Commands Section */}
                {recentCommandObjects.length > 0 && (
                  <Command.Group heading="Recent" className="mb-2">
                    {recentCommandObjects.map((command) => (
                      <CommandItem
                        key={`recent-${command.name}`}
                        command={command}
                        onSelect={() => handleCommandSelect(command)}
                      />
                    ))}
                  </Command.Group>
                )}

                {/* All Commands Section */}
                <Command.Group heading="Commands">
                  {commands.map((command) => (
                    <CommandItem
                      key={command.name}
                      command={command}
                      onSelect={() => handleCommandSelect(command)}
                    />
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

interface CommandItemProps {
  command: TikiCommand
  onSelect: () => void
}

function CommandItem({ command, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      value={`${command.name} ${command.description}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer text-sm
        hover:bg-background-tertiary
        aria-selected:bg-background-tertiary aria-selected:text-slate-100
        data-[selected=true]:bg-background-tertiary data-[selected=true]:text-slate-100
        transition-colors"
    >
      {/* Command Icon */}
      <div className="w-6 h-6 flex items-center justify-center rounded bg-amber-900/30 text-amber-500">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>

      {/* Command Name and Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200">{command.displayName}</span>
          {command.argumentHint && (
            <span className="text-xs text-slate-500 font-mono">{command.argumentHint}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{command.description}</p>
      </div>
    </Command.Item>
  )
}

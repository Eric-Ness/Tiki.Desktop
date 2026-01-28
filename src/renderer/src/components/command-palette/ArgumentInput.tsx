import { useState, useRef, useEffect } from 'react'
import type { TikiCommand } from '../../lib/command-registry'

interface ArgumentInputProps {
  command: TikiCommand
  onSubmit: (args: string) => void
  onCancel: () => void
}

export function ArgumentInput({ command, onSubmit, onCancel }: ArgumentInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onSubmit(value.trim())
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="p-3 border-t border-border" data-testid="argument-input">
      <div className="text-xs text-slate-400 mb-2">
        <span className="font-mono text-amber-500">/{command.name}</span>{' '}
        <span className="text-slate-500">{command.argumentHint}</span>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Enter ${command.argumentHint?.replace(/[<>[\]]/g, '') || 'argument'}`}
        className="w-full bg-background-tertiary border border-border rounded px-3 py-2 text-sm outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
        data-testid="argument-input-field"
      />
      <div className="flex justify-end gap-2 mt-2 text-xs text-slate-500">
        <span>
          <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border">
            Enter
          </kbd>{' '}
          to execute
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-background-tertiary rounded border border-border">
            Esc
          </kbd>{' '}
          to cancel
        </span>
      </div>
    </div>
  )
}

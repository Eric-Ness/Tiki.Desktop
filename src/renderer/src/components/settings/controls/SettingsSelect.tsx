interface SettingsSelectOption {
  value: string
  label: string
}

interface SettingsSelectProps {
  label: string
  description?: string
  value: string
  options: SettingsSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function SettingsSelect({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false
}: SettingsSelectProps) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-slate-200">{label}</div>
          {description && (
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-background-tertiary border border-border rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

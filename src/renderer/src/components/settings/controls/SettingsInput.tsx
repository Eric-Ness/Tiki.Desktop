interface SettingsInputProps {
  label: string
  description?: string
  value: string | number
  type?: 'text' | 'number'
  placeholder?: string
  onChange: (value: string | number) => void
  disabled?: boolean
  min?: number
  max?: number
}

export function SettingsInput({
  label,
  description,
  value,
  type = 'text',
  placeholder,
  onChange,
  disabled = false,
  min,
  max
}: SettingsInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const num = parseInt(e.target.value, 10)
      if (!isNaN(num)) {
        onChange(num)
      }
    } else {
      onChange(e.target.value)
    }
  }

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
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full bg-background-tertiary border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

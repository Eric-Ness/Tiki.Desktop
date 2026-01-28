interface BaseFieldProps {
  label: string
  description?: string
}

interface ConfigToggleProps extends BaseFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function ConfigToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false
}: ConfigToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-4">
      <div className="flex-1 pr-4">
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

interface SelectOption {
  value: string
  label: string
}

interface ConfigSelectProps extends BaseFieldProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function ConfigSelect({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false
}: ConfigSelectProps) {
  return (
    <div className="py-3 first:pt-4">
      <div className="mb-2">
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-background-tertiary border border-border rounded px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-amber-500 ${
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

interface ConfigInputProps extends BaseFieldProps {
  value: string | number
  type?: 'text' | 'number'
  placeholder?: string
  onChange: (value: string | number) => void
  disabled?: boolean
  min?: number
  max?: number
}

export function ConfigInput({
  label,
  description,
  value,
  type = 'text',
  placeholder,
  onChange,
  disabled = false,
  min,
  max
}: ConfigInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const num = parseInt(e.target.value, 10)
      if (!isNaN(num)) {
        // Clamp to min/max if specified
        let clamped = num
        if (min !== undefined) clamped = Math.max(min, clamped)
        if (max !== undefined) clamped = Math.min(max, clamped)
        onChange(clamped)
      }
    } else {
      onChange(e.target.value)
    }
  }

  return (
    <div className="py-3 first:pt-4">
      <div className="mb-2">
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full bg-background-tertiary border border-border rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

# UI Patterns Analysis

## Overview

This document catalogs existing UI patterns in Tiki Desktop that inform the design of new project creation flows.

---

## Dialog Architecture

### Standard Dialog Structure

All dialogs follow this consistent structure:

```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm">  {/* Backdrop */}
  <div className="absolute inset-0 flex items-center justify-center p-8">  {/* Container */}
    <div className="w-full max-w-[width] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">  {/* Modal */}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <h2>Title</h2>
        <button>Close</button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step content */}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <button>Cancel</button>
        <button>Action</button>
      </div>

    </div>
  </div>
</div>
```

### Dialog Width Classes

| Dialog Type | Width Class | Use Case |
|-------------|-------------|----------|
| Small | `max-w-sm` | Confirmations, simple inputs |
| Medium | `max-w-md` | Single forms |
| Large | `max-w-lg` | Multi-field forms |
| Extra Large | `max-w-xl` | Forms with previews |
| 2XL | `max-w-2xl` | Wizards, complex flows |
| 4XL | `max-w-4xl` | Settings, tabbed interfaces |

### Reference Dialogs

| Dialog | File | Width | Features |
|--------|------|-------|----------|
| CreateIssueDialog | `sidebar/CreateIssueDialog.tsx` | 500px | Simple form |
| CreateBranchDialog | `git/CreateBranchDialog.tsx` | md | Validation |
| CreateReleaseDialog | `releases/CreateReleaseDialog.tsx` | lg | Multi-mode |
| CreateTemplateDialog | `templates/CreateTemplateDialog.tsx` | 2xl | 2-step wizard |
| ApplyTemplateDialog | `templates/ApplyTemplateDialog.tsx` | 2xl | 2-step wizard |
| RollbackDialog | `rollback/RollbackDialog.tsx` | lg | State machine |
| SettingsModal | `settings/SettingsModal.tsx` | 4xl | Tabbed |

---

## Multi-Step Wizard Patterns

### Pattern 1: Simple Step State (CreateTemplateDialog)

```typescript
const [step, setStep] = useState<'form' | 'preview'>('form')

// Step indicator in header
{step === 'preview' && (
  <span className="px-2 py-0.5 text-[10px] bg-amber-600 text-white rounded">
    Preview
  </span>
)}

// Footer step counter
<div className="text-xs text-slate-500">
  {step === 'form' ? 'Step 1 of 2: Configure' : 'Step 2 of 2: Review'}
</div>

// Conditional buttons
{step === 'form' ? (
  <button onClick={handleNext}>Next</button>
) : (
  <>
    <button onClick={() => setStep('form')}>Back</button>
    <button onClick={handleCreate}>Create</button>
  </>
)}
```

### Pattern 2: State Machine (RollbackDialog)

```typescript
type DialogState = 'loading' | 'preview' | 'progress' | 'success' | 'error'

const [dialogState, setDialogState] = useState<DialogState>('loading')

// State-based rendering
{dialogState === 'loading' && <LoadingSpinner />}
{dialogState === 'preview' && <PreviewView />}
{dialogState === 'progress' && <ProgressView />}
{dialogState === 'success' && <SuccessView />}
{dialogState === 'error' && <ErrorView onRetry={handleRetry} />}
```

### Step Transition Best Practices

1. **Validate before transitioning:**
   ```typescript
   const handleNext = () => {
     if (!isValid) {
       setError('Please fill in all required fields')
       return
     }
     setStep('preview')
   }
   ```

2. **Async transitions:**
   ```typescript
   const handlePreview = async () => {
     try {
       const result = await generatePreview()
       setPreviewData(result)
       setStep('preview')  // Only transition on success
     } catch (err) {
       setError(err.message)  // Stay on current step
     }
   }
   ```

3. **Escape key handling:**
   ```typescript
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Escape') {
       if (step === 'preview') {
         setStep('form')  // Go back one step
       } else {
         onClose()  // Close dialog
       }
     }
   }
   ```

---

## Form Control Patterns

### Text Input

```tsx
<div>
  <label className="block text-sm font-medium text-slate-200 mb-1.5">
    Label
    {required && <span className="text-red-400 ml-1">*</span>}
  </label>
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="Placeholder..."
    className="w-full bg-background-tertiary border border-border rounded px-3 py-2
               text-sm text-slate-200 placeholder-slate-500
               outline-none focus:border-amber-500"
  />
  {error && <span className="text-xs text-red-400 mt-1">{error}</span>}
  {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
</div>
```

### Select

```tsx
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full bg-background-tertiary border border-border rounded px-3 py-2
             text-sm text-slate-200 focus:border-amber-500 outline-none"
>
  {options.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

### Toggle/Switch

```tsx
<button
  onClick={() => setValue(!value)}
  className={`relative w-10 h-5 rounded-full transition-colors ${
    value ? 'bg-amber-600' : 'bg-slate-600'
  }`}
>
  <span
    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
      value ? 'translate-x-5' : 'translate-x-0.5'
    }`}
  />
</button>
```

### Checkbox Group (Multi-select)

```tsx
<div className="space-y-1">
  {options.map(opt => {
    const isSelected = selectedValues.includes(opt.value)
    return (
      <label
        key={opt.value}
        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-amber-900/20' : 'hover:bg-slate-800'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleValue(opt.value)}
          className="sr-only"
        />
        <span className={`w-4 h-4 rounded border flex items-center justify-center ${
          isSelected ? 'bg-amber-600 border-amber-600' : 'border-slate-500'
        }`}>
          {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
        </span>
        <span className="text-sm text-slate-200">{opt.label}</span>
      </label>
    )
  })}
</div>
```

---

## Button Patterns

### Primary Action

```tsx
<button
  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500
             text-white rounded transition-colors disabled:opacity-50"
  disabled={loading || !isValid}
>
  {loading ? 'Loading...' : 'Action'}
</button>
```

### Secondary/Cancel

```tsx
<button
  className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100
             transition-colors"
>
  Cancel
</button>
```

### Outline/Tertiary

```tsx
<button
  className="px-3 py-1.5 text-sm border border-slate-600 text-slate-300
             rounded hover:border-slate-500 hover:text-slate-200
             transition-colors"
>
  Optional Action
</button>
```

### Loading State

```tsx
<button disabled={loading}>
  {loading ? (
    <span className="flex items-center gap-2">
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Creating...
    </span>
  ) : (
    'Create'
  )}
</button>
```

---

## Error & Status Patterns

### Inline Error

```tsx
{error && (
  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
    <div className="flex items-center gap-2">
      <AlertCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-400">{error}</span>
    </div>
  </div>
)}
```

### Success State

```tsx
{success && (
  <div className="flex items-center gap-3 p-4 bg-green-400/10 border border-green-500/20 rounded-lg">
    <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
    <div>
      <h4 className="text-sm font-medium text-green-400">Success!</h4>
      <p className="text-sm text-slate-300 mt-1">Details here</p>
    </div>
  </div>
)}
```

### Warning/Info Box

```tsx
<div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded">
  <div className="text-[10px] text-amber-400 uppercase mb-1">Note</div>
  <div className="text-sm text-slate-200">Important information here</div>
</div>
```

### Error State with Retry

```tsx
function ErrorView({ error, onClose, onRetry }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-red-400/10 border border-red-500/20 rounded-lg">
        <AlertCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-red-400">Operation Failed</h4>
          <p className="text-sm text-red-300 mt-1">{error}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose}>Close</button>
        <button onClick={onRetry}>Retry</button>
      </div>
    </div>
  )
}
```

---

## Loading States

### Centered Spinner

```tsx
<div className="flex items-center justify-center py-12">
  <LoaderIcon className="w-5 h-5 animate-spin text-slate-400" />
  <span className="ml-3 text-sm text-slate-400">Loading...</span>
</div>
```

### Inline Loading

```tsx
<div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400
                bg-background border border-border rounded">
  <LoaderIcon className="w-4 h-4 animate-spin" />
  Processing...
</div>
```

### Progress Bar

```tsx
<div className="space-y-1">
  <div className="flex justify-between text-xs text-slate-400">
    <span>{stage}</span>
    <span>{current}/{total}</span>
  </div>
  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
    <div
      className="h-full bg-amber-500 transition-all duration-300"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
</div>
```

### Skeleton Loading

```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-700 rounded w-3/4" />
  <div className="h-4 bg-slate-700 rounded w-1/2" />
  <div className="h-4 bg-slate-700 rounded w-5/6" />
</div>
```

---

## State Management Patterns

### Form Validation with useMemo

```typescript
const isValid = useMemo(() => {
  return name.trim().length > 0 &&
         description.trim().length > 0 &&
         items.length > 0
}, [name, description, items])
```

### State Reset on Dialog Close

```typescript
useEffect(() => {
  if (!isOpen) {
    setName('')
    setDescription('')
    setError(null)
    setStep('form')
    setLoading(false)
  }
}, [isOpen])
```

### Async Data Loading on Open

```typescript
useEffect(() => {
  if (!isOpen) return

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchData()
      setData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  loadData()
}, [isOpen])
```

### Keyboard Handling

```typescript
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Don't allow escape during operations
      if (dialogState === 'progress') return
      onClose()
    }
    if (e.key === 'Enter' && isValid && !loading) {
      e.preventDefault()
      handleSubmit()
    }
  },
  [onClose, dialogState, isValid, loading, handleSubmit]
)
```

---

## Color System

### Background Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `background` | `#0f0f0f` | Page background |
| `background-secondary` | `#1a1a1a` | Modal/card background |
| `background-tertiary` | `#242424` | Input/form background |

### Border Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `border` | `#2a2a2a` | Normal borders |
| `border-hover` | `#3a3a3a` | Hover state borders |

### Status Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `status-pending` | `#6b7280` | Gray - pending |
| `status-running` | `#f59e0b` | Amber - active |
| `status-completed` | `#22c55e` | Green - success |
| `status-failed` | `#ef4444` | Red - error |
| `status-skipped` | `#6b7280` | Gray - skipped |

### Text Colors

| Class | Usage |
|-------|-------|
| `text-slate-100` | Primary headings |
| `text-slate-200` | Labels, important text |
| `text-slate-300` | Body text |
| `text-slate-400` | Secondary text |
| `text-slate-500` | Helper text, placeholders |
| `text-slate-600` | Disabled text |

### Accent Colors

| Class | Usage |
|-------|-------|
| `text-amber-400` | Links, highlights |
| `bg-amber-600` | Primary buttons |
| `bg-amber-500` | Button hover |
| `border-amber-500` | Focus state |

---

## Async Operation Patterns

### Pattern 1: Simple Async (Button Click)

```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async () => {
  setLoading(true)
  setError(null)

  try {
    await performOperation()
    onSuccess()
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Operation failed')
  } finally {
    setLoading(false)
  }
}
```

### Pattern 2: Async with State Transitions

```typescript
const handleExecute = async () => {
  setDialogState('progress')

  try {
    const result = await performOperation()

    if (result.success) {
      setResult(result)
      setDialogState('success')
    } else {
      setError(result.error)
      setDialogState('error')
    }
  } catch (err) {
    setError(err.message)
    setDialogState('error')
  }
}

const handleRetry = () => {
  setError(null)
  setDialogState('loading')
  // Effect will re-trigger load
}
```

### Pattern 3: Async with Progress Updates

```typescript
const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })

useEffect(() => {
  if (!isOpen) return

  const unsubscribe = window.tikiDesktop.operation.onProgress((data) => {
    setProgress(data)
  })

  return unsubscribe
}, [isOpen])

const handleStart = async () => {
  setDialogState('progress')
  setProgress({ current: 0, total: items.length, message: 'Starting...' })

  try {
    const result = await window.tikiDesktop.operation.execute(items)
    setDialogState('success')
  } catch (err) {
    setDialogState('error')
  }
}
```

---

## Settings Controls (Reusable)

Located in `src/renderer/src/components/settings/controls/`

### SettingsInput

```tsx
<SettingsInput
  label="Name"
  value={name}
  onChange={setName}
  placeholder="Enter name..."
  required
  error={nameError}
/>
```

### SettingsSelect

```tsx
<SettingsSelect
  label="Framework"
  value={framework}
  onChange={setFramework}
  options={[
    { value: 'vitest', label: 'Vitest' },
    { value: 'jest', label: 'Jest' }
  ]}
/>
```

### SettingsToggle

```tsx
<SettingsToggle
  label="Enable TDD"
  description="Require tests for all changes"
  checked={tddEnabled}
  onChange={setTddEnabled}
/>
```

---

## Component Checklist for New Dialogs

When creating a new dialog, ensure:

- [ ] Backdrop with blur effect
- [ ] Proper max-width for content type
- [ ] Header with title and close button
- [ ] Scrollable content area
- [ ] Footer with action buttons
- [ ] Keyboard handling (Escape, Enter)
- [ ] Loading states for async operations
- [ ] Error display with recovery options
- [ ] State reset on close
- [ ] Form validation before submission
- [ ] Proper focus management
- [ ] Disabled states during operations

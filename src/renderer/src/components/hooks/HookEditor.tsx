import { useState, useEffect } from 'react'
import { Save, X, FileCode } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

interface HookEditorProps {
  onSave?: (name: string) => void
  onCancel?: () => void
}

const HOOK_TEMPLATES: Record<string, { name: string; content: string; description: string }> = {
  'pre-ship': {
    name: 'pre-ship',
    description: 'Runs before shipping an issue (before commit)',
    content: `#!/bin/bash
# Pre-ship hook
# Runs before the ship commit is created
set -e

echo "Pre-ship hook: Processing issue #\${TIKI_ISSUE_NUMBER:-unknown}"

# Add your pre-ship logic here
# Examples:
# - Bump version numbers
# - Run final checks
# - Update changelog

echo "Pre-ship hook completed"
`
  },
  'post-ship': {
    name: 'post-ship',
    description: 'Runs after shipping an issue (after commit)',
    content: `#!/bin/bash
# Post-ship hook
# Runs after the ship commit is created
set -e

echo "Post-ship hook: Issue #\${TIKI_ISSUE_NUMBER:-unknown} shipped"
echo "Commit: \${TIKI_COMMIT_SHA:-unknown}"

# Add your post-ship logic here
# Examples:
# - Send notifications
# - Trigger deployments
# - Update external systems

echo "Post-ship hook completed"
`
  },
  'pre-commit': {
    name: 'pre-commit',
    description: 'Runs before any commit',
    content: `#!/bin/bash
# Pre-commit hook
# Runs before commits are created
set -e

echo "Pre-commit hook running..."

# Add your pre-commit logic here
# Examples:
# - Run linter
# - Format code
# - Run quick tests

echo "Pre-commit hook completed"
`
  },
  custom: {
    name: 'custom-hook',
    description: 'Empty hook template',
    content: `#!/bin/bash
# Custom hook
set -e

echo "Custom hook running..."

# Add your logic here

echo "Hook completed"
`
  }
}

export function HookEditor({ onSave, onCancel }: HookEditorProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [hookTypes, setHookTypes] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string>('pre-ship')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available hook types
  useEffect(() => {
    window.tikiDesktop.hooks.types().then(setHookTypes).catch((err) => logger.error('Failed to load hook types:', err))
  }, [])

  // Update content when type changes
  useEffect(() => {
    const template = HOOK_TEMPLATES[selectedType] || HOOK_TEMPLATES.custom
    setContent(template.content)
    if (!name || Object.keys(HOOK_TEMPLATES).includes(name)) {
      setName(template.name)
    }
  }, [selectedType])

  const handleSave = async () => {
    if (!activeProject?.path || !name.trim() || !content.trim()) {
      setError('Please provide a name and content')
      return
    }

    // Validate name (no spaces, special chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Hook name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Ensure hooks directory exists
      await window.tikiDesktop.hooks.ensureDirectory(activeProject.path)

      // Write the hook
      const success = await window.tikiDesktop.hooks.write(name, content, activeProject.path)

      if (success) {
        onSave?.(name)
      } else {
        setError('Failed to save hook')
      }
    } catch (err) {
      logger.error('Failed to save hook:', err)
      setError('Failed to save hook')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-200">Create New Hook</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Create Hook'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Hook Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Hook Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:border-amber-500 focus:outline-none"
          >
            {hookTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value="custom">custom</option>
          </select>
          {HOOK_TEMPLATES[selectedType] && (
            <p className="mt-1 text-xs text-slate-500">
              {HOOK_TEMPLATES[selectedType].description}
            </p>
          )}
        </div>

        {/* Hook Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Hook Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., pre-ship or version-bump"
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:border-amber-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Will be saved as .tiki/hooks/{name || 'hook-name'}
          </p>
        </div>

        {/* Hook Content */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Script Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 bg-slate-800 text-slate-200 font-mono text-sm border border-slate-700 rounded p-3 focus:border-amber-500 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Templates Quick Select */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Quick Templates</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(HOOK_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedType(key)
                  setName(template.name)
                  setContent(template.content)
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedType === key
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

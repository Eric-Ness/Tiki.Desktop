import { useState, useEffect } from 'react'
import { Save, X, FileText } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

type CommandSource = 'claude' | 'tiki'

interface CommandEditorProps {
  onSave?: (name: string) => void
  onCancel?: () => void
}

const COMMAND_TEMPLATES: Record<string, { name: string; content: string; description: string }> = {
  basic: {
    name: 'my-command',
    description: 'Basic command template',
    content: `# My Command

A description of what this command does.

## Usage

\`\`\`
/my-command [args]
\`\`\`

## Instructions

When this command is invoked:

1. Step one
2. Step two
3. Step three

## Context

- Any relevant context for the assistant
`
  },
  workflow: {
    name: 'workflow',
    description: 'Multi-step workflow command',
    content: `# Workflow Command

Executes a multi-step workflow.

## Steps

### Step 1: Preparation

- Verify prerequisites
- Set up environment

### Step 2: Execution

- Run main task
- Handle errors

### Step 3: Cleanup

- Clean temporary files
- Report results

## Error Handling

If any step fails:
1. Log the error
2. Attempt recovery
3. Report to user
`
  },
  review: {
    name: 'review',
    description: 'Code review command',
    content: `# Code Review

Review code changes for quality and best practices.

## Focus Areas

1. **Code Quality**
   - Clean code principles
   - DRY / SOLID
   - Error handling

2. **Security**
   - Input validation
   - Authentication/Authorization
   - Data exposure

3. **Performance**
   - Complexity analysis
   - Resource usage
   - Caching opportunities

## Output Format

Provide feedback in this format:

\`\`\`
## Summary
[Overall assessment]

## Issues Found
- [Issue 1]
- [Issue 2]

## Suggestions
- [Suggestion 1]
\`\`\`
`
  }
}

const sourceColors: Record<CommandSource, string> = {
  claude: 'bg-purple-600 text-purple-100',
  tiki: 'bg-emerald-600 text-emerald-100'
}

export function CommandEditor({ onSave, onCancel }: CommandEditorProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic')
  const [source, setSource] = useState<CommandSource>('claude')
  const [namespace, setNamespace] = useState<string>('')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available namespaces
  useEffect(() => {
    if (activeProject?.path) {
      window.tikiDesktop.commands
        .namespaces(activeProject.path)
        .then(setNamespaces)
        .catch((err) => logger.error('Failed to load namespaces:', err))
    }
  }, [activeProject?.path])

  // Update content when template changes
  useEffect(() => {
    const template = COMMAND_TEMPLATES[selectedTemplate] || COMMAND_TEMPLATES.basic
    setContent(template.content)
    if (!name || Object.values(COMMAND_TEMPLATES).some((t) => t.name === name)) {
      setName(template.name)
    }
  }, [selectedTemplate])

  const handleSave = async () => {
    if (!activeProject?.path || !name.trim() || !content.trim()) {
      setError('Please provide a name and content')
      return
    }

    // Validate name (no spaces, special chars except hyphens and underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError('Command name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    // Validate namespace if provided
    if (namespace && !/^[a-zA-Z0-9_-]+$/.test(namespace)) {
      setError('Namespace can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Ensure commands directory exists for the chosen source
      await window.tikiDesktop.commands.ensureDirectory(activeProject.path, source)

      // Build full command name
      const fullName = namespace ? `${namespace}:${name}` : name

      // Write the command with the source parameter
      const success = await window.tikiDesktop.commands.write(fullName, content, activeProject.path, source)

      if (success) {
        onSave?.(fullName)
      } else {
        setError('Failed to save command')
      }
    } catch (err) {
      logger.error('Failed to save command:', err)
      setError('Failed to save command')
    } finally {
      setSaving(false)
    }
  }

  const getPreviewPath = () => {
    const baseDir = source === 'tiki' ? '.tiki' : '.claude'
    const parts = [baseDir, 'commands']
    if (namespace) parts.push(namespace)
    parts.push((name || 'command-name') + '.md')
    return parts.join('/')
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-500" />
          <h2 className="text-lg font-semibold text-slate-200">Create New Command</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Create Command'}
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

        {/* Location (Source) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSource('claude')}
              className={`flex-1 px-3 py-2 rounded border transition-colors ${
                source === 'claude'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className={`inline-block px-1.5 py-0.5 text-xs rounded mr-2 ${sourceColors.claude}`}>
                .claude/commands
              </span>
              <span className="text-xs">User commands</span>
            </button>
            <button
              onClick={() => setSource('tiki')}
              className={`flex-1 px-3 py-2 rounded border transition-colors ${
                source === 'tiki'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className={`inline-block px-1.5 py-0.5 text-xs rounded mr-2 ${sourceColors.tiki}`}>
                .tiki/commands
              </span>
              <span className="text-xs">Project commands</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {source === 'tiki'
              ? 'Stored in .tiki/commands/ - project-specific commands'
              : 'Stored in .claude/commands/ - user/shared commands'}
          </p>
        </div>

        {/* Namespace */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Namespace (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder="e.g., tiki, dev, custom"
              className="flex-1 bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:border-cyan-500 focus:outline-none"
              list="namespace-suggestions"
            />
            <datalist id="namespace-suggestions">
              {namespaces.map((ns) => (
                <option key={ns} value={ns} />
              ))}
            </datalist>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Group related commands under a namespace (e.g., tiki:ship, dev:build)
          </p>
        </div>

        {/* Command Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Command Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., deploy, review, cleanup"
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Will be saved as {getPreviewPath()}</p>
        </div>

        {/* Command Content */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Command Instructions (Markdown)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 bg-slate-800 text-slate-200 font-mono text-sm border border-slate-700 rounded p-3 focus:border-cyan-500 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Templates Quick Select */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Quick Templates</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COMMAND_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedTemplate(key)
                  setName(template.name)
                  setContent(template.content)
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTemplate === key
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
          {COMMAND_TEMPLATES[selectedTemplate] && (
            <p className="mt-2 text-xs text-slate-500">
              {COMMAND_TEMPLATES[selectedTemplate].description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

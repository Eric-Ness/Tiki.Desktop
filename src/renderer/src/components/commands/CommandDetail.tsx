import { useState, useEffect, useCallback } from 'react'
import { Save, X, FileText, Copy, Check } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

type CommandSource = 'claude' | 'tiki'

interface Command {
  name: string
  path: string
  relativePath: string
  namespace?: string
  source: CommandSource
  content?: string
}

const sourceColors: Record<CommandSource, string> = {
  claude: 'bg-purple-600 text-purple-100',
  tiki: 'bg-emerald-600 text-emerald-100'
}

interface CommandDetailProps {
  commandName: string
  onClose?: () => void
}

export function CommandDetail({ commandName, onClose }: CommandDetailProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [command, setCommand] = useState<Command | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load command content
  const loadCommand = useCallback(async () => {
    if (!activeProject?.path || !commandName) {
      setCommand(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loadedCommand = await window.tikiDesktop.commands.read(commandName, activeProject.path)
      setCommand(loadedCommand)
      setContent(loadedCommand?.content || '')
      setHasChanges(false)
    } catch (err) {
      logger.error('Failed to load command:', err)
      setCommand(null)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path, commandName])

  useEffect(() => {
    loadCommand()
  }, [loadCommand])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setHasChanges(e.target.value !== command?.content)
  }

  const handleSave = async () => {
    if (!activeProject?.path || !commandName || !hasChanges) return

    setSaving(true)
    try {
      await window.tikiDesktop.commands.write(commandName, content, activeProject.path)
      setHasChanges(false)
      // Reload to get updated command
      await loadCommand()
    } catch (err) {
      logger.error('Failed to save command:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(`/${commandName}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>
    )
  }

  if (!command) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">Command not found</div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-500" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-200">/{command.name}</h2>
              <button
                onClick={handleCopyName}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="Copy command name"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">{command.relativePath}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Command Info */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 border-b border-slate-700 text-sm">
        <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${sourceColors[command.source]}`}>
          {command.source === 'tiki' ? '.tiki' : '.claude'}
        </span>
        {command.namespace && (
          <span className="text-slate-400">
            Namespace: <span className="text-slate-200">{command.namespace}</span>
          </span>
        )}
        <span className="text-slate-400">
          Invoke: <code className="text-cyan-400 bg-slate-800 px-1 rounded">/{command.name}</code>
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="ml-auto text-xs text-cyan-500 hover:text-cyan-400"
        >
          {isEditing ? 'View Mode' : 'Edit Mode'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {isEditing ? (
            <textarea
              value={content}
              onChange={handleContentChange}
              className="w-full h-full min-h-[300px] bg-slate-800 text-slate-200 font-mono text-sm p-4 rounded border border-slate-700 focus:border-cyan-500 focus:outline-none resize-none"
              spellCheck={false}
            />
          ) : (
            <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden p-4">
              <div className="prose prose-invert prose-sm max-w-none">
                <MarkdownPreview content={content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple markdown preview component
function MarkdownPreview({ content }: { content: string }) {
  // Very basic markdown rendering - just for preview
  const lines = content.split('\n')

  return (
    <div className="space-y-2 text-slate-300 text-sm font-mono whitespace-pre-wrap">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-xl font-bold text-slate-100 mt-4 mb-2">
              {line.slice(2)}
            </h1>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-semibold text-slate-100 mt-3 mb-1">
              {line.slice(3)}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-medium text-slate-200 mt-2 mb-1">
              {line.slice(4)}
            </h3>
          )
        }
        // Code blocks (triple backticks)
        if (line.startsWith('```')) {
          return (
            <div key={i} className="text-xs text-slate-500">
              {line}
            </div>
          )
        }
        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-slate-500">-</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }
        // Numbered items
        const numberedMatch = line.match(/^(\d+)\. (.*)/)
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-slate-500">{numberedMatch[1]}.</span>
              <span>{numberedMatch[2]}</span>
            </div>
          )
        }
        // Empty lines
        if (!line.trim()) {
          return <div key={i} className="h-2" />
        }
        // Regular text
        return <div key={i}>{line}</div>
      })}
    </div>
  )
}

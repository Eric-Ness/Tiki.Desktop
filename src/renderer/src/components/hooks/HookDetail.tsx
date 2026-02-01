import { useState, useEffect, useCallback } from 'react'
import { Save, Play, X, FileCode, Clock, CheckCircle, XCircle } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'
import { SyntaxHighlighter } from '../code/SyntaxHighlighter'

interface Hook {
  name: string
  path: string
  type: string
  enabled: boolean
  content?: string
}

interface HookExecutionResult {
  hook: string
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  timestamp: string
  success: boolean
}

interface HookDetailProps {
  hookName: string
  onClose?: () => void
}

export function HookDetail({ hookName, onClose }: HookDetailProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [hook, setHook] = useState<Hook | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [lastResult, setLastResult] = useState<HookExecutionResult | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load hook content
  const loadHook = useCallback(async () => {
    if (!activeProject?.path || !hookName) {
      setHook(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loadedHook = await window.tikiDesktop.hooks.read(hookName, activeProject.path)
      setHook(loadedHook)
      setContent(loadedHook?.content || '')
      setHasChanges(false)
    } catch (err) {
      logger.error('Failed to load hook:', err)
      setHook(null)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path, hookName])

  useEffect(() => {
    loadHook()
  }, [loadHook])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setHasChanges(e.target.value !== hook?.content)
  }

  const handleSave = async () => {
    if (!activeProject?.path || !hookName || !hasChanges) return

    setSaving(true)
    try {
      await window.tikiDesktop.hooks.write(hookName, content, activeProject.path)
      setHasChanges(false)
      // Reload to get updated hook
      await loadHook()
    } catch (err) {
      logger.error('Failed to save hook:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleExecute = async () => {
    if (!activeProject?.path || !hookName || executing) return

    setExecuting(true)
    setLastResult(null)
    try {
      const result = await window.tikiDesktop.hooks.execute(hookName, {}, activeProject.path)
      setLastResult(result)
    } catch (err) {
      logger.error('Failed to execute hook:', err)
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Loading...
      </div>
    )
  }

  if (!hook) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Hook not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-200">{hook.name}</h2>
            <p className="text-xs text-slate-500">{hook.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white text-sm rounded transition-colors"
          >
            <Play className={`w-4 h-4 ${executing ? 'animate-pulse' : ''}`} />
            {executing ? 'Running...' : 'Run'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
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

      {/* Hook Info */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 border-b border-slate-700 text-sm">
        <span className="text-slate-400">
          Type: <span className="text-slate-200">{hook.type}</span>
        </span>
        <span className="text-slate-400">
          Status:{' '}
          <span className={hook.enabled ? 'text-green-400' : 'text-slate-500'}>
            {hook.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="ml-auto text-xs text-amber-500 hover:text-amber-400"
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
              className="w-full h-full min-h-[300px] bg-slate-800 text-slate-200 font-mono text-sm p-4 rounded border border-slate-700 focus:border-amber-500 focus:outline-none resize-none"
              spellCheck={false}
            />
          ) : (
            <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
              <SyntaxHighlighter code={content} language="bash" showLineNumbers />
            </div>
          )}
        </div>

        {/* Execution Result */}
        {lastResult && (
          <div className="border-t border-slate-700">
            <div
              className={`flex items-center gap-2 px-4 py-2 text-sm ${
                lastResult.success ? 'bg-green-900/30' : 'bg-red-900/30'
              }`}
            >
              {lastResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={lastResult.success ? 'text-green-400' : 'text-red-400'}>
                {lastResult.success ? 'Success' : 'Failed'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastResult.duration}ms
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Exit code: {lastResult.exitCode}</span>
            </div>
            {(lastResult.stdout || lastResult.stderr) && (
              <div className="max-h-48 overflow-auto">
                {lastResult.stdout && (
                  <div className="px-4 py-2 bg-slate-800/50">
                    <div className="text-xs text-slate-500 mb-1">Output</div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                      {lastResult.stdout}
                    </pre>
                  </div>
                )}
                {lastResult.stderr && (
                  <div className="px-4 py-2 bg-red-900/20">
                    <div className="text-xs text-red-400 mb-1">Errors</div>
                    <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                      {lastResult.stderr}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

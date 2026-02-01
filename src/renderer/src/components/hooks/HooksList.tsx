import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Play, Trash2, FileCode } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

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

const typeColors: Record<string, string> = {
  'pre-ship': 'bg-amber-600 text-amber-100',
  'post-ship': 'bg-green-600 text-green-100',
  'pre-commit': 'bg-blue-600 text-blue-100',
  'post-commit': 'bg-cyan-600 text-cyan-100',
  'pre-execute': 'bg-purple-600 text-purple-100',
  'post-execute': 'bg-pink-600 text-pink-100',
  'phase-start': 'bg-indigo-600 text-indigo-100',
  'phase-complete': 'bg-teal-600 text-teal-100',
  custom: 'bg-slate-600 text-slate-100'
}

interface HooksListProps {
  onSelectHook?: (hook: Hook) => void
  onCreateHook?: () => void
}

export function HooksList({ onSelectHook, onCreateHook }: HooksListProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [history, setHistory] = useState<HookExecutionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)
  const selectedHook = useTikiStore((state) => state.selectedHook)
  const setSelectedHook = useTikiStore((state) => state.setSelectedHook)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)

  // Load hooks
  const loadHooks = useCallback(async () => {
    if (!activeProject?.path) {
      setHooks([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [loadedHooks, loadedHistory] = await Promise.all([
        window.tikiDesktop.hooks.list(activeProject.path),
        window.tikiDesktop.hooks.history(5)
      ])
      setHooks(loadedHooks)
      setHistory(loadedHistory)
    } catch (err) {
      logger.error('Failed to load hooks:', err)
      setHooks([])
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path])

  useEffect(() => {
    loadHooks()
  }, [loadHooks])

  const setSelectedCommand = useTikiStore((state) => state.setSelectedCommand)

  const handleSelectHook = (hook: Hook) => {
    // Clear other selections
    setSelectedNode(null)
    setSelectedIssue(null)
    setSelectedRelease(null)
    setSelectedKnowledge(null)
    setSelectedCommand(null)
    setSelectedHook(hook.name)
    onSelectHook?.(hook)
  }

  const handleExecuteHook = async (e: React.MouseEvent, hook: Hook) => {
    e.stopPropagation()
    if (!activeProject?.path || executing) return

    setExecuting(hook.name)
    try {
      const result = await window.tikiDesktop.hooks.execute(hook.name, {}, activeProject.path)
      // Refresh history after execution
      const newHistory = await window.tikiDesktop.hooks.history(5)
      setHistory(newHistory)

      if (!result.success) {
        logger.error(`Hook ${hook.name} failed:`, result.stderr)
      }
    } catch (err) {
      logger.error(`Failed to execute hook ${hook.name}:`, err)
    } finally {
      setExecuting(null)
    }
  }

  const handleDeleteHook = async (e: React.MouseEvent, hook: Hook) => {
    e.stopPropagation()
    if (!activeProject?.path) return

    if (!window.confirm(`Delete hook "${hook.name}"?`)) return

    try {
      await window.tikiDesktop.hooks.delete(hook.name, activeProject.path)
      if (selectedHook === hook.name) {
        setSelectedHook(null)
      }
      loadHooks()
    } catch (err) {
      logger.error(`Failed to delete hook ${hook.name}:`, err)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  if (!activeProject) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Select a project to view hooks
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <span className="text-sm font-medium text-slate-300">Hooks</span>
        <div className="flex items-center gap-1">
          <button
            onClick={loadHooks}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateHook}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="New Hook"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hooks List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
        ) : hooks.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hooks found</p>
            <p className="text-xs mt-1">Create a hook in .tiki/hooks/</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {hooks.map((hook) => (
              <div
                key={hook.name}
                onClick={() => handleSelectHook(hook)}
                className={`p-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                  selectedHook === hook.name ? 'bg-slate-800 border-l-2 border-amber-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200 truncate">{hook.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleExecuteHook(e, hook)}
                      disabled={executing === hook.name}
                      className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                      title="Run hook"
                    >
                      <Play
                        className={`w-3.5 h-3.5 ${executing === hook.name ? 'animate-pulse' : ''}`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleDeleteHook(e, hook)}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                      title="Delete hook"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded ${typeColors[hook.type] || typeColors.custom}`}
                  >
                    {hook.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {history.length > 0 && (
        <div className="border-t border-slate-700">
          <div className="p-2 text-xs text-slate-500 font-medium">Recent Runs</div>
          <div className="max-h-32 overflow-y-auto">
            {history.map((run, idx) => (
              <div
                key={`${run.hook}-${run.timestamp}-${idx}`}
                className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-800/30"
              >
                <div className="flex items-center gap-2">
                  <span className={run.success ? 'text-green-400' : 'text-red-400'}>
                    {run.success ? '✓' : '✗'}
                  </span>
                  <span className="text-slate-300">{run.hook}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{formatDuration(run.duration)}</span>
                  <span>{formatTimestamp(run.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

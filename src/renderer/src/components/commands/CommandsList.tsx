import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Trash2, FileText, Folder } from 'lucide-react'
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

const namespaceColors: Record<string, string> = {
  tiki: 'bg-amber-600 text-amber-100',
  default: 'bg-slate-600 text-slate-100'
}

const sourceColors: Record<CommandSource, string> = {
  claude: 'bg-purple-600 text-purple-100',
  tiki: 'bg-emerald-600 text-emerald-100'
}

interface CommandsListProps {
  onSelectCommand?: (command: Command) => void
  onCreateCommand?: () => void
}

export function CommandsList({ onSelectCommand, onCreateCommand }: CommandsListProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [commands, setCommands] = useState<Command[]>([])
  const [loading, setLoading] = useState(true)
  const selectedCommand = useTikiStore((state) => state.selectedCommand)
  const setSelectedCommand = useTikiStore((state) => state.setSelectedCommand)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)
  const setSelectedHook = useTikiStore((state) => state.setSelectedHook)

  // Load commands
  const loadCommands = useCallback(async () => {
    if (!activeProject?.path) {
      setCommands([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loadedCommands = await window.tikiDesktop.commands.list(activeProject.path)
      setCommands(loadedCommands)
    } catch (err) {
      console.error('Failed to load commands:', err)
      setCommands([])
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path])

  useEffect(() => {
    loadCommands()
  }, [loadCommands])

  const handleSelectCommand = (command: Command) => {
    // Clear other selections
    setSelectedNode(null)
    setSelectedIssue(null)
    setSelectedRelease(null)
    setSelectedKnowledge(null)
    setSelectedHook(null)
    setSelectedCommand(command.name)
    onSelectCommand?.(command)
  }

  const handleDeleteCommand = async (e: React.MouseEvent, command: Command) => {
    e.stopPropagation()
    if (!activeProject?.path) return

    if (!window.confirm(`Delete command "${command.name}"?`)) return

    try {
      await window.tikiDesktop.commands.delete(command.name, activeProject.path)
      if (selectedCommand === command.name) {
        setSelectedCommand(null)
      }
      loadCommands()
    } catch (err) {
      console.error(`Failed to delete command ${command.name}:`, err)
    }
  }

  // Group commands by source first, then by namespace
  const groupedBySource = commands.reduce(
    (acc, cmd) => {
      const source = cmd.source || 'claude'
      if (!acc[source]) acc[source] = []
      acc[source].push(cmd)
      return acc
    },
    {} as Record<CommandSource, Command[]>
  )

  // Further group by namespace within each source
  const getNamespaceGroups = (cmds: Command[]) => {
    const grouped = cmds.reduce(
      (acc, cmd) => {
        const key = cmd.namespace || '__root__'
        if (!acc[key]) acc[key] = []
        acc[key].push(cmd)
        return acc
      },
      {} as Record<string, Command[]>
    )
    const order = Object.keys(grouped).sort((a, b) => {
      if (a === '__root__') return -1
      if (b === '__root__') return 1
      return a.localeCompare(b)
    })
    return { grouped, order }
  }

  if (!activeProject) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">Select a project to view commands</div>
    )
  }

  const sourceOrder: CommandSource[] = ['tiki', 'claude']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <span className="text-sm font-medium text-slate-300">Commands</span>
        <div className="flex items-center gap-1">
          <button
            onClick={loadCommands}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateCommand}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="New Command"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Commands List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
        ) : commands.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No commands found</p>
            <p className="text-xs mt-1">Create commands in .claude/commands/ or .tiki/commands/</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {sourceOrder.map((source) => {
              const sourceCommands = groupedBySource[source]
              if (!sourceCommands || sourceCommands.length === 0) return null

              const { grouped, order } = getNamespaceGroups(sourceCommands)
              const sourceLabel = source === 'tiki' ? '.tiki/commands' : '.claude/commands'

              return (
                <div key={source}>
                  {/* Source header */}
                  <div className="px-3 py-2 flex items-center gap-2 bg-slate-800/50 border-b border-slate-700">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded font-medium ${sourceColors[source]}`}
                    >
                      {sourceLabel}
                    </span>
                    <span className="text-xs text-slate-500">({sourceCommands.length})</span>
                  </div>

                  {order.map((namespace) => (
                    <div key={`${source}-${namespace}`}>
                      {/* Namespace header (only for namespaced commands) */}
                      {namespace !== '__root__' && (
                        <div className="px-3 py-1.5 flex items-center gap-2 bg-slate-800/30">
                          <Folder className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-400 font-medium">{namespace}</span>
                        </div>
                      )}
                      {/* Commands in namespace */}
                      {grouped[namespace].map((command) => (
                        <div
                          key={command.name}
                          onClick={() => handleSelectCommand(command)}
                          className={`p-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                            selectedCommand === command.name
                              ? 'bg-slate-800 border-l-2 border-cyan-500'
                              : ''
                          } ${namespace !== '__root__' ? 'pl-6' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                className={`w-4 h-4 flex-shrink-0 ${
                                  source === 'tiki' ? 'text-emerald-400' : 'text-purple-400'
                                }`}
                              />
                              <span className="text-sm text-slate-200 truncate">
                                /{command.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => handleDeleteCommand(e, command)}
                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                title="Delete command"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {command.namespace && (
                            <div className="mt-1.5">
                              <span
                                className={`px-1.5 py-0.5 text-xs rounded ${namespaceColors[command.namespace] || namespaceColors.default}`}
                              >
                                {command.namespace}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

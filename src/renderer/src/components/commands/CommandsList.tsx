import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Trash2, FileText, Folder, ChevronDown } from 'lucide-react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

type CommandSource = 'claude' | 'tiki'

const PAGE_SIZE = 15

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

  // Collapse state for source sections
  const [collapsedSources, setCollapsedSources] = useState<Record<CommandSource, boolean>>({
    tiki: false,
    claude: false
  })

  // Collapse state for namespace sections (key: "source-namespace")
  const [collapsedNamespaces, setCollapsedNamespaces] = useState<Record<string, boolean>>({})

  // Pagination state per source
  const [sourcePages, setSourcePages] = useState<Record<CommandSource, number>>({
    tiki: 1,
    claude: 1
  })

  const toggleSourceCollapse = (source: CommandSource) => {
    setCollapsedSources((prev) => ({ ...prev, [source]: !prev[source] }))
  }

  const toggleNamespaceCollapse = (source: CommandSource, namespace: string) => {
    const key = `${source}-${namespace}`
    setCollapsedNamespaces((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const setSourcePage = (source: CommandSource, page: number) => {
    setSourcePages((prev) => ({ ...prev, [source]: page }))
  }

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
      logger.error('Failed to load commands:', err)
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
      logger.error(`Failed to delete command ${command.name}:`, err)
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
              const isSourceCollapsed = collapsedSources[source]

              // Pagination for this source
              const currentPage = sourcePages[source]
              const totalPages = Math.ceil(sourceCommands.length / PAGE_SIZE)
              const showPagination = sourceCommands.length > PAGE_SIZE

              // Get all commands for this source in order (respecting namespaces)
              const allSourceCommands = order.flatMap((ns) => grouped[ns])
              const paginatedCommands = allSourceCommands.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE
              )

              // Build a set of namespaces that have commands in the current page
              const paginatedNamespaces = new Set(paginatedCommands.map((cmd) => cmd.namespace || '__root__'))

              return (
                <div
                  key={source}
                  data-testid={`source-section-${source}`}
                  data-collapsed={isSourceCollapsed ? 'true' : 'false'}
                >
                  {/* Source header - clickable to collapse */}
                  <button
                    onClick={() => toggleSourceCollapse(source)}
                    className="w-full px-3 py-2 flex items-center gap-2 bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isSourceCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded font-medium ${sourceColors[source]}`}
                    >
                      {sourceLabel}
                    </span>
                    <span className="text-xs text-slate-500">({sourceCommands.length})</span>
                  </button>

                  {/* Collapsible content */}
                  <div
                    className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
                    style={{
                      display: 'grid',
                      gridTemplateRows: isSourceCollapsed ? '0fr' : '1fr'
                    }}
                  >
                    <div className="min-h-0">
                      {order.map((namespace) => {
                        // Skip namespaces not in current page
                        if (!paginatedNamespaces.has(namespace)) return null

                        const namespaceKey = `${source}-${namespace}`
                        const isNamespaceCollapsed = collapsedNamespaces[namespaceKey] || false
                        const namespaceCmds = paginatedCommands.filter(
                          (cmd) => (cmd.namespace || '__root__') === namespace
                        )

                        if (namespaceCmds.length === 0) return null

                        return (
                          <div
                            key={namespaceKey}
                            data-testid={`namespace-section-${namespaceKey}`}
                            data-collapsed={isNamespaceCollapsed ? 'true' : 'false'}
                          >
                            {/* Namespace header (only for namespaced commands) */}
                            {namespace !== '__root__' && (
                              <button
                                data-testid={`namespace-header-${namespaceKey}`}
                                onClick={() => toggleNamespaceCollapse(source, namespace)}
                                className="w-full px-3 py-1.5 flex items-center gap-2 bg-slate-800/30 hover:bg-slate-700/30 transition-colors"
                              >
                                <ChevronDown
                                  className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${
                                    isNamespaceCollapsed ? '-rotate-90' : ''
                                  }`}
                                />
                                <Folder className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400 font-medium">{namespace}</span>
                              </button>
                            )}
                            {/* Commands in namespace - collapsible */}
                            <div
                              className="overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
                              style={{
                                display: namespace !== '__root__' ? 'grid' : 'block',
                                gridTemplateRows: isNamespaceCollapsed ? '0fr' : '1fr'
                              }}
                            >
                              <div className="min-h-0">
                                {namespaceCmds.map((command) => (
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
                            </div>
                          </div>
                        )
                      })}

                      {/* Pagination controls */}
                      {showPagination && (
                        <div className="px-2 py-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/50">
                          <button
                            onClick={() => setSourcePage(source, Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Previous page"
                          >
                            &lt; Prev
                          </button>
                          <span>Page {currentPage} of {totalPages}</span>
                          <button
                            onClick={() => setSourcePage(source, Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Next page"
                          >
                            Next &gt;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

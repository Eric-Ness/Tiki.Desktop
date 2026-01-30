import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

type KnowledgeCategory = 'pattern' | 'gotcha' | 'decision' | 'learning'

interface KnowledgeEntry {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  tags?: string[]
  sourceIssue?: number
  createdAt: string
  updatedAt: string
}

const categoryColors: Record<KnowledgeCategory, string> = {
  pattern: 'bg-blue-600 text-blue-100',
  gotcha: 'bg-red-600 text-red-100',
  decision: 'bg-purple-600 text-purple-100',
  learning: 'bg-green-600 text-green-100'
}

const categoryLabels: Record<KnowledgeCategory, string> = {
  pattern: 'Pattern',
  gotcha: 'Gotcha',
  decision: 'Decision',
  learning: 'Learning'
}

interface KnowledgeListProps {
  onSelectEntry?: (entry: KnowledgeEntry) => void
  onCreateEntry?: () => void
}

export function KnowledgeList({ onSelectEntry, onCreateEntry }: KnowledgeListProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | 'all'>('all')
  const selectedKnowledge = useTikiStore((state) => state.selectedKnowledge)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedHook = useTikiStore((state) => state.setSelectedHook)
  const setSelectedCommand = useTikiStore((state) => state.setSelectedCommand)

  // Load entries
  const loadEntries = useCallback(async () => {
    if (!activeProject?.path) {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loaded = await window.tikiDesktop.knowledge.list(activeProject.path, {
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined
      })
      setEntries(loaded)
    } catch (err) {
      console.error('Failed to load knowledge entries:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path, categoryFilter, search])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleSelectEntry = (entry: KnowledgeEntry) => {
    // Clear other selections when selecting a knowledge entry
    setSelectedNode(null)
    setSelectedIssue(null)
    setSelectedRelease(null)
    setSelectedHook(null)
    setSelectedCommand(null)
    setSelectedKnowledge(entry.id)
    onSelectEntry?.(entry)
  }

  // No project
  if (!activeProject) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs">
        No project selected
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="p-2 border-b border-border/50 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search knowledge..."
          className="w-full px-2 py-1 text-xs bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
        />
        <div className="flex flex-wrap gap-1">
          <FilterButton
            key="all"
            active={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </FilterButton>
          {(Object.keys(categoryLabels) as KnowledgeCategory[]).map((cat) => (
            <FilterButton
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {categoryLabels[cat]}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Add button */}
      <div className="p-2 border-b border-border/50">
        <button
          onClick={onCreateEntry}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Entry
        </button>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-center text-slate-500 text-xs">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-3 text-center text-slate-500 text-xs">
            {search || categoryFilter !== 'all'
              ? 'No matching entries'
              : 'No knowledge entries yet'}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleSelectEntry(entry)}
                className={`w-full p-2 text-left hover:bg-background-tertiary transition-colors ${
                  selectedKnowledge === entry.id ? 'bg-background-tertiary' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] rounded ${categoryColors[entry.category]}`}
                  >
                    {categoryLabels[entry.category]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {entry.title}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1 py-0.5 text-[9px] bg-background-tertiary text-slate-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="text-[9px] text-slate-500">
                            +{entry.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry count */}
      {entries.length > 0 && (
        <div className="p-2 border-t border-border/50 text-center text-xs text-slate-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-background-tertiary text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

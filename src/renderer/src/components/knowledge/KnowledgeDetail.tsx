import { useState, useEffect, useCallback } from 'react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'

type KnowledgeCategory = 'pattern' | 'gotcha' | 'decision' | 'learning'

interface KnowledgeEntry {
  id: string
  title: string
  category: KnowledgeCategory
  content: string
  tags: string[]
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

interface KnowledgeDetailProps {
  onClose?: () => void
  onDeleted?: () => void
  onUpdated?: () => void
}

export function KnowledgeDetail({ onClose, onDeleted, onUpdated }: KnowledgeDetailProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const selectedKnowledge = useTikiStore((state) => state.selectedKnowledge)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)

  const [entry, setEntry] = useState<KnowledgeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>('learning')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editSourceIssue, setEditSourceIssue] = useState('')

  // Load entry
  const loadEntry = useCallback(async () => {
    if (!activeProject?.path || !selectedKnowledge) {
      setEntry(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const loaded = await window.tikiDesktop.knowledge.get(activeProject.path, selectedKnowledge)
      setEntry(loaded)
      if (loaded) {
        setEditTitle(loaded.title)
        setEditCategory(loaded.category)
        setEditContent(loaded.content)
        setEditTags(loaded.tags.join(', '))
        setEditSourceIssue(loaded.sourceIssue?.toString() || '')
      }
    } catch (err) {
      logger.error('Failed to load knowledge entry:', err)
      setEntry(null)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.path, selectedKnowledge])

  useEffect(() => {
    loadEntry()
  }, [loadEntry])

  const handleSave = async () => {
    if (!activeProject?.path || !entry) return

    setSaving(true)
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const sourceIssue = editSourceIssue ? parseInt(editSourceIssue, 10) : null

      await window.tikiDesktop.knowledge.update(activeProject.path, entry.id, {
        title: editTitle,
        category: editCategory,
        content: editContent,
        tags,
        sourceIssue
      })

      setEditing(false)
      loadEntry()
      onUpdated?.()
    } catch (err) {
      logger.error('Failed to update knowledge entry:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeProject?.path || !entry) return

    if (!confirm('Are you sure you want to delete this knowledge entry?')) {
      return
    }

    setDeleting(true)
    try {
      await window.tikiDesktop.knowledge.delete(activeProject.path, entry.id)
      setSelectedKnowledge(null)
      onDeleted?.()
    } catch (err) {
      logger.error('Failed to delete knowledge entry:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    setSelectedKnowledge(null)
    onClose?.()
  }

  // No selection
  if (!selectedKnowledge) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Select a knowledge entry to view details
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Loading...
      </div>
    )
  }

  // Not found
  if (!entry) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
        <span>Entry not found</span>
        <button
          onClick={handleClose}
          className="text-amber-500 hover:text-amber-400 text-xs"
        >
          Close
        </button>
      </div>
    )
  }

  // Edit mode
  if (editing) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Edit Entry</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editTitle.trim() || !editContent.trim()}
              className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as KnowledgeCategory)}
              className="w-full px-2 py-1.5 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200"
            >
              {(Object.keys(categoryLabels) as KnowledgeCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              className="w-full px-2 py-1.5 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="api, auth, security"
              className="w-full px-2 py-1.5 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Source Issue */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Issue (optional)</label>
            <input
              type="number"
              value={editSourceIssue}
              onChange={(e) => setEditSourceIssue(e.target.value)}
              placeholder="123"
              className="w-full px-2 py-1.5 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    )
  }

  // View mode
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${categoryColors[entry.category]}`}>
                {categoryLabels[entry.category]}
              </span>
              {entry.sourceIssue && (
                <span className="text-[10px] text-slate-500">
                  from #{entry.sourceIssue}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-200">{entry.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] bg-background-tertiary text-slate-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-sm text-slate-300 whitespace-pre-wrap">{entry.content}</div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 flex items-center justify-between">
        <div className="text-[10px] text-slate-500">
          Updated {new Date(entry.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 disabled:text-slate-500 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}

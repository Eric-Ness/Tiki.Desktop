import { useState } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

type KnowledgeCategory = 'pattern' | 'gotcha' | 'decision' | 'learning'

const categoryLabels: Record<KnowledgeCategory, string> = {
  pattern: 'Pattern',
  gotcha: 'Gotcha',
  decision: 'Decision',
  learning: 'Learning'
}

interface KnowledgeEditorProps {
  onClose: () => void
  onCreated?: () => void
}

export function KnowledgeEditor({ onClose, onCreated }: KnowledgeEditorProps) {
  const activeProject = useTikiStore((state) => state.activeProject)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<KnowledgeCategory>('learning')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [sourceIssue, setSourceIssue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!activeProject?.path) {
      setError('No project selected')
      return
    }

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const parsedSourceIssue = sourceIssue ? parseInt(sourceIssue, 10) : undefined

      const entry = await window.tikiDesktop.knowledge.create(activeProject.path, {
        title: title.trim(),
        category,
        content: content.trim(),
        tags: parsedTags,
        sourceIssue: parsedSourceIssue
      })

      setSelectedKnowledge(entry.id)
      onCreated?.()
      onClose()
    } catch (err) {
      console.error('Failed to create knowledge entry:', err)
      setError('Failed to create entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">New Knowledge Entry</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 text-xs bg-red-900/50 border border-red-700 text-red-300 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., API authentication pattern"
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200"
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
            <label className="block text-xs text-slate-400 mb-1">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Describe the pattern, gotcha, decision, or learning..."
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., api, auth, security"
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Source Issue */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Issue (optional)</label>
            <input
              type="number"
              value={sourceIssue}
              onChange={(e) => setSourceIssue(e.target.value)}
              placeholder="e.g., 123"
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded transition-colors"
          >
            {saving ? 'Creating...' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

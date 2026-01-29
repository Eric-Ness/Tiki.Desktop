import { useState, useEffect } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

interface Label {
  name: string
  color: string
}

interface CreateIssueDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (issueNumber: number) => void
}

export function CreateIssueDialog({ isOpen, onClose, onCreated }: CreateIssueDialogProps) {
  const activeProject = useTikiStore((state) => state.activeProject)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available labels when dialog opens
  useEffect(() => {
    if (isOpen && activeProject?.path) {
      setLoadingLabels(true)
      window.tikiDesktop.github
        .getLabels(activeProject.path)
        .then((labels) => {
          setAvailableLabels(labels)
        })
        .catch(() => {
          // Silently fail - labels are optional
          setAvailableLabels([])
        })
        .finally(() => {
          setLoadingLabels(false)
        })
    }
  }, [isOpen, activeProject?.path])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setBody('')
      setSelectedLabels([])
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!activeProject?.path) {
      setError('No project selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const issue = await window.tikiDesktop.github.createIssue(
        {
          title: title.trim(),
          body: body.trim() || undefined,
          labels: selectedLabels.length > 0 ? selectedLabels : undefined
        },
        activeProject.path
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreated((issue as any).number)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue')
    } finally {
      setLoading(false)
    }
  }

  const toggleLabel = (labelName: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelName)
        ? prev.filter((l) => l !== labelName)
        : [...prev, labelName]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-secondary border border-border rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">Create New Issue</h2>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500"
              autoFocus
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a description... (supports Markdown)"
              rows={6}
              className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border rounded outline-none focus:border-amber-500 text-slate-200 placeholder-slate-500 resize-none font-mono"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Labels
            </label>
            {loadingLabels ? (
              <div className="text-xs text-slate-500">Loading labels...</div>
            ) : availableLabels.length === 0 ? (
              <div className="text-xs text-slate-500">No labels available</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label.name)
                  return (
                    <button
                      key={label.name}
                      type="button"
                      onClick={() => toggleLabel(label.name)}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        isSelected
                          ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-background-secondary'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `#${label.color}20`,
                        color: `#${label.color}`,
                        borderColor: `#${label.color}`
                      }}
                    >
                      {label.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white rounded transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Creating...
              </>
            ) : (
              'Create Issue'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

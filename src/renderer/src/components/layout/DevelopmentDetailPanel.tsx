/**
 * DevelopmentDetailPanel Component
 *
 * Right panel in Development layout showing:
 * - File outline (symbols, functions, classes)
 * - Git changes (future)
 * - Preview (for markdown, images)
 *
 * Currently a placeholder - full implementation in future issue.
 */

import { useTikiStore } from '../../stores/tiki-store'
import { useEditorStore, selectActiveFile } from '../../stores/editor-store'
import { GitBranch, Eye, List } from 'lucide-react'

type DetailTab = 'outline' | 'git-changes' | 'preview'

export function DevelopmentDetailPanel() {
  const developmentState = useTikiStore((state) => state.developmentState)
  const setDevelopmentState = useTikiStore((state) => state.setDevelopmentState)
  const activeFile = useEditorStore(selectActiveFile)

  const activeTab = developmentState.detailMode

  const setActiveTab = (tab: DetailTab) => {
    setDevelopmentState({ detailMode: tab })
  }

  return (
    <div className="h-full flex flex-col bg-background-secondary">
      {/* Tab bar */}
      <div className="flex-shrink-0 h-9 px-2 flex items-center gap-1 border-b border-border">
        <TabButton
          active={activeTab === 'outline'}
          onClick={() => setActiveTab('outline')}
          icon={<List className="w-3.5 h-3.5" />}
          label="Outline"
        />
        <TabButton
          active={activeTab === 'git-changes'}
          onClick={() => setActiveTab('git-changes')}
          icon={<GitBranch className="w-3.5 h-3.5" />}
          label="Changes"
        />
        <TabButton
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
          icon={<Eye className="w-3.5 h-3.5" />}
          label="Preview"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'outline' && <OutlinePlaceholder fileName={activeFile?.name} />}
        {activeTab === 'git-changes' && <GitChangesPlaceholder />}
        {activeTab === 'preview' && <PreviewPlaceholder fileName={activeFile?.name} />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
        transition-colors duration-75
        ${
          active
            ? 'bg-background text-white'
            : 'text-slate-400 hover:text-white hover:bg-background-tertiary'
        }
      `}
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  )
}

function OutlinePlaceholder({ fileName }: { fileName?: string }) {
  if (!fileName) {
    return <div className="text-sm text-slate-500 text-center mt-8">No file open</div>
  }

  return (
    <div className="text-sm text-slate-500">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Outline</div>
      <p className="text-center mt-8">File outline coming soon</p>
      <p className="text-xs text-center mt-2 text-slate-600">
        Will show functions, classes, and symbols
      </p>
    </div>
  )
}

function GitChangesPlaceholder() {
  return (
    <div className="text-sm text-slate-500">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Git Changes</div>
      <p className="text-center mt-8">Git changes coming soon</p>
      <p className="text-xs text-center mt-2 text-slate-600">
        Will show modified, added, and deleted files
      </p>
    </div>
  )
}

function PreviewPlaceholder({ fileName }: { fileName?: string }) {
  if (!fileName) {
    return <div className="text-sm text-slate-500 text-center mt-8">No file open</div>
  }

  const isPreviewable = /\.(md|mdx|png|jpg|jpeg|gif|svg|webp)$/i.test(fileName)

  if (!isPreviewable) {
    return (
      <div className="text-sm text-slate-500 text-center mt-8">
        Preview not available for this file type
      </div>
    )
  }

  return (
    <div className="text-sm text-slate-500">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Preview</div>
      <p className="text-center mt-8">Preview coming soon</p>
      <p className="text-xs text-center mt-2 text-slate-600">Will render markdown and images</p>
    </div>
  )
}

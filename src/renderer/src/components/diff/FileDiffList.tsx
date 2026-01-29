import { useCallback, useRef, useEffect } from 'react'

export interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
}

interface FileDiffListProps {
  files: FileChange[]
  onFileSelect: (file: FileChange) => void
  selectedPath?: string
}

// Status colors
const statusColors: Record<FileChange['status'], string> = {
  added: 'text-green-400',
  modified: 'text-amber-400',
  deleted: 'text-red-400'
}

// Status icons (M for modified, A for added, D for deleted)
const statusIcons: Record<FileChange['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D'
}

function FileIcon() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

export function FileDiffList({ files, onFileSelect, selectedPath }: FileDiffListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (files.length === 0) return

      const currentIndex = files.findIndex(f => f.path === selectedPath)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0
        onFileSelect(files[nextIndex])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1
        onFileSelect(files[prevIndex])
      } else if (e.key === 'Enter' && currentIndex >= 0) {
        e.preventDefault()
        onFileSelect(files[currentIndex])
      }
    },
    [files, selectedPath, onFileSelect]
  )

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedPath && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-path="${selectedPath}"]`)
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedPath])

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        No files changed
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none"
    >
      {files.map(file => (
        <div
          key={file.path}
          data-testid="file-item"
          data-status={file.status}
          data-path={file.path}
          role="option"
          aria-selected={selectedPath === file.path}
          onClick={() => onFileSelect(file)}
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer
            hover:bg-slate-700/50 transition-colors
            ${selectedPath === file.path ? 'bg-slate-700' : ''}
          `}
        >
          {/* Status indicator */}
          <span className={`w-4 text-xs font-mono ${statusColors[file.status]}`}>
            {statusIcons[file.status]}
          </span>

          {/* File icon */}
          <FileIcon />

          {/* File path */}
          <span className="flex-1 text-sm text-slate-300 font-mono truncate">
            {file.path}
          </span>

          {/* Change stats */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {file.additions > 0 && (
              <span className="text-green-500">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="text-red-500">-{file.deletions}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

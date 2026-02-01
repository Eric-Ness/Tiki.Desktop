/**
 * EditorBreadcrumb Component
 *
 * Shows the file path as clickable breadcrumb segments.
 * Clicking a segment could reveal it in the file explorer (future).
 */

import { ChevronRight } from 'lucide-react'
import { FileIcon } from '../../utils/file-icons'

interface EditorBreadcrumbProps {
  /** Absolute file path */
  filePath: string
  /** Project root path (to show relative path) */
  projectPath?: string
}

export function EditorBreadcrumb({ filePath, projectPath }: EditorBreadcrumbProps) {
  // Calculate relative path
  let displayPath = filePath
  if (projectPath && filePath.startsWith(projectPath)) {
    displayPath = filePath.slice(projectPath.length)
    // Remove leading slash
    if (displayPath.startsWith('/') || displayPath.startsWith('\\')) {
      displayPath = displayPath.slice(1)
    }
  }

  // Split into segments
  const segments = displayPath.split(/[/\\]/).filter(Boolean)
  const fileName = segments.pop() || ''

  return (
    <div className="h-6 px-3 flex items-center gap-1 bg-background border-b border-border/50 text-xs text-slate-400 overflow-x-auto scrollbar-none">
      {/* Directory segments */}
      {segments.map((segment, index) => (
        <span key={index} className="flex items-center gap-1 flex-shrink-0">
          <button className="hover:text-white transition-colors" title={`Open ${segment}`}>
            {segment}
          </button>
          <ChevronRight className="w-3 h-3 text-slate-600" />
        </span>
      ))}

      {/* File name with icon */}
      {fileName && (
        <span className="flex items-center gap-1.5 text-slate-300 flex-shrink-0">
          <FileIcon fileName={fileName} className="w-3.5 h-3.5" />
          <span>{fileName}</span>
        </span>
      )}
    </div>
  )
}

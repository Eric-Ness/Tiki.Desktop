import { useState, useCallback } from 'react'
import type {
  DirectoryHeatDataPreload,
  FileHeatDataPreload
} from '../../../../preload'

export interface TreeViewProps {
  tree: DirectoryHeatDataPreload
  onFileSelect?: (file: FileHeatDataPreload) => void
}

/**
 * Get heat color class based on heat value (0-1)
 * - 0-0.3: green (low)
 * - 0.3-0.6: yellow (medium)
 * - 0.6-0.8: orange (high)
 * - 0.8-1.0: red (critical)
 */
export function getHeatColor(heat: number): string {
  if (heat >= 0.8) return 'bg-red-500'
  if (heat >= 0.6) return 'bg-orange-500'
  if (heat >= 0.3) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Get heat label for accessibility
 */
export function getHeatLabel(heat: number): string {
  if (heat >= 0.8) return 'critical'
  if (heat >= 0.6) return 'high'
  if (heat >= 0.3) return 'medium'
  return 'low'
}

export function TreeView({ tree, onFileSelect }: TreeViewProps) {
  return (
    <div className="text-sm" data-testid="tree-view">
      <TreeNode
        node={tree}
        level={0}
        onFileSelect={onFileSelect}
        isRoot
      />
    </div>
  )
}

interface TreeNodeProps {
  node: DirectoryHeatDataPreload
  level: number
  onFileSelect?: (file: FileHeatDataPreload) => void
  isRoot?: boolean
}

function TreeNode({ node, level, onFileSelect, isRoot = false }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 2) // Auto-expand first 2 levels

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const hasChildren = node.subdirectories.length > 0 || node.files.length > 0

  // Calculate average heat for directory
  const avgHeat = node.fileCount > 0 ? node.totalHeat / node.fileCount : 0

  return (
    <div>
      {/* Directory header - don't show for root or if it's just "." */}
      {!isRoot && node.name !== '.' && (
        <button
          onClick={toggleExpand}
          className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-700/50 rounded transition-colors group"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          aria-expanded={expanded}
          data-testid={`directory-${node.path}`}
        >
          {/* Expand/collapse icon */}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
              expanded ? 'rotate-90' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          {/* Folder icon */}
          <svg
            className="w-4 h-4 text-amber-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          {/* Directory name */}
          <span className="text-slate-300 truncate flex-1 text-left">
            {node.name}
          </span>

          {/* Heat indicator */}
          {hasChildren && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${getHeatColor(avgHeat)}`}
              title={`Heat: ${getHeatLabel(avgHeat)} (${Math.round(avgHeat * 100)}%)`}
              aria-label={`Heat level: ${getHeatLabel(avgHeat)}`}
            />
          )}

          {/* File count */}
          <span className="text-xs text-slate-500 flex-shrink-0">
            {node.fileCount}
          </span>
        </button>
      )}

      {/* Children */}
      {(expanded || isRoot) && hasChildren && (
        <div>
          {/* Subdirectories first */}
          {node.subdirectories.map((subdir) => (
            <TreeNode
              key={subdir.path}
              node={subdir}
              level={isRoot ? level : level + 1}
              onFileSelect={onFileSelect}
            />
          ))}

          {/* Files */}
          {node.files.map((file) => (
            <FileNode
              key={file.path}
              file={file}
              level={isRoot ? level : level + 1}
              onSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileNodeProps {
  file: FileHeatDataPreload
  level: number
  onSelect?: (file: FileHeatDataPreload) => void
}

function FileNode({ file, level, onSelect }: FileNodeProps) {
  const handleClick = useCallback(() => {
    onSelect?.(file)
  }, [file, onSelect])

  // Get file extension for icon color
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const iconColor = getFileIconColor(ext)

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-700/50 rounded transition-colors group"
      style={{ paddingLeft: `${level * 16 + 28}px` }}
      data-testid={`file-${file.path}`}
    >
      {/* File icon */}
      <svg
        className={`w-4 h-4 flex-shrink-0 ${iconColor}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>

      {/* File name */}
      <span className="text-slate-300 truncate flex-1 text-left group-hover:text-slate-100">
        {file.name}
      </span>

      {/* Heat indicator */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${getHeatColor(file.heat)}`}
        title={`Heat: ${getHeatLabel(file.heat)} (${Math.round(file.heat * 100)}%)`}
        aria-label={`Heat level: ${getHeatLabel(file.heat)}`}
      />

      {/* Modifications count */}
      <span className="text-xs text-slate-500 flex-shrink-0 w-8 text-right">
        {file.metrics.modifications}
      </span>
    </button>
  )
}

/**
 * Get icon color based on file extension
 */
function getFileIconColor(ext: string): string {
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-400'
    case 'js':
    case 'jsx':
      return 'text-yellow-400'
    case 'css':
    case 'scss':
    case 'less':
      return 'text-pink-400'
    case 'html':
      return 'text-orange-400'
    case 'json':
      return 'text-green-400'
    case 'md':
      return 'text-slate-400'
    case 'py':
      return 'text-green-500'
    case 'rs':
      return 'text-orange-500'
    case 'go':
      return 'text-cyan-400'
    default:
      return 'text-slate-400'
  }
}

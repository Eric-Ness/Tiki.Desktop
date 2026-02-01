/**
 * FileTreeItem Component
 *
 * Renders a single item in the file tree (file or directory).
 * Handles expansion, selection, and double-click to open.
 */

import { useState, useCallback, memo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useEditorStore, type FileTreeNode } from '../../stores/editor-store'
import { FileIcon, FolderIcon } from '../../utils/file-icons'

interface FileTreeItemProps {
  /** The file/directory node to render */
  node: FileTreeNode

  /** Nesting depth (for indentation) */
  depth: number

  /** Optional search query for highlighting */
  searchQuery?: string
}

export const FileTreeItem = memo(function FileTreeItem({
  node,
  depth,
  searchQuery = ''
}: FileTreeItemProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Store selectors
  const expandedPaths = useEditorStore((state) => state.expandedPaths)
  const selectedPath = useEditorStore((state) => state.selectedPath)
  const toggleExpanded = useEditorStore((state) => state.toggleExpanded)
  const setSelectedPath = useEditorStore((state) => state.setSelectedPath)
  const openFile = useEditorStore((state) => state.openFile)
  const updateDirectoryChildren = useEditorStore((state) => state.updateDirectoryChildren)

  const isDirectory = node.type === 'directory'
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  // Filter by search query
  if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    // For directories, we might still want to show them if children match
    // For now, hide non-matching items
    if (!isDirectory) return null
  }

  /**
   * Load children of a directory.
   */
  const loadChildren = useCallback(async () => {
    if (!isDirectory || node.isLoaded) return

    setIsLoading(true)
    try {
      const result = await window.tikiDesktop.files.listDirectory(node.path)
      if (result.success && result.entries) {
        const children: FileTreeNode[] = result.entries.map((entry) => ({
          name: entry.name,
          path: entry.path,
          type: entry.type,
          isLoaded: entry.type === 'file'
        }))
        updateDirectoryChildren(node.path, children)
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isDirectory, node.path, node.isLoaded, updateDirectoryChildren])

  /**
   * Handle click on the item.
   * Single click: select
   * For directories: also toggle expansion
   */
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedPath(node.path)

      if (isDirectory) {
        // Load children if not loaded
        if (!node.isLoaded && !isExpanded) {
          await loadChildren()
        }
        toggleExpanded(node.path)
      }
    },
    [isDirectory, node.path, node.isLoaded, isExpanded, setSelectedPath, toggleExpanded, loadChildren]
  )

  /**
   * Handle double-click.
   * For files: open in editor
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isDirectory) {
        openFile(node.path)
      }
    },
    [isDirectory, node.path, openFile]
  )

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isDirectory) {
          toggleExpanded(node.path)
        } else {
          openFile(node.path)
        }
      }
    },
    [isDirectory, node.path, toggleExpanded, openFile]
  )

  // Calculate padding based on depth
  const paddingLeft = 8 + depth * 16

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm
          select-none outline-none
          transition-colors duration-75
          ${
            isSelected
              ? 'bg-amber-500/20 text-amber-200'
              : 'text-slate-300 hover:bg-background-tertiary'
          }
          focus-visible:ring-1 focus-visible:ring-amber-500/50 focus-visible:ring-inset
        `}
        style={{ paddingLeft }}
      >
        {/* Expand/Collapse Arrow (directories only) */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isDirectory ? (
            isLoading ? (
              <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )
          ) : null}
        </span>

        {/* File/Folder Icon */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isDirectory ? <FolderIcon isOpen={isExpanded} /> : <FileIcon fileName={node.name} />}
        </span>

        {/* Name */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Children (if directory is expanded) */}
      {isDirectory && isExpanded && node.children && node.children.length > 0 && (
        <div role="group">
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}

      {/* Empty directory message */}
      {isDirectory &&
        isExpanded &&
        node.isLoaded &&
        (!node.children || node.children.length === 0) && (
          <div
            className="text-xs text-slate-500 italic py-1"
            style={{ paddingLeft: paddingLeft + 20 }}
          >
            Empty folder
          </div>
        )}
    </>
  )
})

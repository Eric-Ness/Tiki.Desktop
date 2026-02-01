/**
 * FileExplorer Component
 *
 * Main container for the file tree sidebar in Development mode.
 * Handles loading, searching, and file watching.
 */

import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, FilePlus, FolderPlus, ChevronDown, X } from 'lucide-react'
import { useEditorStore, type FileTreeNode } from '../../stores/editor-store'
import { useTikiStore } from '../../stores/tiki-store'
import { FileTreeItem } from './FileTreeItem'

export function FileExplorer() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get project path
  const activeProject = useTikiStore((state) => state.activeProject)
  const projectPath = activeProject?.path

  // Editor store
  const fileTree = useEditorStore((state) => state.fileTree)
  const setFileTree = useEditorStore((state) => state.setFileTree)

  /**
   * Load the root directory.
   */
  const loadRootDirectory = useCallback(async () => {
    if (!projectPath) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.files.listDirectory(projectPath)

      if (result.success && result.entries) {
        const tree: FileTreeNode[] = result.entries.map((entry) => ({
          name: entry.name,
          path: entry.path,
          type: entry.type,
          isLoaded: entry.type === 'file'
        }))
        setFileTree(tree)
      } else {
        setError(result.error || 'Failed to load directory')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [projectPath, setFileTree])

  // Load root directory on mount and when project changes
  useEffect(() => {
    loadRootDirectory()
  }, [loadRootDirectory])

  // Set up file watcher
  useEffect(() => {
    if (!projectPath) return

    let unsubscribe: (() => void) | undefined

    const setupWatcher = async () => {
      // Subscribe to changes
      unsubscribe = window.tikiDesktop.files.onChanged((_event) => {
        // For simplicity, just refresh the whole tree
        // A more sophisticated approach would update only the affected node
        loadRootDirectory()
      })

      // Start watching
      await window.tikiDesktop.files.watchStart(projectPath)
    }

    setupWatcher()

    return () => {
      unsubscribe?.()
      window.tikiDesktop.files.watchStop(projectPath)
    }
  }, [projectPath, loadRootDirectory])

  /**
   * Handle creating a new file.
   */
  const handleNewFile = useCallback(() => {
    // TODO: Implement inline file creation
    // For now, this is a placeholder
    console.log('New file requested')
  }, [])

  /**
   * Handle creating a new folder.
   */
  const handleNewFolder = useCallback(() => {
    // TODO: Implement inline folder creation
    console.log('New folder requested')
  }, [])

  /**
   * Toggle search visibility.
   */
  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev)
    if (showSearch) {
      setSearchQuery('')
    }
  }, [showSearch])

  return (
    <div className="h-full flex flex-col bg-background-secondary">
      {/* Header */}
      <div className="flex-shrink-0 h-9 px-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1.5">
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Explorer
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleSearch}
            className={`p-1 rounded transition-colors ${
              showSearch
                ? 'bg-background-tertiary text-white'
                : 'text-slate-400 hover:text-white hover:bg-background-tertiary'
            }`}
            title="Search files (Ctrl+Shift+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNewFile}
            className="p-1 text-slate-400 hover:text-white hover:bg-background-tertiary rounded transition-colors"
            title="New file"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1 text-slate-400 hover:text-white hover:bg-background-tertiary rounded transition-colors"
            title="New folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadRootDirectory}
            disabled={isLoading}
            className={`p-1 text-slate-400 hover:text-white hover:bg-background-tertiary rounded transition-colors ${
              isLoading ? 'animate-spin' : ''
            }`}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input (collapsible) */}
      {showSearch && (
        <div className="flex-shrink-0 px-2 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-7 pr-7 py-1.5 text-sm bg-background border border-border rounded
                         focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20
                         placeholder:text-slate-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Project Name */}
      {projectPath && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-border/50">
          <div className="text-xs font-medium text-slate-300 truncate">
            {projectPath.split(/[/\\]/).pop()}
          </div>
          <div className="text-[10px] text-slate-500 truncate">{projectPath}</div>
        </div>
      )}

      {/* File Tree */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1"
        role="tree"
        aria-label="File explorer"
      >
        {/* Loading state */}
        {isLoading && fileTree.length === 0 && (
          <div className="px-3 py-4 text-sm text-slate-500 text-center">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading files...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-3 py-4 text-sm text-center">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={loadRootDirectory}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && fileTree.length === 0 && (
          <div className="px-3 py-4 text-sm text-slate-500 text-center">
            {projectPath ? 'No files found' : 'No project open'}
          </div>
        )}

        {/* File tree */}
        {fileTree.length > 0 && (
          <div className="space-y-px">
            {fileTree.map((node) => (
              <FileTreeItem key={node.path} node={node} depth={0} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

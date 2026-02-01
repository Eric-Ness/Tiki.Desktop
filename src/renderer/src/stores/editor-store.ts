/**
 * Editor State Management
 *
 * Manages state for the Development Layout code editor:
 * - Open files and tabs
 * - File content and dirty state
 * - File tree expansion state
 * - Cursor and scroll positions
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a file open in the editor.
 */
export interface OpenFile {
  /** Unique identifier (derived from path) */
  id: string

  /** Absolute file path */
  path: string

  /** File name (for display) */
  name: string

  /** Detected language for syntax highlighting */
  language: string

  /** Current content in editor (may differ from disk) */
  content: string

  /** Content as last read from disk */
  diskContent: string

  /** Whether content differs from disk */
  isDirty: boolean

  /** Cursor position for restoration */
  cursorPosition: {
    lineNumber: number
    column: number
  }

  /** Scroll position for restoration */
  scrollPosition: {
    scrollTop: number
    scrollLeft: number
  }

  /** Timestamp when file was last read from disk */
  lastReadAt: number
}

/**
 * Represents a node in the file tree.
 */
export interface FileTreeNode {
  /** File or directory name */
  name: string

  /** Absolute path */
  path: string

  /** Node type */
  type: 'file' | 'directory'

  /** Child nodes (only for directories) */
  children?: FileTreeNode[]

  /** Whether children have been loaded (for lazy loading) */
  isLoaded?: boolean
}

/**
 * Editor store state interface.
 */
interface EditorState {
  // =========================================================================
  // OPEN FILES STATE
  // =========================================================================

  /** Files currently open in tabs */
  openFiles: OpenFile[]

  /** ID of the currently active file (shown in editor) */
  activeFileId: string | null

  /** Order of recently accessed files (for tab switching) */
  recentFileIds: string[]

  // =========================================================================
  // FILE TREE STATE
  // =========================================================================

  /** Root nodes of the file tree */
  fileTree: FileTreeNode[]

  /** Set of expanded directory paths */
  expandedPaths: Set<string>

  /** Currently selected path in file tree (may be file or directory) */
  selectedPath: string | null

  // =========================================================================
  // SPLIT VIEW STATE (Future)
  // =========================================================================

  /** Split orientation: none, horizontal, or vertical */
  splitOrientation: 'none' | 'horizontal' | 'vertical'

  /** ID of file shown in secondary pane (when split) */
  secondaryFileId: string | null

  // =========================================================================
  // ACTIONS - FILE OPERATIONS
  // =========================================================================

  /**
   * Open a file in the editor.
   * If already open, switches to that tab.
   * Otherwise, loads from disk and creates new tab.
   */
  openFile: (path: string) => Promise<void>

  /**
   * Close a file tab.
   * Prompts for save if dirty (handled by component).
   */
  closeFile: (id: string) => void

  /**
   * Close all open files.
   */
  closeAllFiles: () => void

  /**
   * Close all files except the specified one.
   */
  closeOtherFiles: (keepId: string) => void

  /**
   * Close files to the right of the specified one.
   */
  closeFilesToRight: (id: string) => void

  /**
   * Set the active file (switch tabs).
   */
  setActiveFile: (id: string | null) => void

  /**
   * Update the content of an open file.
   * Automatically updates isDirty state.
   */
  updateFileContent: (id: string, content: string) => void

  /**
   * Update cursor position for a file.
   */
  updateCursorPosition: (id: string, lineNumber: number, column: number) => void

  /**
   * Update scroll position for a file.
   */
  updateScrollPosition: (id: string, scrollTop: number, scrollLeft: number) => void

  /**
   * Save a file to disk.
   * Updates diskContent and clears dirty flag.
   */
  saveFile: (id: string) => Promise<boolean>

  /**
   * Save all dirty files.
   */
  saveAllFiles: () => Promise<void>

  /**
   * Revert a file to its disk content.
   * Discards unsaved changes.
   */
  revertFile: (id: string) => void

  /**
   * Reload a file from disk.
   * Used when external changes detected.
   */
  reloadFile: (id: string) => Promise<void>

  // =========================================================================
  // ACTIONS - FILE TREE
  // =========================================================================

  /**
   * Set the file tree root nodes.
   */
  setFileTree: (tree: FileTreeNode[]) => void

  /**
   * Update children of a directory node.
   * Used for lazy loading.
   */
  updateDirectoryChildren: (dirPath: string, children: FileTreeNode[]) => void

  /**
   * Toggle expanded state of a directory.
   */
  toggleExpanded: (path: string) => void

  /**
   * Expand a directory.
   */
  expandPath: (path: string) => void

  /**
   * Collapse a directory.
   */
  collapsePath: (path: string) => void

  /**
   * Expand all directories along a path.
   * Useful for "reveal in explorer" feature.
   */
  expandToPath: (path: string) => void

  /**
   * Set the selected path in file tree.
   */
  setSelectedPath: (path: string | null) => void

  // =========================================================================
  // ACTIONS - SPLIT VIEW
  // =========================================================================

  /**
   * Set split view orientation.
   */
  setSplitOrientation: (orientation: 'none' | 'horizontal' | 'vertical') => void

  /**
   * Set the file shown in secondary pane.
   */
  setSecondaryFile: (id: string | null) => void

  // =========================================================================
  // ACTIONS - UTILITIES
  // =========================================================================

  /**
   * Check if any files have unsaved changes.
   */
  hasUnsavedChanges: () => boolean

  /**
   * Get list of dirty file IDs.
   */
  getDirtyFileIds: () => string[]

  /**
   * Get file by ID.
   */
  getFileById: (id: string) => OpenFile | undefined

  /**
   * Get file by path.
   */
  getFileByPath: (path: string) => OpenFile | undefined

  /**
   * Reset editor state (e.g., when switching projects).
   */
  reset: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a stable ID from file path.
 */
function pathToId(filePath: string): string {
  // Simple hash - replace special chars, keep it readable
  return filePath
    .replace(/[\\/:]/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .slice(-100) // Limit length
}

/**
 * Extract file name from path.
 */
function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

/**
 * Initial state values.
 */
const initialState = {
  openFiles: [] as OpenFile[],
  activeFileId: null as string | null,
  recentFileIds: [] as string[],
  fileTree: [] as FileTreeNode[],
  expandedPaths: new Set<string>(),
  selectedPath: null as string | null,
  splitOrientation: 'none' as const,
  secondaryFileId: null as string | null
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useEditorStore = create<EditorState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      ...initialState,

      // =====================================================================
      // FILE OPERATIONS
      // =====================================================================

      openFile: async (path: string) => {
        const state = get()

        // Check if already open
        const existing = state.openFiles.find((f) => f.path === path)
        if (existing) {
          set({ activeFileId: existing.id })
          // Move to front of recent files
          set((draft) => {
            draft.recentFileIds = [
              existing.id,
              ...draft.recentFileIds.filter((id) => id !== existing.id)
            ]
          })
          return
        }

        try {
          // Read file from disk via IPC
          const result = await window.tikiDesktop.code.readFile(
            '', // cwd not needed for absolute paths
            path
          )

          if (!result || !result.content) {
            console.error('Failed to open file: No content returned')
            return
          }

          const id = pathToId(path)
          const newFile: OpenFile = {
            id,
            path,
            name: getFileName(path),
            language: result.language || 'plaintext',
            content: result.content,
            diskContent: result.content,
            isDirty: false,
            cursorPosition: { lineNumber: 1, column: 1 },
            scrollPosition: { scrollTop: 0, scrollLeft: 0 },
            lastReadAt: Date.now()
          }

          set((draft) => {
            draft.openFiles.push(newFile)
            draft.activeFileId = id
            draft.recentFileIds.unshift(id)
          })
        } catch (error) {
          console.error('Failed to open file:', error)
        }
      },

      closeFile: (id: string) => {
        set((draft) => {
          const index = draft.openFiles.findIndex((f) => f.id === id)
          if (index === -1) return

          draft.openFiles.splice(index, 1)
          draft.recentFileIds = draft.recentFileIds.filter((fid) => fid !== id)

          // Update active file if we closed the active one
          if (draft.activeFileId === id) {
            // Try to activate the next file, or previous, or null
            const nextFile = draft.openFiles[index] || draft.openFiles[index - 1]
            draft.activeFileId = nextFile?.id || null
          }

          // Clear secondary if it was this file
          if (draft.secondaryFileId === id) {
            draft.secondaryFileId = null
          }
        })
      },

      closeAllFiles: () => {
        set({
          openFiles: [],
          activeFileId: null,
          recentFileIds: [],
          secondaryFileId: null
        })
      },

      closeOtherFiles: (keepId: string) => {
        set((draft) => {
          const keepFile = draft.openFiles.find((f) => f.id === keepId)
          if (keepFile) {
            draft.openFiles = [keepFile]
            draft.activeFileId = keepId
            draft.recentFileIds = [keepId]
            if (draft.secondaryFileId !== keepId) {
              draft.secondaryFileId = null
            }
          }
        })
      },

      closeFilesToRight: (id: string) => {
        set((draft) => {
          const index = draft.openFiles.findIndex((f) => f.id === id)
          if (index === -1) return

          const closedIds = draft.openFiles.slice(index + 1).map((f) => f.id)
          draft.openFiles = draft.openFiles.slice(0, index + 1)
          draft.recentFileIds = draft.recentFileIds.filter(
            (fid) => !closedIds.includes(fid)
          )

          if (closedIds.includes(draft.activeFileId || '')) {
            draft.activeFileId = id
          }
          if (closedIds.includes(draft.secondaryFileId || '')) {
            draft.secondaryFileId = null
          }
        })
      },

      setActiveFile: (id: string | null) => {
        set((draft) => {
          draft.activeFileId = id
          if (id) {
            draft.recentFileIds = [
              id,
              ...draft.recentFileIds.filter((fid) => fid !== id)
            ]
          }
        })
      },

      updateFileContent: (id: string, content: string) => {
        set((draft) => {
          const file = draft.openFiles.find((f) => f.id === id)
          if (file) {
            file.content = content
            file.isDirty = content !== file.diskContent
          }
        })
      },

      updateCursorPosition: (id: string, lineNumber: number, column: number) => {
        set((draft) => {
          const file = draft.openFiles.find((f) => f.id === id)
          if (file) {
            file.cursorPosition = { lineNumber, column }
          }
        })
      },

      updateScrollPosition: (id: string, scrollTop: number, scrollLeft: number) => {
        set((draft) => {
          const file = draft.openFiles.find((f) => f.id === id)
          if (file) {
            file.scrollPosition = { scrollTop, scrollLeft }
          }
        })
      },

      saveFile: async (id: string) => {
        const file = get().openFiles.find((f) => f.id === id)
        if (!file) return false

        try {
          const result = await window.tikiDesktop.files.writeFile(
            file.path,
            file.content
          )

          if (result.success) {
            set((draft) => {
              const f = draft.openFiles.find((f) => f.id === id)
              if (f) {
                f.diskContent = f.content
                f.isDirty = false
                f.lastReadAt = Date.now()
              }
            })
            return true
          } else {
            console.error('Failed to save file:', result.error)
            return false
          }
        } catch (error) {
          console.error('Failed to save file:', error)
          return false
        }
      },

      saveAllFiles: async () => {
        const dirtyFiles = get().openFiles.filter((f) => f.isDirty)
        await Promise.all(dirtyFiles.map((f) => get().saveFile(f.id)))
      },

      revertFile: (id: string) => {
        set((draft) => {
          const file = draft.openFiles.find((f) => f.id === id)
          if (file) {
            file.content = file.diskContent
            file.isDirty = false
          }
        })
      },

      reloadFile: async (id: string) => {
        const file = get().openFiles.find((f) => f.id === id)
        if (!file) return

        try {
          const result = await window.tikiDesktop.code.readFile('', file.path)

          if (result && result.content !== undefined) {
            set((draft) => {
              const f = draft.openFiles.find((f) => f.id === id)
              if (f) {
                f.content = result.content
                f.diskContent = result.content
                f.isDirty = false
                f.lastReadAt = Date.now()
              }
            })
          }
        } catch (error) {
          console.error('Failed to reload file:', error)
        }
      },

      // =====================================================================
      // FILE TREE
      // =====================================================================

      setFileTree: (tree: FileTreeNode[]) => {
        set({ fileTree: tree })
      },

      updateDirectoryChildren: (dirPath: string, children: FileTreeNode[]) => {
        set((draft) => {
          const updateNode = (nodes: FileTreeNode[]): boolean => {
            for (const node of nodes) {
              if (node.path === dirPath && node.type === 'directory') {
                node.children = children
                node.isLoaded = true
                return true
              }
              if (node.children && updateNode(node.children)) {
                return true
              }
            }
            return false
          }
          updateNode(draft.fileTree)
        })
      },

      toggleExpanded: (path: string) => {
        set((draft) => {
          if (draft.expandedPaths.has(path)) {
            draft.expandedPaths.delete(path)
          } else {
            draft.expandedPaths.add(path)
          }
        })
      },

      expandPath: (path: string) => {
        set((draft) => {
          draft.expandedPaths.add(path)
        })
      },

      collapsePath: (path: string) => {
        set((draft) => {
          draft.expandedPaths.delete(path)
        })
      },

      expandToPath: (targetPath: string) => {
        set((draft) => {
          // Expand all parent directories
          const parts = targetPath.split(/[/\\]/)
          let currentPath = ''
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath += (i > 0 ? '/' : '') + parts[i]
            draft.expandedPaths.add(currentPath)
          }
        })
      },

      setSelectedPath: (path: string | null) => {
        set({ selectedPath: path })
      },

      // =====================================================================
      // SPLIT VIEW
      // =====================================================================

      setSplitOrientation: (orientation) => {
        set({ splitOrientation: orientation })
      },

      setSecondaryFile: (id: string | null) => {
        set({ secondaryFileId: id })
      },

      // =====================================================================
      // UTILITIES
      // =====================================================================

      hasUnsavedChanges: () => {
        return get().openFiles.some((f) => f.isDirty)
      },

      getDirtyFileIds: () => {
        return get().openFiles.filter((f) => f.isDirty).map((f) => f.id)
      },

      getFileById: (id: string) => {
        return get().openFiles.find((f) => f.id === id)
      },

      getFileByPath: (path: string) => {
        return get().openFiles.find((f) => f.path === path)
      },

      reset: () => {
        set({
          ...initialState,
          expandedPaths: new Set<string>()
        })
      }
    })),
    {
      name: 'tiki-editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-volatile state
        // Do NOT persist file content (too large, may be stale)
        expandedPaths: Array.from(state.expandedPaths),
        splitOrientation: state.splitOrientation,
        // Persist recently opened file paths for "reopen" feature
        recentFilePaths: state.openFiles.slice(0, 10).map((f) => f.path)
      }),
      onRehydrateStorage: () => {
        return (state: EditorState | undefined) => {
          // Convert expandedPaths array back to Set
          if (state && Array.isArray((state as unknown as { expandedPaths: string[] }).expandedPaths)) {
            state.expandedPaths = new Set((state as unknown as { expandedPaths: string[] }).expandedPaths)
          }
        }
      }
    }
  )
)

// ============================================================================
// SELECTORS (for performance optimization)
// ============================================================================

/**
 * Select the currently active file.
 */
export const selectActiveFile = (state: EditorState): OpenFile | undefined => {
  return state.openFiles.find((f) => f.id === state.activeFileId)
}

/**
 * Select whether there are any unsaved changes.
 */
export const selectHasUnsavedChanges = (state: EditorState): boolean => {
  return state.openFiles.some((f) => f.isDirty)
}

/**
 * Select the count of open files.
 */
export const selectOpenFileCount = (state: EditorState): number => {
  return state.openFiles.length
}

/**
 * Select dirty file count.
 */
export const selectDirtyFileCount = (state: EditorState): number => {
  return state.openFiles.filter((f) => f.isDirty).length
}

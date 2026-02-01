/**
 * EditorTabs Component
 *
 * Renders tabs for open files with:
 * - File icon and name
 * - Dirty indicator (unsaved changes)
 * - Close button
 * - Middle-click to close
 */

import { useCallback } from 'react'
import { X, Circle } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { FileIcon } from '../../utils/file-icons'

export function EditorTabs() {
  const openFiles = useEditorStore((state) => state.openFiles)
  const activeFileId = useEditorStore((state) => state.activeFileId)
  const setActiveFile = useEditorStore((state) => state.setActiveFile)
  const closeFile = useEditorStore((state) => state.closeFile)

  /**
   * Handle tab click - switch to file.
   */
  const handleTabClick = useCallback(
    (fileId: string) => {
      setActiveFile(fileId)
    },
    [setActiveFile]
  )

  /**
   * Handle close button click.
   */
  const handleClose = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation()

      const file = openFiles.find((f) => f.id === fileId)
      if (file?.isDirty) {
        // TODO: Show save confirmation dialog
        // For now, just close (will lose changes)
        const confirmed = window.confirm(
          `${file.name} has unsaved changes. Close without saving?`
        )
        if (!confirmed) return
      }

      closeFile(fileId)
    },
    [openFiles, closeFile]
  )

  /**
   * Handle middle-click to close.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      if (e.button === 1) {
        // Middle click
        e.preventDefault()
        handleClose(e, fileId)
      }
    },
    [handleClose]
  )

  // No tabs to show
  if (openFiles.length === 0) {
    return null
  }

  return (
    <div className="h-9 bg-background-secondary border-b border-border flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
      {openFiles.map((file) => {
        const isActive = file.id === activeFileId

        return (
          <div
            key={file.id}
            onClick={() => handleTabClick(file.id)}
            onMouseDown={(e) => handleMouseDown(e, file.id)}
            className={`
              group relative flex items-center gap-2 h-full px-3
              border-r border-border cursor-pointer select-none
              transition-colors duration-75
              ${
                isActive
                  ? 'bg-background text-white'
                  : 'bg-background-secondary text-slate-400 hover:bg-background-tertiary hover:text-slate-200'
              }
            `}
          >
            {/* Active indicator bar */}
            {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />}

            {/* File icon */}
            <span className="flex-shrink-0">
              <FileIcon fileName={file.name} className="w-4 h-4" />
            </span>

            {/* File name */}
            <span className="text-sm truncate max-w-[140px]">{file.name}</span>

            {/* Dirty indicator OR close button */}
            <button
              onClick={(e) => handleClose(e, file.id)}
              className={`
                w-5 h-5 flex items-center justify-center rounded-sm flex-shrink-0
                transition-opacity duration-75
                ${file.isDirty ? '' : 'opacity-0 group-hover:opacity-100'}
                hover:bg-slate-600
              `}
              title={file.isDirty ? 'Unsaved changes' : 'Close'}
            >
              {file.isDirty ? (
                <Circle className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

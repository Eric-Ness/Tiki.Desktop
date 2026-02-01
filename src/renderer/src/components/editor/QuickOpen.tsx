/**
 * QuickOpen Component
 *
 * Ctrl+P dialog for quickly finding and opening files.
 * Uses simple string matching on file names.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useEditorStore } from '../../stores/editor-store'
import { useTikiStore } from '../../stores/tiki-store'
import { FileIcon } from '../../utils/file-icons'

interface QuickOpenProps {
  isOpen: boolean
  onClose: () => void
}

interface FileMatch {
  name: string
  path: string
  relativePath: string
  score: number
}

export function QuickOpen({ isOpen, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<FileMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeProject = useTikiStore((state) => state.activeProject)
  const openFile = useEditorStore((state) => state.openFile)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Load/search files when query changes
  useEffect(() => {
    if (!isOpen || !activeProject?.path) return

    const searchFiles = async () => {
      setIsLoading(true)
      try {
        const result = await window.tikiDesktop.files.listDirectory(activeProject.path)

        if (result.success && result.entries) {
          const allFiles: FileMatch[] = []

          // Recursively collect files (simplified - max depth 3)
          const collectFiles = async (
            entries: typeof result.entries,
            depth = 0
          ) => {
            for (const entry of entries) {
              if (entry.type === 'file') {
                const relativePath = entry.path
                  .replace(activeProject.path, '')
                  .replace(/^[/\\]/, '')
                allFiles.push({
                  name: entry.name,
                  path: entry.path,
                  relativePath,
                  score: 0
                })
              } else if (entry.type === 'directory' && depth < 3) {
                const subResult = await window.tikiDesktop.files.listDirectory(entry.path)
                if (subResult.success && subResult.entries) {
                  await collectFiles(subResult.entries, depth + 1)
                }
              }
            }
          }

          await collectFiles(result.entries)

          // Filter and score by query
          let filteredFiles = allFiles
          if (query) {
            const lowerQuery = query.toLowerCase()
            filteredFiles = allFiles
              .filter(
                (f) =>
                  f.name.toLowerCase().includes(lowerQuery) ||
                  f.relativePath.toLowerCase().includes(lowerQuery)
              )
              .map((f) => ({
                ...f,
                score: f.name.toLowerCase().startsWith(lowerQuery)
                  ? 2
                  : f.name.toLowerCase().includes(lowerQuery)
                    ? 1
                    : 0
              }))
              .sort((a, b) => b.score - a.score)
          }

          // Limit results
          setFiles(filteredFiles.slice(0, 20))
        }
      } catch (error) {
        console.error('Failed to search files:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchFiles, 150)
    return () => clearTimeout(debounce)
  }, [isOpen, query, activeProject?.path])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, files.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (files[selectedIndex]) {
            openFile(files[selectedIndex].path)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [files, selectedIndex, openFile, onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Dialog */}
      <div
        className="relative w-[600px] max-w-[90vw] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && files.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Searching...</div>
          )}

          {!isLoading && files.length === 0 && query && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No files found matching "{query}"
            </div>
          )}

          {!isLoading && files.length === 0 && !query && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Type to search for files
            </div>
          )}

          {files.map((file, index) => (
            <button
              key={file.path}
              onClick={() => {
                openFile(file.path)
                onClose()
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-left
                ${
                  index === selectedIndex
                    ? 'bg-amber-500/20 text-white'
                    : 'text-slate-300 hover:bg-background-tertiary'
                }
              `}
            >
              <FileIcon fileName={file.name} className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{file.name}</div>
                <div className="text-xs text-slate-500 truncate">{file.relativePath}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border text-xs text-slate-500 flex items-center gap-4">
          <span>
            <kbd className="px-1 py-0.5 bg-background rounded border border-border">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-background rounded border border-border">Enter</kbd> Open
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-background rounded border border-border">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}

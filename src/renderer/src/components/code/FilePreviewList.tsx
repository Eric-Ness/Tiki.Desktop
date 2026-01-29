import { useState, useCallback, useEffect } from 'react'
import { SyntaxHighlighter } from './SyntaxHighlighter'
import { DiffView } from '../diff/DiffView'

export interface FilePreviewListProps {
  files: string[]
  cwd: string
  // For post-execution diff view
  fromRef?: string
  toRef?: string
  // Behavior
  autoExpandFirst?: boolean
}

export function FilePreviewList({
  files,
  cwd,
  fromRef,
  toRef,
  autoExpandFirst = true
}: FilePreviewListProps) {
  // Track expanded state for each file by index
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(() => {
    // Initialize with first file expanded if autoExpandFirst is true and there are files
    if (autoExpandFirst && files.length > 0) {
      return new Set([0])
    }
    return new Set()
  })

  const handleExpandAll = useCallback(() => {
    setExpandedFiles(new Set(files.map((_, index) => index)))
  }, [files])

  const handleCollapseAll = useCallback(() => {
    setExpandedFiles(new Set())
  }, [])

  const handleToggle = useCallback((index: number) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Empty state
  if (files.length === 0) {
    return (
      <div data-testid="file-preview-list" className="py-8">
        <div
          data-testid="file-preview-list-empty"
          className="text-center text-slate-400 text-sm"
        >
          No files
        </div>
      </div>
    )
  }

  const fileCount = files.length
  const fileText = fileCount === 1 ? 'file' : 'files'

  return (
    <div data-testid="file-preview-list">
      {/* Header */}
      <div
        data-testid="file-preview-list-header"
        className="flex justify-between items-center mb-3"
      >
        <span data-testid="file-count" className="text-sm text-slate-400">
          {fileCount} {fileText}
        </span>
        <div className="flex gap-2">
          <button
            data-testid="expand-all-btn"
            onClick={handleExpandAll}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Expand All
          </button>
          <button
            data-testid="collapse-all-btn"
            onClick={handleCollapseAll}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* File List */}
      <div data-testid="file-preview-list-items" className="space-y-2">
        {files.map((filePath, index) => (
          <FilePreviewItem
            key={filePath}
            filePath={filePath}
            cwd={cwd}
            fromRef={fromRef}
            toRef={toRef}
            expanded={expandedFiles.has(index)}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>
    </div>
  )
}

interface FilePreviewItemProps {
  filePath: string
  cwd: string
  fromRef?: string
  toRef?: string
  expanded: boolean
  onToggle: () => void
}

function FilePreviewItem({
  filePath,
  cwd,
  fromRef,
  toRef,
  expanded,
  onToggle
}: FilePreviewItemProps) {
  // We need to control the expanded state from the parent
  // But CodePreview manages its own expanded state internally via defaultExpanded
  // To make this work, we use a key-based approach or control it externally

  return (
    <ControlledCodePreview
      filePath={filePath}
      cwd={cwd}
      fromRef={fromRef}
      toRef={toRef}
      expanded={expanded}
      onToggle={onToggle}
    />
  )
}

interface ControlledCodePreviewProps {
  filePath: string
  cwd: string
  fromRef?: string
  toRef?: string
  expanded: boolean
  onToggle: () => void
}

// A wrapper that makes CodePreview controlled
function ControlledCodePreview({
  filePath,
  cwd,
  fromRef,
  toRef,
  expanded,
  onToggle
}: ControlledCodePreviewProps) {
  // We can't easily make CodePreview controlled since it manages its own state
  // Instead, we'll render a modified version that respects the expanded prop

  // Using key to force re-render when expanded state should change from parent
  // This is not ideal but works for the expand all / collapse all functionality
  return (
    <CodePreviewControlled
      filePath={filePath}
      cwd={cwd}
      fromRef={fromRef}
      toRef={toRef}
      expanded={expanded}
      onToggle={onToggle}
    />
  )
}

// A controlled version of CodePreview that doesn't manage its own expanded state
type ViewMode = 'code' | 'diff'

interface FileContent {
  content: string
  language: string
  lineCount: number
  isTruncated: boolean
  originalSize: number
}

interface CodePreviewControlledProps {
  filePath: string
  cwd: string
  fromRef?: string
  toRef?: string
  expanded: boolean
  onToggle: () => void
}

function CodePreviewControlled({
  filePath,
  cwd,
  fromRef,
  toRef,
  expanded,
  onToggle
}: CodePreviewControlledProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('code')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [hasLoadedContent, setHasLoadedContent] = useState(false)

  const hasDiffRefs = fromRef && toRef

  // Load file content only when expanded (lazy loading)
  useEffect(() => {
    async function loadFile() {
      if (!expanded || hasLoadedContent) {
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await window.tikiDesktop.code.readFile(cwd, filePath)
        setFileContent(result)
        setHasLoadedContent(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (message.toLowerCase().includes('not found')) {
          setError('File not found')
        } else {
          setError('Unable to read file')
        }
        setHasLoadedContent(true)
      } finally {
        setLoading(false)
      }
    }

    loadFile()
  }, [cwd, filePath, expanded, hasLoadedContent])

  // Load diff content when switching to diff mode
  useEffect(() => {
    async function loadDiff() {
      if (viewMode !== 'diff' || !hasDiffRefs || diffContent !== null) {
        return
      }

      setDiffLoading(true)
      try {
        const diff = await window.tikiDesktop.git.getFileDiff(cwd, filePath, fromRef, toRef)
        setDiffContent(diff)
      } catch {
        // If diff fails, just show empty diff
        setDiffContent('')
      } finally {
        setDiffLoading(false)
      }
    }

    loadDiff()
  }, [viewMode, hasDiffRefs, cwd, filePath, fromRef, toRef, diffContent])

  const handleOpenInEditor = useCallback(() => {
    window.tikiDesktop.code.openInEditor(filePath)
  }, [filePath])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  return (
    <div data-testid="code-preview" className="rounded overflow-hidden border border-slate-700">
      {/* Header Bar */}
      <div
        data-testid="code-preview-header"
        className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Expand/Collapse Toggle */}
          <button
            data-testid="code-preview-toggle"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse code preview' : 'Expand code preview'}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* File Path */}
          <span
            data-testid="code-preview-path"
            className="font-mono text-sm text-slate-300 truncate"
            title={filePath}
          >
            {filePath}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Mode Toggle (only when diff refs are provided) */}
          {hasDiffRefs && (
            <div className="flex gap-1">
              <button
                data-testid="view-mode-code"
                onClick={() => handleViewModeChange('code')}
                aria-pressed={viewMode === 'code'}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'code'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                }`}
              >
                Code
              </button>
              <button
                data-testid="view-mode-diff"
                onClick={() => handleViewModeChange('diff')}
                aria-pressed={viewMode === 'diff'}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'diff'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                }`}
              >
                Diff
              </button>
            </div>
          )}

          {/* Open in Editor Button */}
          <button
            data-testid="code-preview-open-editor"
            onClick={handleOpenInEditor}
            aria-label="Open in editor"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {expanded && (
        <div data-testid="code-preview-content" className="bg-slate-900">
          {loading && (
            <div
              data-testid="code-preview-loading"
              className="flex items-center justify-center p-8 text-slate-400"
            >
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </div>
          )}

          {error && (
            <div
              data-testid="code-preview-error"
              className="flex items-center justify-center p-8 text-red-400"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {error}
            </div>
          )}

          {!loading && !error && fileContent && viewMode === 'code' && (
            <SyntaxHighlighter
              code={fileContent.content}
              language={fileContent.language}
              isTruncated={fileContent.isTruncated}
              maxHeight="400px"
            />
          )}

          {!loading && !error && viewMode === 'diff' && hasDiffRefs && (
            <>
              {diffLoading ? (
                <div className="flex items-center justify-center p-8 text-slate-400">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading diff...
                </div>
              ) : (
                <DiffView diff={diffContent || ''} filePath={filePath} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

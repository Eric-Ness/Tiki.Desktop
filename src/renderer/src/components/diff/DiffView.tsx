import { useState, useMemo } from 'react'

type DiffMode = 'unified' | 'split'

interface DiffViewProps {
  diff: string
  filePath: string
  mode?: DiffMode
  loading?: boolean
}

interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'header' | 'hunk'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface ParsedHunk {
  header: string
  lines: DiffLine[]
}

function parseDiff(diff: string): ParsedHunk[] {
  if (!diff.trim()) return []

  const lines = diff.split('\n')
  const hunks: ParsedHunk[] = []
  let currentHunk: ParsedHunk | null = null
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    // Skip diff header lines
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      continue
    }

    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/)
    if (hunkMatch) {
      oldLineNum = parseInt(hunkMatch[1], 10)
      newLineNum = parseInt(hunkMatch[2], 10)
      currentHunk = {
        header: line,
        lines: [{ type: 'hunk', content: line }]
      }
      hunks.push(currentHunk)
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'added',
        content: line.slice(1),
        newLineNumber: newLineNum++
      })
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'removed',
        content: line.slice(1),
        oldLineNumber: oldLineNum++
      })
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({
        type: 'context',
        content: line.slice(1) || '',
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++
      })
    }
  }

  return hunks
}

function UnifiedDiffView({ hunks }: { hunks: ParsedHunk[] }) {
  return (
    <div className="font-mono text-sm">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
          {hunk.lines.map((line, lineIndex) => {
            if (line.type === 'hunk') {
              return (
                <div
                  key={lineIndex}
                  className="px-4 py-1 bg-slate-700/50 text-slate-400 border-y border-slate-600"
                >
                  {line.content}
                </div>
              )
            }

            const bgClass = line.type === 'added'
              ? 'bg-green-900/30'
              : line.type === 'removed'
              ? 'bg-red-900/30'
              : ''

            const testId = line.type === 'added'
              ? 'diff-line-added'
              : line.type === 'removed'
              ? 'diff-line-removed'
              : 'diff-line-context'

            return (
              <div
                key={lineIndex}
                data-testid={testId}
                className={`flex ${bgClass}`}
              >
                {/* Old line number */}
                <span
                  data-testid="line-number"
                  className="w-12 px-2 text-right text-slate-500 select-none border-r border-slate-700"
                >
                  {line.type !== 'added' ? line.oldLineNumber : ''}
                </span>
                {/* New line number */}
                <span
                  data-testid="line-number"
                  className="w-12 px-2 text-right text-slate-500 select-none border-r border-slate-700"
                >
                  {line.type !== 'removed' ? line.newLineNumber : ''}
                </span>
                {/* Change indicator */}
                <span className={`w-6 text-center select-none ${
                  line.type === 'added' ? 'text-green-400' : line.type === 'removed' ? 'text-red-400' : 'text-slate-600'
                }`}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {/* Content */}
                <span className="flex-1 px-2 whitespace-pre overflow-x-auto">
                  {line.content}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SplitDiffView({ hunks }: { hunks: ParsedHunk[] }) {
  // For split view, we need to pair removed and added lines
  const rows: Array<{ left?: DiffLine; right?: DiffLine }> = []

  for (const hunk of hunks) {
    const removedBuffer: DiffLine[] = []
    const addedBuffer: DiffLine[] = []

    for (const line of hunk.lines) {
      if (line.type === 'hunk') {
        rows.push({ left: line, right: line })
        continue
      }

      if (line.type === 'removed') {
        removedBuffer.push(line)
      } else if (line.type === 'added') {
        addedBuffer.push(line)
      } else {
        // Flush buffers before context line
        while (removedBuffer.length > 0 || addedBuffer.length > 0) {
          rows.push({
            left: removedBuffer.shift(),
            right: addedBuffer.shift()
          })
        }
        rows.push({ left: line, right: line })
      }
    }

    // Flush remaining buffers
    while (removedBuffer.length > 0 || addedBuffer.length > 0) {
      rows.push({
        left: removedBuffer.shift(),
        right: addedBuffer.shift()
      })
    }
  }

  return (
    <div data-testid="diff-view-split" className="font-mono text-sm flex">
      {/* Left side (old) */}
      <div className="flex-1 border-r border-slate-600">
        {rows.map((row, index) => {
          const line = row.left

          if (line?.type === 'hunk') {
            return (
              <div
                key={index}
                className="px-4 py-1 bg-slate-700/50 text-slate-400 border-y border-slate-600"
              >
                {line.content}
              </div>
            )
          }

          const bgClass = line?.type === 'removed' ? 'bg-red-900/30' : ''

          return (
            <div key={index} className={`flex h-6 ${bgClass}`}>
              <span
                data-testid="line-number"
                className="w-12 px-2 text-right text-slate-500 select-none border-r border-slate-700"
              >
                {line?.oldLineNumber ?? ''}
              </span>
              <span className="flex-1 px-2 whitespace-pre overflow-x-auto">
                {line?.content ?? ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Right side (new) */}
      <div className="flex-1">
        {rows.map((row, index) => {
          const line = row.right

          if (line?.type === 'hunk') {
            return (
              <div
                key={index}
                className="px-4 py-1 bg-slate-700/50 text-slate-400 border-y border-slate-600"
              >
                {line.content}
              </div>
            )
          }

          const bgClass = line?.type === 'added' ? 'bg-green-900/30' : ''

          return (
            <div key={index} className={`flex h-6 ${bgClass}`}>
              <span
                data-testid="line-number"
                className="w-12 px-2 text-right text-slate-500 select-none border-r border-slate-700"
              >
                {line?.newLineNumber ?? ''}
              </span>
              <span className="flex-1 px-2 whitespace-pre overflow-x-auto">
                {line?.content ?? ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DiffView({ diff, filePath, mode: initialMode = 'unified', loading = false }: DiffViewProps) {
  const [mode, setMode] = useState<DiffMode>(initialMode)

  const isBinaryFile = useMemo(() => {
    return diff?.includes('Binary files') && diff?.includes('differ')
  }, [diff])

  const hunks = useMemo(() => {
    if (isBinaryFile) return []
    return parseDiff(diff)
  }, [diff, isBinaryFile])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <svg
          className="animate-spin h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
        >
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
    )
  }

  if (isBinaryFile) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-4">
          <span className="text-sm font-mono text-slate-300">{filePath}</span>
        </div>
        <div className="flex items-center justify-center p-8 text-slate-400 bg-slate-800 rounded">
          Binary file - cannot display diff
        </div>
      </div>
    )
  }

  if (!diff?.trim() || hunks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        No changes to display
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-2">
        <span className="text-sm font-mono text-slate-300">{filePath}</span>

        {/* View mode toggle */}
        <div className="flex gap-1">
          <button
            role="button"
            aria-pressed={mode === 'unified'}
            onClick={() => setMode('unified')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'unified'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Unified
          </button>
          <button
            role="button"
            aria-pressed={mode === 'split'}
            onClick={() => setMode('split')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === 'split'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Side-by-side
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto bg-slate-800/50">
        {mode === 'unified' ? (
          <UnifiedDiffView hunks={hunks} />
        ) : (
          <SplitDiffView hunks={hunks} />
        )}
      </div>
    </div>
  )
}

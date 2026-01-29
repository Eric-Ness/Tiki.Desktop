import { useState, useEffect, useCallback } from 'react'
import { ChangeSummary } from './ChangeSummary'
import { FileDiffList, FileChange } from './FileDiffList'
import { DiffView } from './DiffView'

interface DiffStats {
  files: FileChange[]
  totalAdditions: number
  totalDeletions: number
  totalFiles: number
}

interface PhaseChangesProps {
  fromRef?: string
  toRef?: string
  cwd?: string
}

export function PhaseChanges({ fromRef, toRef, cwd }: PhaseChangesProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diffStats, setDiffStats] = useState<DiffStats | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null)
  const [fileDiff, setFileDiff] = useState<string>('')
  const [loadingDiff, setLoadingDiff] = useState(false)
  const [projectCwd, setProjectCwd] = useState<string>('')

  // Get the cwd on mount
  useEffect(() => {
    const getCwd = async () => {
      if (cwd) {
        setProjectCwd(cwd)
      } else {
        const resolvedCwd = await window.tikiDesktop.getCwd()
        setProjectCwd(resolvedCwd)
      }
    }
    getCwd()
  }, [cwd])

  // Load diff stats
  useEffect(() => {
    if (!projectCwd) return

    const loadDiffStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const stats = await window.tikiDesktop.git.getDiffStats(projectCwd, fromRef, toRef)
        setDiffStats(stats)

        // Auto-select first file if available
        if (stats.files.length > 0) {
          setSelectedFile(stats.files[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load changes')
      } finally {
        setLoading(false)
      }
    }

    loadDiffStats()
  }, [projectCwd, fromRef, toRef])

  // Load diff for selected file
  useEffect(() => {
    if (!selectedFile || !projectCwd) return

    const loadFileDiff = async () => {
      setLoadingDiff(true)

      try {
        const diff = await window.tikiDesktop.git.getFileDiff(
          projectCwd,
          selectedFile.path,
          fromRef,
          toRef
        )
        setFileDiff(diff)
      } catch (err) {
        console.error('Failed to load file diff:', err)
        setFileDiff('')
      } finally {
        setLoadingDiff(false)
      }
    }

    loadFileDiff()
  }, [selectedFile, projectCwd, fromRef, toRef])

  const handleFileSelect = useCallback((file: FileChange) => {
    setSelectedFile(file)
  }, [])

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
        Loading changes...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 bg-red-900/20 rounded-lg">
        Error loading changes: {error}
      </div>
    )
  }

  if (!diffStats || diffStats.files.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No files changed
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <div className="p-3 border-b border-slate-700">
        <ChangeSummary
          additions={diffStats.totalAdditions}
          deletions={diffStats.totalDeletions}
          filesChanged={diffStats.totalFiles}
        />
      </div>

      {/* Main content - file list and diff viewer */}
      <div className="flex flex-1 min-h-0">
        {/* File list */}
        <div className="w-64 border-r border-slate-700 overflow-auto">
          <FileDiffList
            files={diffStats.files}
            onFileSelect={handleFileSelect}
            selectedPath={selectedFile?.path}
          />
        </div>

        {/* Diff viewer */}
        <div className="flex-1 overflow-auto">
          {selectedFile && (
            <DiffView
              diff={fileDiff}
              filePath={selectedFile.path}
              loading={loadingDiff}
            />
          )}
        </div>
      </div>
    </div>
  )
}

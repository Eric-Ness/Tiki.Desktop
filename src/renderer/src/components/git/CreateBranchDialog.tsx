import { useState, useEffect, useCallback, useMemo } from 'react'
import { logger } from '../../lib/logger'

interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

interface CreateBranchDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (branchName: string, switchedTo: boolean) => void
  defaultBaseBranch?: string
  cwd: string
}

// Branch name validation rules
const BRANCH_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/
const INVALID_SEQUENCES = ['..', '//']
const RESERVED_NAMES = ['HEAD', '-']

function validateBranchName(name: string): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'Branch name is required' }
  }

  if (name.length > 255) {
    return { valid: false, error: 'Branch name is too long (max 255 characters)' }
  }

  if (name.startsWith('-') || name.startsWith('.')) {
    return { valid: false, error: 'Branch name cannot start with "-" or "."' }
  }

  if (name.endsWith('.') || name.endsWith('/') || name.endsWith('.lock')) {
    return { valid: false, error: 'Branch name cannot end with ".", "/" or ".lock"' }
  }

  if (!BRANCH_NAME_REGEX.test(name)) {
    return { valid: false, error: 'Branch name contains invalid characters (use letters, numbers, ., _, -, /)' }
  }

  for (const seq of INVALID_SEQUENCES) {
    if (name.includes(seq)) {
      return { valid: false, error: `Branch name cannot contain "${seq}"` }
    }
  }

  if (RESERVED_NAMES.includes(name.toUpperCase())) {
    return { valid: false, error: `"${name}" is a reserved name` }
  }

  return { valid: true }
}

export function CreateBranchDialog({
  isOpen,
  onClose,
  onCreated,
  defaultBaseBranch,
  cwd
}: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState('')
  const [baseBranch, setBaseBranch] = useState(defaultBaseBranch || 'main')
  const [issueNumber, setIssueNumber] = useState('')
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  // Fetch branches when dialog opens
  useEffect(() => {
    if (!isOpen || !cwd) return

    const fetchBranches = async () => {
      setLoading(true)
      try {
        const branchList = await window.tikiDesktop.branch.list(cwd)
        setBranches(branchList)

        // Set default base branch
        const current = branchList.find((b) => b.current)
        const main = branchList.find((b) => b.name === 'main' || b.name === 'master')
        setBaseBranch(defaultBaseBranch || main?.name || current?.name || 'main')
      } catch (err) {
        logger.error('Failed to fetch branches:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [isOpen, cwd, defaultBaseBranch])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setBranchName('')
      setIssueNumber('')
      setError(null)
      setTouched(false)
    }
  }, [isOpen])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  // Validate branch name
  const validation = useMemo(() => {
    if (!touched || !branchName) return { valid: true }

    const nameValidation = validateBranchName(branchName)
    if (!nameValidation.valid) return nameValidation

    // Check if branch already exists
    if (branches.some((b) => b.name === branchName)) {
      return { valid: false, error: 'A branch with this name already exists' }
    }

    return { valid: true }
  }, [branchName, branches, touched])

  // Create branch
  const handleCreate = async (checkout: boolean) => {
    setTouched(true)

    const nameValidation = validateBranchName(branchName)
    if (!nameValidation.valid) {
      setError(nameValidation.error || 'Invalid branch name')
      return
    }

    if (branches.some((b) => b.name === branchName)) {
      setError('A branch with this name already exists')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.branch.create(cwd, {
        name: branchName,
        checkout,
        baseBranch
      })

      if (!result.success) {
        setError(result.error || 'Failed to create branch')
        return
      }

      // Associate with issue if provided
      if (issueNumber && !isNaN(parseInt(issueNumber))) {
        try {
          await window.tikiDesktop.branch.associateIssue(
            cwd,
            branchName,
            parseInt(issueNumber)
          )
        } catch (err) {
          logger.error('Failed to associate issue:', err)
          // Don't fail the whole operation for this
        }
      }

      onCreated(branchName, checkout)
      onClose()
    } catch (err) {
      setError('Failed to create branch')
      logger.error('Branch creation error:', err)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  const isValid = branchName.trim() && validation.valid && !creating

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-slate-100">Create New Branch</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Branch Name */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Branch Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value)
                  setTouched(true)
                  setError(null)
                }}
                placeholder="feature/my-new-feature"
                autoFocus
                className={`w-full px-3 py-2 text-sm bg-background border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors ${
                  touched && !validation.valid
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-border focus:border-blue-500'
                }`}
              />
              {touched && !validation.valid && validation.error && (
                <p className="mt-1.5 text-xs text-red-400">{validation.error}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                Use lowercase letters, numbers, hyphens, and forward slashes
              </p>
            </div>

            {/* Base Branch */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Base Branch
              </label>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-background border border-border rounded">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Loading branches...
                </div>
              ) : (
                <select
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                      {branch.current ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                The new branch will be created from this branch
              </p>
            </div>

            {/* Associate with Issue (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Associate with Issue <span className="text-slate-500">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">#</span>
                <input
                  type="text"
                  value={issueNumber}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '')
                    setIssueNumber(value)
                  }}
                  placeholder="123"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-background border border-border rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Link this branch to a GitHub issue number
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate(false)}
              disabled={!isValid}
              className="px-3 py-1.5 text-sm bg-background-tertiary hover:bg-background-tertiary/80 text-slate-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => handleCreate(true)}
              disabled={!isValid}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create & Switch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

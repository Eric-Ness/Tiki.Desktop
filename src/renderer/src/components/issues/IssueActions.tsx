import { useState, useRef, useEffect } from 'react'
import { useIssueActions, getIssueWorkState, getActionInfo, type IssueActionType } from '../../hooks/useIssueActions'
import { useTikiStore, type GitHubIssue } from '../../stores/tiki-store'

interface IssueActionsProps {
  issue: GitHubIssue
}

// Action icons
const ActionIcon = ({ type, className }: { type: IssueActionType; className?: string }) => {
  const iconClass = className || 'w-4 h-4'

  switch (type) {
    case 'yolo':
    case 'execute':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    case 'plan':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'resume':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 18l8.5-6L4 6v12zM13 6v12l8.5-6L13 6z" />
        </svg>
      )
    case 'ship':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11l-2 4h4l-2-4" />
        </svg>
      )
    case 'verify':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case 'get':
      // Download/fetch icon
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
    case 'review':
      // Search/magnifier icon
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'audit':
      // Shield/check icon
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
  }
}

export function IssueActions({ issue }: IssueActionsProps) {
  const { executing, executeAction } = useIssueActions()
  const tikiState = useTikiStore((state) => state.tikiState)
  const plans = useTikiStore((state) => state.plans)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get plan for this issue if it exists
  const plan = plans.get(issue.number) || null
  const workState = getIssueWorkState(issue, tikiState, plan)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // No actions available
  if (!workState.primaryAction && workState.secondaryActions.length === 0) {
    return null
  }

  const handlePrimaryAction = () => {
    if (workState.primaryAction && !executing) {
      executeAction(workState.primaryAction, issue.number)
    }
  }

  const handleSecondaryAction = (action: IssueActionType) => {
    setDropdownOpen(false)
    if (!executing) {
      executeAction(action, issue.number)
    }
  }

  const primaryInfo = workState.primaryAction ? getActionInfo(workState.primaryAction) : null

  return (
    <div className="flex items-center gap-2">
      {/* Primary action button */}
      {primaryInfo && workState.primaryAction && (
        <button
          onClick={handlePrimaryAction}
          disabled={!!executing}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
            executing === workState.primaryAction
              ? 'bg-amber-600 text-white'
              : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={primaryInfo.description}
        >
          {executing === workState.primaryAction ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ActionIcon type={workState.primaryAction} />
          )}
          {primaryInfo.label}
        </button>
      )}

      {/* Secondary actions dropdown */}
      {workState.secondaryActions.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={!!executing}
            className="flex items-center justify-center w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 active:bg-slate-700 transition-colors disabled:opacity-50"
            title="More actions"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-background-secondary border border-border rounded-lg shadow-lg overflow-hidden z-10">
              {workState.secondaryActions.map((action) => {
                const info = getActionInfo(action)
                return (
                  <button
                    key={action}
                    onClick={() => handleSecondaryAction(action)}
                    disabled={!!executing}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-background-tertiary transition-colors disabled:opacity-50"
                  >
                    {executing === action ? (
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ActionIcon type={action} className="w-4 h-4 text-slate-400" />
                    )}
                    <span>{info.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

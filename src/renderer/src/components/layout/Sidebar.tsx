import { useState, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { IssueList } from '../sidebar/IssueList'

interface SidebarProps {
  cwd: string
}

export function Sidebar({ cwd }: SidebarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const setGithubLoading = useTikiStore((state) => state.setGithubLoading)
  const setGithubError = useTikiStore((state) => state.setGithubError)
  const setIssues = useTikiStore((state) => state.setIssues)

  const handleRefreshIssues = useCallback(async () => {
    if (!cwd) return
    setGithubLoading(true)
    setGithubError(null)
    try {
      await window.tikiDesktop.github.refresh(cwd)
      const issues = await window.tikiDesktop.github.getIssues('open', cwd)
      setIssues(issues as never[])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh'
      setGithubError(message)
    } finally {
      setGithubLoading(false)
    }
  }, [cwd, setGithubLoading, setGithubError, setIssues])

  const getStatusColor = (status: string | undefined | null) => {
    switch (status) {
      case 'executing':
        return 'bg-status-running'
      case 'paused':
        return 'bg-amber-400'
      case 'failed':
        return 'bg-status-failed'
      default:
        return 'bg-slate-500'
    }
  }

  const getStatusLabel = (status: string | undefined | null) => {
    switch (status) {
      case 'executing':
        return 'Executing'
      case 'paused':
        return 'Paused'
      case 'failed':
        return 'Failed'
      default:
        return 'Idle'
    }
  }

  return (
    <div className="h-full bg-background-secondary border-r border-border flex flex-col shadow-sm">
      {/* Projects Section */}
      <SidebarSection title="Projects" defaultOpen>
        <div className="text-sm text-slate-400 px-2 py-1">
          {cwd ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="truncate">{cwd.split(/[/\\]/).pop()}</span>
            </div>
          ) : (
            <span className="italic">No project</span>
          )}
        </div>
      </SidebarSection>

      {/* State Section */}
      <SidebarSection title="State" defaultOpen>
        <div className="px-2 py-1 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(tikiState?.status)}`} />
            <span>{getStatusLabel(tikiState?.status)}</span>
          </div>
          {tikiState?.activeIssue ? (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Issue #{tikiState.activeIssue}
                </span>
                {currentPlan?.issue?.title && (
                  <span className="block truncate text-slate-400 mt-0.5 pl-4">{currentPlan.issue.title}</span>
                )}
              </div>
              {currentPlan?.phases && currentPlan.phases.length > 0 && (
                <div className="text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>
                      {tikiState.completedPhases?.length || 0} / {currentPlan.phases.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {currentPlan.phases.map((phase) => {
                      const isCompleted = tikiState.completedPhases?.includes(phase.number)
                      const isCurrent = phase.number === tikiState.currentPhase
                      const isFailed = phase.status === 'failed'
                      return (
                        <div
                          key={phase.number}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            isCompleted
                              ? 'bg-status-completed'
                              : isCurrent
                                ? 'bg-status-running animate-pulse'
                                : isFailed
                                  ? 'bg-status-failed'
                                  : 'bg-slate-600'
                          }`}
                          title={`Phase ${phase.number}: ${phase.title} (${phase.status})`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
              No active execution
            </div>
          )}
        </div>
      </SidebarSection>

      {/* Issues Section */}
      <SidebarSection title="Issues" defaultOpen>
        <IssueList onRefresh={handleRefreshIssues} />
      </SidebarSection>

      {/* Releases Section */}
      <SidebarSection title="Releases">
        <div className="px-2 py-1 text-sm text-slate-500 italic">
          No releases
        </div>
      </SidebarSection>

      {/* Knowledge Section */}
      <SidebarSection title="Knowledge">
        <div className="px-2 py-1 text-sm text-slate-500 italic">
          No knowledge entries
        </div>
      </SidebarSection>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <button className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded text-sm font-medium transition-colors shadow-sm hover:shadow-md active:shadow-sm">
          Start Claude Code
        </button>
      </div>
    </div>
  )
}

interface SidebarSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function SidebarSection({ title, defaultOpen = false, children }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-background-tertiary active:bg-background-tertiary/70 transition-colors group"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
          {title}
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-all duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Grid-based smooth height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div
            className={`pb-2 transition-opacity duration-200 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

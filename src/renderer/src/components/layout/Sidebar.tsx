import { useState } from 'react'
import { useTikiStore } from '../../stores/tiki-store'

interface SidebarProps {
  cwd: string
}

export function Sidebar({ cwd }: SidebarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)

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
    <div className="h-full bg-background-secondary border-r border-border flex flex-col">
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
            <div className="mt-2 space-y-1">
              <div className="text-xs text-slate-500">
                Issue: #{tikiState.activeIssue}
                {currentPlan?.issue?.title && (
                  <span className="block truncate text-slate-400">{currentPlan.issue.title}</span>
                )}
              </div>
              {tikiState.currentPhase && (
                <div className="text-xs text-slate-500">
                  Phase: {tikiState.currentPhase}
                  {currentPlan?.phases && (
                    <span> / {currentPlan.phases.length}</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              No active execution
            </div>
          )}
        </div>
      </SidebarSection>

      {/* Issues Section */}
      <SidebarSection title="Issues">
        <div className="px-2 py-1 text-sm text-slate-500 italic">
          Connect GitHub to view issues
        </div>
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
        <button className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium transition-colors">
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
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-background-tertiary transition-colors"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  )
}

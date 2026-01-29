import { WorkflowList } from './WorkflowList'

interface WorkflowDashboardProps {
  cwd: string
}

export function WorkflowDashboard({ cwd }: WorkflowDashboardProps) {
  return (
    <div className="h-full flex flex-col" data-testid="workflow-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-200">CI/CD Status</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <WorkflowList cwd={cwd} />
      </div>
    </div>
  )
}

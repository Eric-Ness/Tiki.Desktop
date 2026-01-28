import { useTikiStore } from '../../stores/tiki-store'
import { PhaseDetail, type PhaseData, type PhaseStatus } from '../detail/PhaseDetail'
import { IssueDetail } from '../detail/IssueDetail'
import { ShipDetail } from '../detail/ShipDetail'
import { ReleaseDetail } from '../detail/ReleaseDetail'

// Empty state component
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <div className="text-center px-6 max-w-[200px]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-tertiary/50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">No Selection</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Select a phase node in the workflow or an issue from the sidebar to view details
        </p>
      </div>
    </div>
  )
}

// Helper to parse phase number from node id
function parsePhaseNumber(nodeId: string): number | null {
  const match = nodeId.match(/^phase-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

// Helper to determine selection type
type SelectionType = 'empty' | 'phase' | 'issue' | 'ship' | 'github-issue' | 'release'

function getSelectionType(
  nodeId: string | null,
  selectedIssue: number | null,
  selectedRelease: string | null
): SelectionType {
  // Sidebar selections take priority
  if (selectedRelease !== null) return 'release'
  if (selectedIssue !== null) return 'github-issue'
  if (!nodeId) return 'empty'
  if (nodeId === 'issue-node') return 'issue'
  if (nodeId === 'ship-node') return 'ship'
  if (nodeId.startsWith('phase-')) return 'phase'
  return 'empty'
}

interface DetailPanelProps {
  cwd?: string
}

export function DetailPanel({ cwd }: DetailPanelProps) {
  const selectedNode = useTikiStore((state) => state.selectedNode)
  const selectedIssue = useTikiStore((state) => state.selectedIssue)
  const selectedRelease = useTikiStore((state) => state.selectedRelease)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const issues = useTikiStore((state) => state.issues)
  const releases = useTikiStore((state) => state.releases)

  const selectionType = getSelectionType(selectedNode, selectedIssue, selectedRelease)

  // Render content based on selection type
  const renderContent = () => {
    if (selectionType === 'empty') {
      return <EmptyState />
    }

    // Release from sidebar selection
    if (selectionType === 'release' && selectedRelease !== null) {
      const release = releases.find((r) => r.version === selectedRelease)
      if (release) {
        return <ReleaseDetail release={release} />
      }
      return <EmptyState />
    }

    // GitHub issue from sidebar selection
    if (selectionType === 'github-issue' && selectedIssue !== null) {
      const issue = issues.find((i) => i.number === selectedIssue)
      if (issue) {
        return <IssueDetail issue={issue} cwd={cwd} />
      }
      return <EmptyState />
    }

    if (selectionType === 'phase' && selectedNode && currentPlan) {
      const phaseNumber = parsePhaseNumber(selectedNode)
      if (phaseNumber !== null) {
        const phase = currentPlan.phases.find((p) => p.number === phaseNumber)
        if (phase) {
          // Transform to PhaseData type
          const phaseData: PhaseData = {
            number: phase.number,
            title: phase.title,
            status: phase.status as PhaseStatus,
            files: phase.files,
            verification: phase.verification,
            summary: phase.summary,
            error: phase.error
          }
          return <PhaseDetail phase={phaseData} />
        }
      }
      // Phase not found, show empty state
      return <EmptyState />
    }

    if (selectionType === 'issue' && currentPlan) {
      return (
        <IssueDetail
          issue={{
            number: currentPlan.issue.number,
            title: currentPlan.issue.title,
            state: 'open' // Default to open for current plan
          }}
        />
      )
    }

    if (selectionType === 'ship' && currentPlan) {
      const allPhasesComplete = currentPlan.phases.every((p) => p.status === 'completed')
      return <ShipDetail allPhasesComplete={allPhasesComplete} />
    }

    // Fallback to empty state
    return <EmptyState />
  }

  return (
    <div className="h-full bg-background-secondary border-l border-border flex flex-col shadow-sm">
      {/* Header */}
      <div className="h-9 px-3 flex items-center border-b border-border bg-background-tertiary/30">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Details
        </span>
      </div>

      {/* Content with smooth transitions */}
      <div className="flex-1 flex flex-col overflow-y-auto transition-all duration-150">
        {renderContent()}
      </div>
    </div>
  )
}

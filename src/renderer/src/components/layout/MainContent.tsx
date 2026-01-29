import { useState, useMemo, useCallback } from 'react'
import { TerminalTabs } from '../terminal/TerminalTabs'
import { WorkflowCanvas } from '../workflow/WorkflowCanvas'
import { ConfigEditor } from '../config'
import { ActivityLog } from '../activity'
import { TimelineView } from '../timeline'
import { DependencyView } from '../dependencies'
import { HeatMapPanel } from '../heatmap'
import { VelocityDashboard } from '../analytics'
import { useActivityStore } from '../../stores/activity-store'
import { useTikiStore } from '../../stores/tiki-store'
import { extractTimeline } from '../../lib/timeline-utils'

type Tab = 'terminal' | 'workflow' | 'timeline' | 'dependencies' | 'heatmap' | 'analytics' | 'config' | 'activity'

interface MainContentProps {
  cwd: string
}

export function MainContent({ cwd }: MainContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>('terminal')
  const activityEventCount = useActivityStore((state) => state.events.length)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const tikiState = useTikiStore((state) => state.tikiState)
  const issues = useTikiStore((state) => state.issues)
  const releases = useTikiStore((state) => state.releases)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)

  // Extract timeline data from current plan and state
  const timeline = useMemo(
    () => extractTimeline(currentPlan, tikiState),
    [currentPlan, tikiState]
  )

  // Handle issue selection from dependency graph
  const handleIssueSelect = useCallback(
    (issueNumber: number) => {
      // Clear workflow node selection when selecting from dependency graph
      setSelectedNode(null)
      setSelectedIssue(issueNumber)
    },
    [setSelectedNode, setSelectedIssue]
  )

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Bar */}
      <div className="h-9 bg-background-secondary border-b border-border flex items-center px-2 gap-1">
        <TabButton
          active={activeTab === 'terminal'}
          onClick={() => setActiveTab('terminal')}
        >
          Terminal
        </TabButton>
        <TabButton
          active={activeTab === 'workflow'}
          onClick={() => setActiveTab('workflow')}
        >
          Workflow
        </TabButton>
        <TabButton
          active={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </TabButton>
        <TabButton
          active={activeTab === 'dependencies'}
          onClick={() => setActiveTab('dependencies')}
        >
          Dependencies
        </TabButton>
        <TabButton
          active={activeTab === 'heatmap'}
          onClick={() => setActiveTab('heatmap')}
        >
          Heat Map
        </TabButton>
        <TabButton
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </TabButton>
        <TabButton
          active={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
        >
          Config
        </TabButton>
        <TabButton
          active={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
          badge={activityEventCount > 0 ? activityEventCount : undefined}
        >
          Activity
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <TerminalTabs cwd={cwd} />}
        {activeTab === 'workflow' && <WorkflowCanvas />}
        {activeTab === 'timeline' && <TimelineView timeline={timeline} />}
        {activeTab === 'dependencies' && (
          <DependencyView
            issues={issues}
            releases={releases}
            onIssueSelect={handleIssueSelect}
          />
        )}
        {activeTab === 'heatmap' && <HeatMapPanel cwd={cwd} />}
        {activeTab === 'analytics' && <VelocityDashboard cwd={cwd} />}
        {activeTab === 'config' && <ConfigEditor />}
        {activeTab === 'activity' && <ActivityLog />}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: number
}

function TabButton({ active, onClick, children, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 text-sm rounded transition-all duration-150 flex items-center gap-1.5
        ${active
          ? 'bg-background text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-background-tertiary active:bg-background-tertiary/70'
        }
      `}
    >
      {children}
      {badge !== undefined && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 min-w-[1.25rem] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}


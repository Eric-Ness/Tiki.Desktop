import { useState, useCallback } from 'react'
import { useTikiStore, type Project } from '../../stores/tiki-store'
import { IssueList } from '../sidebar/IssueList'
import { ReleaseList } from '../sidebar/ReleaseList'
import { ProjectList } from '../sidebar/ProjectList'
import { KnowledgeList } from '../knowledge/KnowledgeList'
import { KnowledgeEditor } from '../knowledge/KnowledgeEditor'
import { TemplateList } from '../templates/TemplateList'
import { TemplateDetail } from '../templates/TemplateDetail'
import { CreateTemplateDialog } from '../templates/CreateTemplateDialog'
import { CreateReleaseDialog } from '../releases/CreateReleaseDialog'

type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'

interface PlanTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: Array<{
    title: string
    content: string
    filePatterns: string[]
    verification: string[]
  }>
  variables: Array<{
    name: string
    description: string
    type: 'string' | 'file' | 'component' | 'number'
    defaultValue?: string
    required: boolean
  }>
  matchCriteria: {
    keywords: string[]
    labels: string[]
    filePatterns: string[]
  }
  sourceIssue?: number
  successCount: number
  failureCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  cwd: string
  onProjectSwitch: (project: Project) => void
}

export function Sidebar({ cwd, onProjectSwitch }: SidebarProps) {
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const activeProject = useTikiStore((state) => state.activeProject)
  const setGithubLoading = useTikiStore((state) => state.setGithubLoading)
  const setGithubError = useTikiStore((state) => state.setGithubError)
  const setIssues = useTikiStore((state) => state.setIssues)

  const [showKnowledgeEditor, setShowKnowledgeEditor] = useState(false)
  const [knowledgeKey, setKnowledgeKey] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null)
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false)
  const [templateKey, setTemplateKey] = useState(0)
  const [showCreateRelease, setShowCreateRelease] = useState(false)

  const handleStartClaudeCode = useCallback(async () => {
    if (!cwd) return

    try {
      // Create a new terminal named "Claude" in the project directory
      const terminalId = await window.tikiDesktop.terminal.create(cwd, 'Claude')

      // Add the terminal to the store so it appears in the UI
      useTikiStore.getState().addTerminal({
        id: terminalId,
        name: 'Claude',
        status: 'active'
      })

      // Switch to the terminal tab
      useTikiStore.setState({ activeTerminal: terminalId })

      // Small delay to ensure PTY is fully initialized before writing
      // This prevents crashes on Windows where node-pty may not be ready immediately
      setTimeout(() => {
        window.tikiDesktop.terminal.write(terminalId, 'claude --dangerously-skip-permissions\r')
      }, 100)
    } catch (error) {
      console.error('Failed to start Claude Code:', error)
    }
  }, [cwd])

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
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Projects Section */}
        <SidebarSection title="Projects" defaultOpen>
          <ProjectList onProjectSwitch={onProjectSwitch} />
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
        <SidebarSection
          title="Releases"
          defaultOpen
          action={
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCreateRelease(true)
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-background-tertiary"
              title="Create new release"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          }
        >
          <ReleaseList />
        </SidebarSection>

        {/* Knowledge Section */}
        <SidebarSection title="Knowledge">
          <KnowledgeList
            key={knowledgeKey}
            onCreateEntry={() => setShowKnowledgeEditor(true)}
          />
        </SidebarSection>

        {/* Templates Section */}
        <SidebarSection title="Templates">
          <TemplateList
            key={templateKey}
            onSelect={setSelectedTemplate}
            onCreateNew={() => setShowCreateTemplateDialog(true)}
          />
        </SidebarSection>
      </div>

      {/* Knowledge Editor Modal */}
      {showKnowledgeEditor && (
        <KnowledgeEditor
          onClose={() => setShowKnowledgeEditor(false)}
          onCreated={() => setKnowledgeKey((k) => k + 1)}
        />
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-secondary border border-border rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
            <TemplateDetail
              template={selectedTemplate}
              onClose={() => setSelectedTemplate(null)}
              onDelete={async () => {
                if (activeProject?.path) {
                  await window.tikiDesktop.templates.delete(activeProject.path, selectedTemplate.id)
                  setSelectedTemplate(null)
                  setTemplateKey((k) => k + 1)
                }
              }}
              onExport={async () => {
                if (activeProject?.path) {
                  const result = await window.tikiDesktop.templates.export(
                    activeProject.path,
                    selectedTemplate.id
                  )
                  if (result?.json) {
                    // Create a blob and download
                    const blob = new Blob([result.json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `template-${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Create Template Dialog */}
      {showCreateTemplateDialog && (
        <CreateTemplateDialog
          isOpen={showCreateTemplateDialog}
          onClose={() => setShowCreateTemplateDialog(false)}
          onCreated={() => {
            setShowCreateTemplateDialog(false)
            setTemplateKey((k) => k + 1)
          }}
        />
      )}

      {/* Create Release Dialog */}
      {showCreateRelease && (
        <CreateReleaseDialog
          isOpen={showCreateRelease}
          onClose={() => setShowCreateRelease(false)}
          onCreated={() => {
            setShowCreateRelease(false)
            // File watcher will auto-update releases in store
          }}
        />
      )}

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleStartClaudeCode}
          className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded text-sm font-medium transition-colors shadow-sm hover:shadow-md active:shadow-sm"
        >
          Start Claude Code
        </button>
      </div>
    </div>
  )
}

interface SidebarSectionProps {
  title: string
  defaultOpen?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}

function SidebarSection({ title, defaultOpen = false, action, children }: SidebarSectionProps) {
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
        <div className="flex items-center gap-1">
          {action}
          <svg
            className={`w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-all duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
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

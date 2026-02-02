/**
 * Sidebar.tsx - Main sidebar navigation component
 *
 * @description
 * The Sidebar component provides the primary navigation interface for Tiki Desktop.
 * It displays collapsible sections for projects, execution state, issues, releases,
 * knowledge entries, hooks, commands, and templates. The component also includes
 * action buttons for starting Claude Code and updating the Tiki framework.
 *
 * @dependencies
 * - React: useState, useCallback hooks for local state and memoized callbacks
 * - useTikiStore: Central Zustand store for Tiki state management
 * - window.tikiDesktop.terminal: IPC API for terminal creation and management
 * - window.tikiDesktop.github: IPC API for GitHub issue operations
 * - window.tikiDesktop.templates: IPC API for template management
 * - logger: Application logging utility
 *
 * @storeConnections
 * - tikiState: Current Tiki execution state (status, activeIssue, currentPhase, executions)
 * - currentPlan: The execution plan for the currently active issue
 * - activeProject: The currently selected project context
 * - plans: Map of all loaded execution plans by issue number
 * - setGithubLoading, setGithubError, setIssues: GitHub state mutators
 * - addTerminal, setActiveTerminal, setActiveTab: Terminal and UI state mutators
 *
 * @childComponents
 * - ProjectList: Displays and manages project selection
 * - IssueList: Lists GitHub issues with filtering and selection
 * - ReleaseList: Shows releases with their associated issues
 * - KnowledgeList: Displays project knowledge base entries
 * - KnowledgeEditor: Modal for creating/editing knowledge entries
 * - HooksList: Lists available lifecycle hooks
 * - HookEditor: Modal for creating/editing hooks
 * - CommandsList: Shows custom slash commands
 * - CommandEditor: Modal for creating/editing commands
 * - TemplateList: Displays plan templates
 * - TemplateDetail: Modal showing template details with export/delete actions
 * - CreateTemplateDialog: Modal for creating new templates
 * - CreateReleaseDialog: Modal for creating new releases
 * - SidebarSection: Collapsible section wrapper with title and optional action
 * - ExecutionItem: Renders individual execution progress in multi-execution mode
 *
 * @keyCallbacks
 * - onProjectSwitch: Prop callback invoked when user switches projects
 * - handleStartClaudeCode: Creates terminal, launches Claude with --dangerously-skip-permissions
 * - handleUpdateTiki: Creates terminal, runs /tiki:update-tiki command
 * - handleRefreshIssues: Refreshes GitHub issues via IPC and updates store
 *
 * @utilityFunctions
 * - getStatusColor: Maps execution status to Tailwind background color class
 * - getStatusLabel: Generates human-readable label from tikiState status
 *
 * @props
 * - cwd: string - Current working directory / project path
 * - onProjectSwitch: (project: Project) => void - Callback when project is switched
 */
import { useState, useCallback } from 'react'
import { logger } from '../../lib/logger'
import { useTikiStore, type Project } from '../../stores/tiki-store'
import { IssueList } from '../sidebar/IssueList'
import { ReleaseList } from '../sidebar/ReleaseList'
import { ProjectList } from '../sidebar/ProjectList'
import { KnowledgeList } from '../knowledge/KnowledgeList'
import { KnowledgeEditor } from '../knowledge/KnowledgeEditor'
import { HooksList } from '../hooks/HooksList'
import { HookEditor } from '../hooks/HookEditor'
import { CommandsList, CommandEditor } from '../commands'
import { TemplateList } from '../templates/TemplateList'
import { TemplateDetail } from '../templates/TemplateDetail'
import { CreateTemplateDialog } from '../templates/CreateTemplateDialog'
import { CreateReleaseDialog } from '../releases/CreateReleaseDialog'
import { StateSection } from '../sidebar/StateSection'

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
  const activeProject = useTikiStore((state) => state.activeProject)
  const setGithubLoading = useTikiStore((state) => state.setGithubLoading)
  const setGithubError = useTikiStore((state) => state.setGithubError)
  const setIssues = useTikiStore((state) => state.setIssues)

  const [showKnowledgeEditor, setShowKnowledgeEditor] = useState(false)
  const [knowledgeKey, setKnowledgeKey] = useState(0)
  const [showHookEditor, setShowHookEditor] = useState(false)
  const [hooksKey, setHooksKey] = useState(0)
  const [showCommandEditor, setShowCommandEditor] = useState(false)
  const [commandsKey, setCommandsKey] = useState(0)
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
        status: 'active',
        projectPath: cwd
      })

      // Set the active terminal
      useTikiStore.getState().setActiveTerminal(terminalId)

      // Switch to the terminal tab in the main UI
      useTikiStore.getState().setActiveTab('terminal')

      // Small delay to ensure PTY is fully initialized before writing
      // This prevents crashes on Windows where node-pty may not be ready immediately
      setTimeout(() => {
        window.tikiDesktop.terminal.write(terminalId, 'claude --dangerously-skip-permissions\n')

        // Focus the terminal
        window.dispatchEvent(
          new CustomEvent('terminal:focus', { detail: { id: terminalId } })
        )
      }, 100)
    } catch (error) {
      logger.error('Failed to start Claude Code:', error)
    }
  }, [cwd])

  const handleUpdateTiki = useCallback(async () => {
    if (!cwd) return

    try {
      // Create a new terminal for the Tiki update process
      const terminalId = await window.tikiDesktop.terminal.create(cwd, 'Update Tiki')

      // Add the terminal to the store so it appears in the UI
      useTikiStore.getState().addTerminal({
        id: terminalId,
        name: 'Update Tiki',
        status: 'active',
        projectPath: cwd
      })

      // Set the active terminal
      useTikiStore.getState().setActiveTerminal(terminalId)

      // Switch to the terminal tab in the main UI
      useTikiStore.getState().setActiveTab('terminal')

      // Small delay to ensure PTY is fully initialized before writing
      setTimeout(() => {
        window.tikiDesktop.terminal.write(terminalId, 'claude --dangerously-skip-permissions /tiki:update-tiki\n')

        // Focus the terminal
        window.dispatchEvent(
          new CustomEvent('terminal:focus', { detail: { id: terminalId } })
        )
      }, 100)
    } catch (error) {
      logger.error('Failed to start Tiki update:', error)
    }
  }, [cwd])

  const handleRefreshIssues = useCallback(async () => {
    if (!cwd) return
    setGithubLoading(true)
    setGithubError(null)
    try {
      await window.tikiDesktop.github.refresh(cwd)
      const issues = await window.tikiDesktop.github.getIssues('all', cwd)
      setIssues(issues as never[])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh'
      setGithubError(message)
    } finally {
      setGithubLoading(false)
    }
  }, [cwd, setGithubLoading, setGithubError, setIssues])

  return (
    <div className="h-full bg-background-secondary border-r border-border flex flex-col shadow-sm">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Projects Section */}
        <SidebarSection title="Projects" defaultOpen>
          <ProjectList onProjectSwitch={onProjectSwitch} />
        </SidebarSection>

        {/* State Section - Now uses phasesDisplay from phases.json */}
        <SidebarSection title="State" defaultOpen>
          <StateSection />
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

        {/* Hooks Section */}
        <SidebarSection title="Hooks">
          <HooksList
            key={hooksKey}
            onCreateHook={() => setShowHookEditor(true)}
          />
        </SidebarSection>

        {/* Commands Section */}
        <SidebarSection title="Commands">
          <CommandsList
            key={commandsKey}
            onCreateCommand={() => setShowCommandEditor(true)}
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

      {/* Hook Editor Modal */}
      {showHookEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-secondary border border-border rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <HookEditor
              onCancel={() => setShowHookEditor(false)}
              onSave={() => {
                setShowHookEditor(false)
                setHooksKey((k) => k + 1)
              }}
            />
          </div>
        </div>
      )}

      {/* Command Editor Modal */}
      {showCommandEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-secondary border border-border rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <CommandEditor
              onCancel={() => setShowCommandEditor(false)}
              onSave={() => {
                setShowCommandEditor(false)
                setCommandsKey((k) => k + 1)
              }}
            />
          </div>
        </div>
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
      <div className="p-2 border-t border-border space-y-2">
        <button
          onClick={handleStartClaudeCode}
          className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded text-sm font-medium transition-colors shadow-sm hover:shadow-md active:shadow-sm"
        >
          Start Claude Code
        </button>
        <button
          onClick={handleUpdateTiki}
          className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 active:bg-slate-700 rounded text-sm font-medium transition-colors"
        >
          Install/Update Tiki
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

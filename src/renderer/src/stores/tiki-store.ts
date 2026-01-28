import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

// Types
export interface Project {
  id: string
  name: string
  path: string
}

export interface TikiState {
  activeIssue: number | null
  currentPhase: number | null
  status: 'idle' | 'executing' | 'paused' | 'failed'
  completedPhases: number[]
  lastActivity: string | null
}

export interface ExecutionPlan {
  issue: {
    number: number
    title: string
  }
  status: string
  phases: Array<{
    number: number
    title: string
    status: string
    files: string[]
    verification: string[]
  }>
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  body?: string
  labels?: string[]
}

export interface Release {
  version: string
  status: string
  issues: Array<{
    number: number
    title: string
    status: string
  }>
}

export interface TerminalTab {
  id: string
  name: string
}

type ActiveTab = 'terminal' | 'workflow' | 'config'

interface TikiDesktopState {
  // Projects
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void

  // Tiki State (from file watcher)
  tikiState: TikiState | null
  setTikiState: (state: TikiState | null) => void

  // Current Plan
  currentPlan: ExecutionPlan | null
  setCurrentPlan: (plan: ExecutionPlan | null) => void

  // Plans cache
  plans: Map<number, ExecutionPlan>
  setPlan: (issueNumber: number, plan: ExecutionPlan) => void

  // UI State
  selectedNode: string | null
  setSelectedNode: (nodeId: string | null) => void

  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  detailPanelCollapsed: boolean
  toggleDetailPanel: () => void
  setDetailPanelCollapsed: (collapsed: boolean) => void

  // Terminals
  terminals: TerminalTab[]
  activeTerminal: string | null
  setActiveTerminal: (id: string | null) => void
  addTerminal: (terminal: TerminalTab) => void
  removeTerminal: (id: string) => void

  // GitHub
  issues: GitHubIssue[]
  setIssues: (issues: GitHubIssue[]) => void

  releases: Release[]
  setReleases: (releases: Release[]) => void
  updateRelease: (version: string, release: Release) => void

  // Queue
  queue: unknown[]
  setQueue: (queue: unknown[]) => void
}

export const useTikiStore = create<TikiDesktopState>()(
  devtools(
    persist(
      (set) => ({
        // Projects
        projects: [],
        activeProject: null,
        setActiveProject: (project) => set({ activeProject: project }),
        addProject: (project) =>
          set((state) => ({
            projects: [...state.projects, project]
          })),
        removeProject: (id) =>
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            activeProject: state.activeProject?.id === id ? null : state.activeProject
          })),

        // Tiki State
        tikiState: null,
        setTikiState: (tikiState) => set({ tikiState }),

        // Current Plan
        currentPlan: null,
        setCurrentPlan: (currentPlan) => set({ currentPlan }),

        // Plans cache
        plans: new Map(),
        setPlan: (issueNumber, plan) =>
          set((state) => {
            const newPlans = new Map(state.plans)
            newPlans.set(issueNumber, plan)
            return { plans: newPlans }
          }),

        // UI State
        selectedNode: null,
        setSelectedNode: (selectedNode) => set({ selectedNode }),

        activeTab: 'terminal',
        setActiveTab: (activeTab) => set({ activeTab }),

        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

        detailPanelCollapsed: false,
        toggleDetailPanel: () =>
          set((state) => ({ detailPanelCollapsed: !state.detailPanelCollapsed })),
        setDetailPanelCollapsed: (detailPanelCollapsed) => set({ detailPanelCollapsed }),

        // Terminals
        terminals: [],
        activeTerminal: null,
        setActiveTerminal: (activeTerminal) => set({ activeTerminal }),
        addTerminal: (terminal) =>
          set((state) => ({
            terminals: [...state.terminals, terminal]
          })),
        removeTerminal: (id) =>
          set((state) => ({
            terminals: state.terminals.filter((t) => t.id !== id),
            activeTerminal: state.activeTerminal === id ? null : state.activeTerminal
          })),

        // GitHub
        issues: [],
        setIssues: (issues) => set({ issues }),

        releases: [],
        setReleases: (releases) => set({ releases }),
        updateRelease: (version, release) =>
          set((state) => ({
            releases: state.releases.map((r) => (r.version === version ? release : r))
          })),

        // Queue
        queue: [],
        setQueue: (queue) => set({ queue })
      }),
      {
        name: 'tiki-desktop-storage',
        // Only persist UI preferences, not runtime state
        partialize: (state) => ({
          projects: state.projects,
          activeProject: state.activeProject,
          sidebarCollapsed: state.sidebarCollapsed,
          detailPanelCollapsed: state.detailPanelCollapsed,
          activeTab: state.activeTab
        })
      }
    ),
    { name: 'TikiDesktopStore' }
  )
)

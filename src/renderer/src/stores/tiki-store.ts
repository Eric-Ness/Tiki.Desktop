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
    summary?: string
    error?: string
  }>
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  body?: string
  labels: Array<{ name: string; color: string }>
  url: string
  createdAt: string
  updatedAt: string
  hasPlan?: boolean
}

export interface ReleaseIssue {
  number: number
  title: string
  status: string
  requirements?: string[]
  currentPhase: number | null
  totalPhases: number | null
  completedAt: string | null
}

export interface Release {
  version: string
  createdAt?: string
  status: 'active' | 'shipped' | 'completed' | 'not_planned' | string
  requirementsEnabled?: boolean
  githubMilestone?: {
    number: number
    url: string
  }
  issues: ReleaseIssue[]
  requirements?: {
    total: number
    implemented: number
    verified: number
  }
}

export type TerminalTabStatus = 'active' | 'idle' | 'busy'

export interface TerminalTab {
  id: string
  name: string
  status: TerminalTabStatus
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
  // New terminal tab management actions
  createTab: (name?: string) => string
  closeTab: (id: string) => void
  setActiveTerminalTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  setTabStatus: (id: string, status: TerminalTabStatus) => void
  getTabByIndex: (index: number) => TerminalTab | undefined

  // GitHub
  issues: GitHubIssue[]
  setIssues: (issues: GitHubIssue[]) => void
  githubLoading: boolean
  setGithubLoading: (loading: boolean) => void
  githubError: string | null
  setGithubError: (error: string | null) => void
  selectedIssue: number | null
  setSelectedIssue: (issueNumber: number | null) => void

  releases: Release[]
  setReleases: (releases: Release[]) => void
  updateRelease: (version: string, release: Release) => void
  selectedRelease: string | null
  setSelectedRelease: (version: string | null) => void

  // Queue
  queue: unknown[]
  setQueue: (queue: unknown[]) => void
}

export const useTikiStore = create<TikiDesktopState>()(
  devtools(
    persist(
      (set, get) => ({
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
        // New terminal tab management actions
        createTab: (name) => {
          const id = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const tabName = name || `Terminal ${get().terminals.length + 1}`
          const newTab: TerminalTab = {
            id,
            name: tabName,
            status: 'active'
          }
          set((state) => ({
            terminals: [...state.terminals, newTab],
            activeTerminal: id
          }))
          return id
        },
        closeTab: (id) => {
          set((state) => {
            const remainingTerminals = state.terminals.filter((t) => t.id !== id)

            // If closing the last tab, auto-create a new one
            if (remainingTerminals.length === 0) {
              const newId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              const newTab: TerminalTab = {
                id: newId,
                name: 'Terminal 1',
                status: 'active'
              }
              return {
                terminals: [newTab],
                activeTerminal: newId
              }
            }

            // Switch to another tab if we closed the active one
            const newActiveTerminal =
              state.activeTerminal === id
                ? remainingTerminals[remainingTerminals.length - 1].id
                : state.activeTerminal

            return {
              terminals: remainingTerminals,
              activeTerminal: newActiveTerminal
            }
          })
        },
        setActiveTerminalTab: (id) => {
          set((state) => {
            // Only set active if the tab exists
            const tabExists = state.terminals.some((t) => t.id === id)
            if (tabExists) {
              return { activeTerminal: id }
            }
            return {}
          })
        },
        renameTab: (id, name) => {
          set((state) => ({
            terminals: state.terminals.map((t) => (t.id === id ? { ...t, name } : t))
          }))
        },
        setTabStatus: (id, status) => {
          set((state) => ({
            terminals: state.terminals.map((t) => (t.id === id ? { ...t, status } : t))
          }))
        },
        getTabByIndex: (index) => {
          return get().terminals[index]
        },

        // GitHub
        issues: [],
        setIssues: (issues) => set({ issues }),
        githubLoading: false,
        setGithubLoading: (githubLoading) => set({ githubLoading }),
        githubError: null,
        setGithubError: (githubError) => set({ githubError }),
        selectedIssue: null,
        setSelectedIssue: (selectedIssue) => set({ selectedIssue }),

        releases: [],
        setReleases: (releases) => set({ releases }),
        updateRelease: (version, release) =>
          set((state) => {
            const exists = state.releases.some((r) => r.version === version)
            if (exists) {
              return {
                releases: state.releases.map((r) => (r.version === version ? release : r))
              }
            } else {
              // Add new release and sort (active first, then by version desc)
              const newReleases = [...state.releases, release].sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1
                if (b.status === 'active' && a.status !== 'active') return 1
                return b.version.localeCompare(a.version)
              })
              return { releases: newReleases }
            }
          }),
        selectedRelease: null,
        setSelectedRelease: (selectedRelease) => set({ selectedRelease }),

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

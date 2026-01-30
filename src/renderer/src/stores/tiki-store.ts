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

export interface CachedPrediction {
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  cachedAt: number
}

// Pattern match type for caching (simplified from preload types)
export interface CachedPatternMatch {
  patternId: string
  patternName: string
  confidence: number
  matchedIndicators: string[]
  suggestedMeasuresCount: number
}

// Workspace layout snapshot for store state exposure
export interface LayoutSnapshot {
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  sidebarWidth: number
  detailPanelWidth: number
}

// Workspace state for snapshot creation
export interface WorkspaceStateSnapshot {
  layout: LayoutSnapshot
  activeTab: string
  activeIssue?: number
  currentPhase?: number
  selectedNode: string | null
}

export interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

export interface BranchAssociations {
  [issueNumber: number]: {
    branchName: string
    createdAt: string
  }
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
  projectPath: string
}

// Terminal Split Layout Types
export type SplitDirection = 'horizontal' | 'vertical' | 'none'

export interface TerminalPane {
  id: string
  terminalId: string
  size: number // percentage
}

export interface TerminalLayout {
  direction: SplitDirection
  panes: TerminalPane[]
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
  cleanupOldPlans: () => void

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

  // Terminal Split Layout
  terminalLayout: TerminalLayout
  setTerminalLayout: (layout: TerminalLayout) => void
  splitTerminal: (direction: 'horizontal' | 'vertical') => void
  closeSplit: (paneId: string) => void
  focusedPaneId: string | null
  setFocusedPane: (paneId: string) => void
  moveFocusBetweenPanes: (direction: 'left' | 'right' | 'up' | 'down') => void
  updatePaneTerminal: (paneId: string, terminalId: string) => void

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

  // Recent Commands (for command palette)
  recentCommands: string[]
  addRecentCommand: (commandName: string) => void
  clearRecentCommands: () => void

  // Settings Modal
  settingsModalOpen: boolean
  setSettingsModalOpen: (open: boolean) => void
  toggleSettingsModal: () => void

  // Knowledge
  selectedKnowledge: string | null
  setSelectedKnowledge: (id: string | null) => void

  // Hooks
  selectedHook: string | null
  setSelectedHook: (name: string | null) => void

  // Commands
  selectedCommand: string | null
  setSelectedCommand: (name: string | null) => void

  // Recent Searches (for search functionality)
  recentSearches: string[]
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void

  // Branch State
  currentBranch: BranchInfo | null
  branchAssociations: Record<number, { branchName: string; createdAt: string }>
  branchOperationInProgress: boolean
  setCurrentBranch: (branch: BranchInfo | null) => void
  setBranchAssociations: (
    associations: Record<number, { branchName: string; createdAt: string }>
  ) => void
  associateBranch: (issueNumber: number, branchName: string) => void
  setBranchOperationInProgress: (inProgress: boolean) => void

  // Cost Predictions Cache
  predictions: Record<number, CachedPrediction>
  setPrediction: (issueNumber: number, prediction: CachedPrediction) => void
  getPrediction: (issueNumber: number) => CachedPrediction | undefined
  clearPredictions: () => void

  // Pattern Matches Cache
  patternMatches: Record<number, CachedPatternMatch[]>
  setPatternMatches: (issueNumber: number, matches: CachedPatternMatch[]) => void
  getPatternMatches: (issueNumber: number) => CachedPatternMatch[] | undefined
  clearPatternMatches: () => void

  // Workspace state
  activeWorkspace: string | null
  setActiveWorkspace: (id: string | null) => void
  getWorkspaceState: () => WorkspaceStateSnapshot
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
        cleanupOldPlans: () =>
          set((state) => {
            const MAX_PLANS = 30
            if (state.plans.size > MAX_PLANS) {
              const entries = Array.from(state.plans.entries())
              const toKeep = entries.slice(-MAX_PLANS)
              return { plans: new Map(toKeep) }
            }
            return {}
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

        // Terminal Split Layout
        terminalLayout: {
          direction: 'none',
          panes: [{ id: 'pane-default', terminalId: '', size: 100 }]
        },
        focusedPaneId: 'pane-default',

        setTerminalLayout: (layout) => set({ terminalLayout: layout }),

        splitTerminal: (direction) => {
          set((state) => {
            const currentPanes = state.terminalLayout.panes
            const focusedPane = currentPanes.find((p) => p.id === state.focusedPaneId)
            const currentTerminalId = focusedPane?.terminalId || state.activeTerminal || ''

            // Find another terminal to use for the new pane
            const usedTerminalIds = currentPanes.map((p) => p.terminalId)
            const availableTerminal = state.terminals.find(
              (t) => !usedTerminalIds.includes(t.id)
            )
            const newTerminalId = availableTerminal?.id || currentTerminalId

            // Generate new pane ID
            const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // Calculate new sizes - split existing panes evenly
            const newPaneCount = currentPanes.length + 1
            const newSize = 100 / newPaneCount

            const newPanes = [
              ...currentPanes.map((p) => ({ ...p, size: newSize })),
              { id: newPaneId, terminalId: newTerminalId, size: newSize }
            ]

            return {
              terminalLayout: {
                direction,
                panes: newPanes
              },
              focusedPaneId: newPaneId
            }
          })
        },

        closeSplit: (paneId) => {
          set((state) => {
            const currentPanes = state.terminalLayout.panes

            // Don't remove the last pane
            if (currentPanes.length <= 1) {
              return {}
            }

            const remainingPanes = currentPanes.filter((p) => p.id !== paneId)

            // Recalculate sizes to fill the space
            const newSize = 100 / remainingPanes.length
            const updatedPanes = remainingPanes.map((p) => ({ ...p, size: newSize }))

            // If only one pane remains, reset direction to 'none'
            const newDirection = updatedPanes.length === 1 ? 'none' : state.terminalLayout.direction

            // If closing the focused pane, focus the first remaining pane
            const newFocusedPaneId =
              state.focusedPaneId === paneId
                ? updatedPanes[0]?.id || null
                : state.focusedPaneId

            return {
              terminalLayout: {
                direction: newDirection,
                panes: updatedPanes.length > 0 ? updatedPanes : [{ id: 'pane-default', terminalId: '', size: 100 }]
              },
              focusedPaneId: newFocusedPaneId
            }
          })
        },

        setFocusedPane: (paneId) => {
          set((state) => {
            const paneExists = state.terminalLayout.panes.some((p) => p.id === paneId)
            if (paneExists) {
              return { focusedPaneId: paneId }
            }
            return {}
          })
        },

        moveFocusBetweenPanes: (direction) => {
          set((state) => {
            const { panes, direction: layoutDirection } = state.terminalLayout
            if (panes.length <= 1) return {}

            const currentIndex = panes.findIndex((p) => p.id === state.focusedPaneId)
            if (currentIndex === -1) return {}

            let newIndex = currentIndex

            // For horizontal layout, left/right moves between panes
            // For vertical layout, up/down moves between panes
            if (layoutDirection === 'horizontal') {
              if (direction === 'left') {
                newIndex = currentIndex > 0 ? currentIndex - 1 : panes.length - 1
              } else if (direction === 'right') {
                newIndex = currentIndex < panes.length - 1 ? currentIndex + 1 : 0
              }
            } else if (layoutDirection === 'vertical') {
              if (direction === 'up') {
                newIndex = currentIndex > 0 ? currentIndex - 1 : panes.length - 1
              } else if (direction === 'down') {
                newIndex = currentIndex < panes.length - 1 ? currentIndex + 1 : 0
              }
            }

            return { focusedPaneId: panes[newIndex].id }
          })
        },

        updatePaneTerminal: (paneId, terminalId) => {
          set((state) => ({
            terminalLayout: {
              ...state.terminalLayout,
              panes: state.terminalLayout.panes.map((p) =>
                p.id === paneId ? { ...p, terminalId } : p
              )
            }
          }))
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
        setQueue: (queue) => set({ queue }),

        // Recent Commands (for command palette)
        recentCommands: [],
        addRecentCommand: (commandName) =>
          set((state) => {
            // Remove existing occurrence (for deduplication)
            const filtered = state.recentCommands.filter((cmd) => cmd !== commandName)
            // Add to front, limit to 10
            const updated = [commandName, ...filtered].slice(0, 10)
            return { recentCommands: updated }
          }),
        clearRecentCommands: () => set({ recentCommands: [] }),

        // Settings Modal
        settingsModalOpen: false,
        setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
        toggleSettingsModal: () => set((state) => ({ settingsModalOpen: !state.settingsModalOpen })),

        // Knowledge
        selectedKnowledge: null,
        setSelectedKnowledge: (selectedKnowledge) => set({ selectedKnowledge }),

        // Hooks
        selectedHook: null,
        setSelectedHook: (selectedHook) => set({ selectedHook }),

        // Commands
        selectedCommand: null,
        setSelectedCommand: (selectedCommand) => set({ selectedCommand }),

        // Recent Searches (for search functionality)
        recentSearches: [],
        addRecentSearch: (query) =>
          set((state) => {
            const trimmedQuery = query.trim()
            if (!trimmedQuery) return {}
            // Remove existing occurrence (for deduplication)
            const filtered = state.recentSearches.filter((q) => q !== trimmedQuery)
            // Add to front, limit to 10
            const updated = [trimmedQuery, ...filtered].slice(0, 10)
            return { recentSearches: updated }
          }),
        clearRecentSearches: () => set({ recentSearches: [] }),

        // Branch State
        currentBranch: null,
        branchAssociations: {},
        branchOperationInProgress: false,
        setCurrentBranch: (currentBranch) => set({ currentBranch }),
        setBranchAssociations: (branchAssociations) => set({ branchAssociations }),
        associateBranch: (issueNumber, branchName) =>
          set((state) => ({
            branchAssociations: {
              ...state.branchAssociations,
              [issueNumber]: {
                branchName,
                createdAt: new Date().toISOString()
              }
            }
          })),
        setBranchOperationInProgress: (branchOperationInProgress) => set({ branchOperationInProgress }),

        // Cost Predictions Cache
        predictions: {},
        setPrediction: (issueNumber, prediction) =>
          set((state) => ({
            predictions: {
              ...state.predictions,
              [issueNumber]: prediction
            }
          })),
        getPrediction: (issueNumber) => get().predictions[issueNumber],
        clearPredictions: () => set({ predictions: {} }),

        // Pattern Matches Cache
        patternMatches: {},
        setPatternMatches: (issueNumber, matches) =>
          set((state) => ({
            patternMatches: {
              ...state.patternMatches,
              [issueNumber]: matches
            }
          })),
        getPatternMatches: (issueNumber) => get().patternMatches[issueNumber],
        clearPatternMatches: () => set({ patternMatches: {} }),

        // Workspace state
        activeWorkspace: null,
        setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
        getWorkspaceState: () => {
          const state = get()
          return {
            layout: {
              sidebarCollapsed: state.sidebarCollapsed,
              detailPanelCollapsed: state.detailPanelCollapsed,
              sidebarWidth: 256,
              detailPanelWidth: 320
            },
            activeTab: state.activeTab,
            activeIssue: state.selectedIssue ?? undefined,
            currentPhase: state.tikiState?.currentPhase ?? undefined,
            selectedNode: state.selectedNode
          }
        }
      }),
      {
        name: 'tiki-desktop-storage',
        // Only persist UI preferences, not runtime state
        partialize: (state) => ({
          projects: state.projects,
          activeProject: state.activeProject,
          sidebarCollapsed: state.sidebarCollapsed,
          detailPanelCollapsed: state.detailPanelCollapsed,
          activeTab: state.activeTab,
          recentCommands: state.recentCommands,
          recentSearches: state.recentSearches,
          terminalLayout: state.terminalLayout,
          focusedPaneId: state.focusedPaneId
        })
      }
    ),
    { name: 'TikiDesktopStore' }
  )
)

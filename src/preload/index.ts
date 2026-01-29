import { contextBridge, ipcRenderer } from 'electron'

// Settings type definitions (mirrored from main process for type safety)
export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  fontFamily: string
  accentColor: string
}

export interface TerminalSettings {
  fontSize: number
  fontFamily: string
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  scrollback: number
  copyOnSelect: boolean
  shell: string
}

export interface NotificationsSettings {
  enabled: boolean
  sound: boolean
  phaseComplete: boolean
  issuePlanned: boolean
  issueShipped: boolean
  errors: boolean
}

export interface KeyboardShortcutsSettings {
  toggleSidebar: string
  toggleDetailPanel: string
  commandPalette: string
  openSettings: string
  newTerminal: string
  closeTerminal: string
}

export interface GitHubSettings {
  autoRefresh: boolean
  refreshInterval: number
  defaultIssueState: 'open' | 'closed' | 'all'
}

export interface DataPrivacySettings {
  telemetry: boolean
  crashReports: boolean
  clearDataOnExit: boolean
}

export interface SettingsSchema {
  appearance: AppearanceSettings
  terminal: TerminalSettings
  notifications: NotificationsSettings
  keyboardShortcuts: KeyboardShortcutsSettings
  github: GitHubSettings
  dataPrivacy: DataPrivacySettings
}

export type SettingsCategory = keyof SettingsSchema

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Rollback type definitions (mirrored from main process for type safety)
export type RollbackScope = 'phase' | 'issue' | 'checkpoint'

export interface RollbackTarget {
  issueNumber?: number
  phaseNumber?: number
  checkpointId?: string
}

export interface FileChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  willBe: 'restored' | 'deleted' | 'modified'
  previewAvailable: boolean
}

export interface RollbackWarning {
  type: 'pushed' | 'conflicts' | 'external_commits' | 'merge_commit' | 'dirty_working_tree'
  message: string
  severity: 'low' | 'medium' | 'high'
}

export interface CommitInfo {
  hash: string
  message: string
  timestamp: number
  author?: string
}

export interface RollbackPreview {
  scope: RollbackScope
  targetIssue?: number
  targetPhase?: number
  targetCheckpoint?: string
  commits: CommitInfo[]
  filesAffected: FileChange[]
  linesChanged: { added: number; removed: number }
  warnings: RollbackWarning[]
  canRollback: boolean
  blockingReasons: string[]
}

export interface RollbackOptions {
  method: 'revert' | 'reset'
  updateIssueStatus?: boolean
  pushAfter?: boolean
}

export interface RollbackResult {
  success: boolean
  revertCommits?: string[]
  backupBranch?: string
  error?: string
}

export interface RollbackProgress {
  stage: 'preparing' | 'reverting' | 'resetting' | 'completing'
  current: number
  total: number
  message: string
}

export interface Checkpoint {
  id: string
  name: string
  commitHash: string
  issueNumber?: number
  createdAt: number
  description?: string
}

export type CommitSource = 'tiki' | 'external' | 'unknown'

// Failure analysis type definitions (mirrored from main process for type safety)
export type ErrorCategory =
  | 'syntax'
  | 'test'
  | 'dependency'
  | 'timeout'
  | 'permission'
  | 'network'
  | 'resource'
  | 'unknown'

export interface ErrorClassification {
  patternId: string
  category: ErrorCategory
  confidence: number
  matchedText: string
  context: {
    line?: number
    file?: string
  }
}

export type RetryAction = 'redo' | 'redo-with-context' | 'skip' | 'rollback-and-redo' | 'manual'

export interface RetryStrategy {
  id: string
  name: string
  description: string
  confidence: number
  applicableTo: string[]
  action: RetryAction
  contextHints?: string[]
}

export interface FailureContext {
  files: string[]
  lastCommand?: string
  terminalOutput?: string
}

export interface FailureAnalysis {
  phaseNumber: number
  issueNumber: number
  timestamp: number
  errorText: string
  classifications: ErrorClassification[]
  primaryClassification: ErrorClassification | null
  suggestedStrategies: RetryStrategy[]
  context: FailureContext
}

export interface GeneratedCommand {
  command: string
  sequence: number
  description: string
}

export type ExecutionOutcome = 'pending' | 'success' | 'failure' | 'cancelled'

export interface StrategyExecution {
  id: string
  strategyId: string
  issueNumber: number
  phaseNumber: number
  startedAt: number
  completedAt: number | null
  outcome: ExecutionOutcome
  resultPhaseStatus?: string
  notes?: string
  commands?: GeneratedCommand[]
}

export interface LearningStats {
  totalRecords: number
  successRate: number
  topStrategies: Array<{
    strategyId: string
    successCount: number
    totalCount: number
    successRate: number
  }>
}

export interface RecordContext {
  projectPath: string
  issueNumber: number
  phaseNumber: number
  errorSignature: string
}

// Search type definitions (mirrored from main process for type safety)
export type ContentType = 'issue' | 'plan' | 'release' | 'knowledge'

export interface SearchableContent {
  type: ContentType
  id: string
  title: string
  body?: string
  labels?: string[]
  tags?: string[]
}

export interface SearchResult {
  type: ContentType
  id: string
  title: string
  preview: string
  matches: string[]
  score: number
}

export interface SearchOptions {
  types?: ContentType[]
  limit?: number
}

// Template type definitions (mirrored from main process for type safety)
export type VariableType = 'string' | 'file' | 'component' | 'number'
export type TemplateCategory = 'issue_type' | 'component' | 'workflow' | 'custom'

export interface TemplateVariable {
  name: string
  description: string
  type: VariableType
  defaultValue?: string
  required: boolean
}

export interface PhaseTemplate {
  title: string
  content: string
  filePatterns: string[]
  verification: string[]
}

export interface MatchCriteria {
  keywords: string[]
  labels: string[]
  filePatterns: string[]
}

export interface PlanTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: PhaseTemplate[]
  variables: TemplateVariable[]
  matchCriteria: MatchCriteria
  sourceIssue?: number
  successCount: number
  failureCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

export interface TemplateFilter {
  category?: TemplateCategory
  tags?: string[]
}

export interface CreateTemplateInput {
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  phases: PhaseTemplate[]
  variables: TemplateVariable[]
  matchCriteria: MatchCriteria
  sourceIssue?: number
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: TemplateCategory
  tags?: string[]
  phases?: PhaseTemplate[]
  variables?: TemplateVariable[]
  matchCriteria?: MatchCriteria
  sourceIssue?: number | null
}

export interface TemplateSuggestion {
  template: PlanTemplate
  matchScore: number
  matchReasons: string[]
}

export interface AppliedTemplate {
  issueNumber: number
  phases: Array<{
    number: number
    title: string
    content: string
    filePatterns: string[]
    verification: string[]
  }>
  sourceTemplateId: string
  variablesUsed: Record<string, string>
}

export interface ExecutionPlanForTemplate {
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

export interface CommitTracking {
  commitHash: string
  issueNumber: number
  phaseNumber?: number
  timestamp: number
  message: string
  source: CommitSource
  parentHashes: string[]
  isMergeCommit: boolean
}

// Update status type (mirrored from main process for type safety)
export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('tikiDesktop', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getCwd: () => ipcRenderer.invoke('app:cwd'),
  getGitBranch: (cwd?: string) => ipcRenderer.invoke('git:branch', cwd),

  // Platform info
  platform: process.platform,

  // Updates API
  updates: {
    check: () => ipcRenderer.invoke('app:check-updates'),
    download: () => ipcRenderer.invoke('app:download-update'),
    install: () => ipcRenderer.invoke('app:install-update'),
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const handler = (_: unknown, status: UpdateStatus) => callback(status)
      ipcRenderer.on('app:update-status', handler)
      return () => ipcRenderer.removeListener('app:update-status', handler)
    }
  },

  // Terminal API (to be implemented in #2)
  terminal: {
    create: (cwd: string, name?: string, projectPath?: string) =>
      ipcRenderer.invoke('terminal:create', { cwd, name, projectPath }),
    write: (id: string, data: string) =>
      ipcRenderer.send('terminal:write', { id, data }),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', { id, cols, rows }),
    kill: (id: string) =>
      ipcRenderer.invoke('terminal:kill', { id }),
    rename: (id: string, name: string) =>
      ipcRenderer.invoke('terminal:rename', { id, name }),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_: unknown, { id, data }: { id: string; data: string }) => callback(id, data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    onExit: (callback: (id: string, code: number) => void) => {
      const handler = (_: unknown, { id, code }: { id: string; code: number }) => callback(id, code)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.removeListener('terminal:exit', handler)
    },
    onStatusChange: (callback: (id: string, status: 'idle' | 'running') => void) => {
      const handler = (_: unknown, { id, status }: { id: string; status: 'idle' | 'running' }) => callback(id, status)
      ipcRenderer.on('terminal:status-changed', handler)
      return () => ipcRenderer.removeListener('terminal:status-changed', handler)
    },
    // Session persistence
    getPersistedState: () => ipcRenderer.invoke('terminal:get-persisted-state'),
    restoreSession: () => ipcRenderer.invoke('terminal:restore-session'),
    clearPersistedState: () => ipcRenderer.invoke('terminal:clear-persisted-state'),
    isRestored: (id: string) => ipcRenderer.invoke('terminal:is-restored', { id }),
    setPersistenceEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('terminal:set-persistence-enabled', { enabled })
  },

  // Tiki state API
  tiki: {
    watch: (path: string) => ipcRenderer.invoke('tiki:watch', { path }),
    unwatch: () => ipcRenderer.invoke('tiki:unwatch'),
    onStateChange: (callback: (state: unknown) => void) => {
      const handler = (_: unknown, state: unknown) => callback(state)
      ipcRenderer.on('tiki:state-changed', handler)
      return () => ipcRenderer.removeListener('tiki:state-changed', handler)
    },
    onPlanChange: (callback: (data: { filename: string; plan: unknown }) => void) => {
      const handler = (_: unknown, data: { filename: string; plan: unknown }) => callback(data)
      ipcRenderer.on('tiki:plan-changed', handler)
      return () => ipcRenderer.removeListener('tiki:plan-changed', handler)
    },
    onQueueChange: (callback: (queue: unknown) => void) => {
      const handler = (_: unknown, queue: unknown) => callback(queue)
      ipcRenderer.on('tiki:queue-changed', handler)
      return () => ipcRenderer.removeListener('tiki:queue-changed', handler)
    },
    onReleaseChange: (callback: (data: { filename: string; release: unknown }) => void) => {
      const handler = (_: unknown, data: { filename: string; release: unknown }) => callback(data)
      ipcRenderer.on('tiki:release-changed', handler)
      return () => ipcRenderer.removeListener('tiki:release-changed', handler)
    },
    onBranchesChange: (callback: (branches: unknown) => void) => {
      const handler = (_: unknown, branches: unknown) => callback(branches)
      ipcRenderer.on('tiki:branches-changed', handler)
      return () => ipcRenderer.removeListener('tiki:branches-changed', handler)
    },
    getState: () => ipcRenderer.invoke('tiki:get-state'),
    getPlan: (issueNumber: number) => ipcRenderer.invoke('tiki:get-plan', issueNumber),
    getQueue: () => ipcRenderer.invoke('tiki:get-queue'),
    getReleases: () => ipcRenderer.invoke('tiki:get-releases'),
    getBranches: () => ipcRenderer.invoke('tiki:get-branches'),
    getCommands: (cwd?: string) => ipcRenderer.invoke('tiki:get-commands', { cwd }),
    createRelease: (data: { version: string; issues: Array<{ number: number; title: string }> }) =>
      ipcRenderer.invoke('tiki:create-release', data),
    recommendReleaseIssues: (data: {
      issues: Array<{ number: number; title: string; body?: string; labels?: string[] }>
      version: string
    }) => ipcRenderer.invoke('tiki:recommend-release-issues', data),
    // Notification click handler
    onNotificationClick: (
      callback: (data: {
        event: string
        context?: { issueNumber?: number; phaseNumber?: number }
      }) => void
    ) => {
      const handler = (
        _: unknown,
        data: { event: string; context?: { issueNumber?: number; phaseNumber?: number } }
      ) => callback(data)
      ipcRenderer.on('notification:clicked', handler)
      return () => ipcRenderer.removeListener('notification:clicked', handler)
    }
  },

  // Projects API
  projects: {
    pickFolder: () => ipcRenderer.invoke('projects:pick-folder'),
    validatePath: (path: string) => ipcRenderer.invoke('projects:validate-path', { path }),
    switchProject: (path: string) => ipcRenderer.invoke('projects:switch', { path }),
    onSwitched: (callback: (data: { path: string }) => void) => {
      const handler = (_: unknown, data: { path: string }) => callback(data)
      ipcRenderer.on('projects:switched', handler)
      return () => ipcRenderer.removeListener('projects:switched', handler)
    }
  },

  // Git API (for diff viewing)
  git: {
    getFileDiff: (cwd: string, filePath: string, fromRef?: string, toRef?: string) =>
      ipcRenderer.invoke('git:get-file-diff', { cwd, filePath, fromRef, toRef }),
    getChangedFiles: (cwd: string, fromRef?: string, toRef?: string) =>
      ipcRenderer.invoke('git:get-changed-files', { cwd, fromRef, toRef }),
    getDiffStats: (cwd: string, fromRef?: string, toRef?: string) =>
      ipcRenderer.invoke('git:get-diff-stats', { cwd, fromRef, toRef })
  },

  // Branch API (for branch management)
  branch: {
    list: (cwd: string) => ipcRenderer.invoke('branch:list', { cwd }),
    current: (cwd: string) => ipcRenderer.invoke('branch:current', { cwd }),
    create: (cwd: string, options: { name: string; checkout?: boolean; baseBranch?: string }) =>
      ipcRenderer.invoke('branch:create', { cwd, options }),
    switch: (
      cwd: string,
      branchName: string,
      options?: { stash?: boolean; discard?: boolean }
    ) => ipcRenderer.invoke('branch:switch', { cwd, branchName, options }),
    delete: (cwd: string, branchName: string, force?: boolean) =>
      ipcRenderer.invoke('branch:delete', { cwd, branchName, force }),
    push: (cwd: string, branchName: string) =>
      ipcRenderer.invoke('branch:push', { cwd, branchName }),
    workingTreeStatus: (cwd: string) =>
      ipcRenderer.invoke('branch:working-tree-status', { cwd }),
    associateIssue: (cwd: string, branchName: string, issueNumber: number) =>
      ipcRenderer.invoke('branch:associate-issue', { cwd, branchName, issueNumber }),
    getForIssue: (cwd: string, issueNumber: number) =>
      ipcRenderer.invoke('branch:get-for-issue', { cwd, issueNumber }),
    generateName: (issue: { number: number; title: string; type?: string }, pattern?: string) =>
      ipcRenderer.invoke('branch:generate-name', { issue, pattern })
  },

  // GitHub API
  github: {
    checkCli: () => ipcRenderer.invoke('github:check-cli'),
    getIssues: (state?: 'open' | 'closed' | 'all', cwd?: string) =>
      ipcRenderer.invoke('github:get-issues', { state, cwd }),
    getIssue: (number: number, cwd?: string) =>
      ipcRenderer.invoke('github:get-issue', { number, cwd }),
    refresh: (cwd?: string) => ipcRenderer.invoke('github:refresh', { cwd }),
    openInBrowser: (number: number, cwd?: string) =>
      ipcRenderer.invoke('github:open-in-browser', { number, cwd }),
    getPRForIssue: (issueNumber: number) =>
      ipcRenderer.invoke('github:get-pr-for-issue', issueNumber),
    getPRChecks: (prNumber: number) =>
      ipcRenderer.invoke('github:get-pr-checks', prNumber),
    onIssuesUpdated: (callback: (issues: unknown[]) => void) => {
      const handler = (_: unknown, issues: unknown[]) => callback(issues)
      ipcRenderer.on('github:issues-updated', handler)
      return () => ipcRenderer.removeListener('github:issues-updated', handler)
    },
    onError: (callback: (error: { error: string }) => void) => {
      const handler = (_: unknown, error: { error: string }) => callback(error)
      ipcRenderer.on('github:error', handler)
      return () => ipcRenderer.removeListener('github:error', handler)
    },
    createIssue: (
      input: { title: string; body?: string; labels?: string[]; assignees?: string[]; milestone?: string },
      cwd?: string
    ) => ipcRenderer.invoke('github:create-issue', { input, cwd }),
    getLabels: (cwd?: string) => ipcRenderer.invoke('github:get-labels', { cwd }),
    onIssueCreated: (callback: (issue: unknown) => void) => {
      const handler = (_: unknown, issue: unknown) => callback(issue)
      ipcRenderer.on('github:issue-created', handler)
      return () => ipcRenderer.removeListener('github:issue-created', handler)
    }
  },

  // Shell API for opening external URLs
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
  },

  // Settings API
  settings: {
    get: <K extends SettingsCategory>(category?: K) =>
      ipcRenderer.invoke('settings:get', { category }),
    set: (settings: DeepPartial<SettingsSchema>) =>
      ipcRenderer.invoke('settings:set', { settings }),
    reset: (category?: SettingsCategory) => ipcRenderer.invoke('settings:reset', { category }),
    export: () => ipcRenderer.invoke('settings:export'),
    import: () => ipcRenderer.invoke('settings:import'),
    onChange: (callback: (settings: SettingsSchema) => void) => {
      const handler = (_: unknown, settings: SettingsSchema) => callback(settings)
      ipcRenderer.on('settings:changed', handler)
      return () => ipcRenderer.removeListener('settings:changed', handler)
    }
  },

  // Config API (for .tiki/config.json)
  config: {
    read: (projectPath: string) => ipcRenderer.invoke('config:read', { projectPath }),
    write: (projectPath: string, config: unknown) =>
      ipcRenderer.invoke('config:write', { projectPath, config }),
    validate: (config: unknown) => ipcRenderer.invoke('config:validate', { config }),
    reset: (projectPath: string) => ipcRenderer.invoke('config:reset', { projectPath })
  },

  // Usage API (for API cost tracking)
  usage: {
    addRecord: (record: {
      inputTokens: number
      outputTokens: number
      model: string
      sessionId: string
      issueNumber?: number
    }) => ipcRenderer.invoke('usage:add-record', record),
    getSummary: (since?: string) => ipcRenderer.invoke('usage:get-summary', since),
    getRecords: (since?: string) => ipcRenderer.invoke('usage:get-records', since),
    clear: () => ipcRenderer.invoke('usage:clear'),
    getIssueUsage: (issueNumber: number) =>
      ipcRenderer.invoke('usage:get-issue-usage', issueNumber),
    getSessionUsage: (sessionId: string) =>
      ipcRenderer.invoke('usage:get-session-usage', sessionId),
    getDailyUsage: (days?: number) => ipcRenderer.invoke('usage:get-daily-usage', days)
  },

  // Knowledge API (for .tiki/knowledge/)
  knowledge: {
    list: (
      projectPath: string,
      options?: { category?: string; search?: string }
    ) =>
      ipcRenderer.invoke('knowledge:list', {
        projectPath,
        category: options?.category,
        search: options?.search
      }),
    get: (projectPath: string, id: string) =>
      ipcRenderer.invoke('knowledge:get', { projectPath, id }),
    create: (
      projectPath: string,
      data: {
        title: string
        category: string
        content: string
        tags?: string[]
        sourceIssue?: number
      }
    ) => ipcRenderer.invoke('knowledge:create', { projectPath, ...data }),
    update: (
      projectPath: string,
      id: string,
      data: Partial<{
        title: string
        category: string
        content: string
        tags: string[]
        sourceIssue: number | null
      }>
    ) => ipcRenderer.invoke('knowledge:update', { projectPath, id, data }),
    delete: (projectPath: string, id: string) =>
      ipcRenderer.invoke('knowledge:delete', { projectPath, id }),
    tags: (projectPath: string) =>
      ipcRenderer.invoke('knowledge:tags', { projectPath })
  },

  // Search API (for cross-content search)
  search: {
    query: (query: string, options?: SearchOptions) =>
      ipcRenderer.invoke('search:query', { query, options }),
    updateIndex: (type: ContentType, items: SearchableContent[]) =>
      ipcRenderer.invoke('search:update-index', { type, items }),
    clearIndex: () => ipcRenderer.invoke('search:clear-index')
  },

  // Rollback API (for smart rollback with preview)
  rollback: {
    preview: (
      cwd: string,
      scope: RollbackScope,
      target: RollbackTarget
    ) => ipcRenderer.invoke('rollback:preview', { scope, target, cwd }),
    execute: (
      cwd: string,
      scope: RollbackScope,
      target: RollbackTarget,
      options: RollbackOptions
    ) => ipcRenderer.invoke('rollback:execute', { scope, target, options, cwd }),
    getIssueCommits: (cwd: string, issueNumber: number) =>
      ipcRenderer.invoke('rollback:get-issue-commits', { cwd, issueNumber }),
    getPhaseCommits: (cwd: string, issueNumber: number, phaseNumber: number) =>
      ipcRenderer.invoke('rollback:get-phase-commits', { cwd, issueNumber, phaseNumber }),
    onProgress: (
      callback: (data: RollbackProgress) => void
    ) => {
      const handler = (_: unknown, data: RollbackProgress) => callback(data)
      ipcRenderer.on('rollback:progress', handler)
      return () => ipcRenderer.removeListener('rollback:progress', handler)
    },
    // Checkpoint methods
    createCheckpoint: (
      cwd: string,
      name: string,
      issueNumber?: number,
      description?: string
    ) =>
      ipcRenderer.invoke('rollback:create-checkpoint', { name, issueNumber, cwd, description }),
    listCheckpoints: (cwd: string) =>
      ipcRenderer.invoke('rollback:list-checkpoints', { cwd }),
    deleteCheckpoint: (cwd: string, id: string) =>
      ipcRenderer.invoke('rollback:delete-checkpoint', { id, cwd }),
    toCheckpoint: (cwd: string, id: string, options: RollbackOptions) =>
      ipcRenderer.invoke('rollback:to-checkpoint', { id, options, cwd }),
    onCheckpointsChange: (callback: (checkpoints: Checkpoint[]) => void) => {
      const handler = (_: unknown, data: { checkpoints: Checkpoint[] }) =>
        callback(data?.checkpoints || [])
      ipcRenderer.on('tiki:checkpoints-changed', handler)
      return () => ipcRenderer.removeListener('tiki:checkpoints-changed', handler)
    }
  },

  // Templates API (for reusable plan templates)
  templates: {
    list: (projectPath: string, filter?: TemplateFilter) =>
      ipcRenderer.invoke('templates:list', { projectPath, filter }),
    get: (projectPath: string, id: string) =>
      ipcRenderer.invoke('templates:get', { projectPath, id }),
    create: (projectPath: string, input: CreateTemplateInput) =>
      ipcRenderer.invoke('templates:create', { projectPath, input }),
    createFromPlan: (
      projectPath: string,
      plan: ExecutionPlanForTemplate,
      name: string,
      description: string,
      category: TemplateCategory,
      tags: string[]
    ) =>
      ipcRenderer.invoke('templates:create-from-plan', {
        projectPath,
        plan,
        name,
        description,
        category,
        tags
      }),
    update: (projectPath: string, id: string, updates: UpdateTemplateInput) =>
      ipcRenderer.invoke('templates:update', { projectPath, id, updates }),
    delete: (projectPath: string, id: string) =>
      ipcRenderer.invoke('templates:delete', { projectPath, id }),
    apply: (
      projectPath: string,
      templateId: string,
      variables: Record<string, string>,
      issueNumber: number
    ) =>
      ipcRenderer.invoke('templates:apply', { projectPath, templateId, variables, issueNumber }),
    suggest: (
      projectPath: string,
      issueTitle: string,
      issueBody?: string,
      issueLabels?: string[]
    ) =>
      ipcRenderer.invoke('templates:suggest', { projectPath, issueTitle, issueBody, issueLabels }),
    recordUsage: (projectPath: string, id: string, success: boolean) =>
      ipcRenderer.invoke('templates:record-usage', { projectPath, id, success }),
    export: (projectPath: string, id: string) =>
      ipcRenderer.invoke('templates:export', { projectPath, id }),
    import: (projectPath: string, json: string) =>
      ipcRenderer.invoke('templates:import', { projectPath, json }),
    extractVariables: (plan: ExecutionPlanForTemplate) =>
      ipcRenderer.invoke('templates:extract-variables', { plan })
  },

  // Failure Analysis API (for smart retry strategies)
  failure: {
    analyze: (
      issueNumber: number,
      phaseNumber: number,
      errorText: string,
      context: FailureContext
    ) =>
      ipcRenderer.invoke('failure:analyze', { issueNumber, phaseNumber, errorText, context }),
    getStrategies: (classification: ErrorClassification) =>
      ipcRenderer.invoke('failure:get-strategies', { classification }),
    executeStrategy: (
      strategy: RetryStrategy,
      issueNumber: number,
      phaseNumber: number,
      cwd: string
    ) =>
      ipcRenderer.invoke('failure:execute-strategy', { strategy, issueNumber, phaseNumber, cwd }),
    getExecutionStatus: (executionId: string) =>
      ipcRenderer.invoke('failure:get-execution-status', { executionId }),
    cancelExecution: (executionId: string) =>
      ipcRenderer.invoke('failure:cancel-execution', { executionId }),
    recordOutcome: (
      patternId: string,
      strategyId: string,
      outcome: 'success' | 'failure',
      context: RecordContext
    ) =>
      ipcRenderer.invoke('failure:record-outcome', { patternId, strategyId, outcome, context }),
    getLearningStats: (projectPath: string) =>
      ipcRenderer.invoke('failure:get-learning-stats', { projectPath })
  }
})

// Update status type for renderer
type UpdateStatusType =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

// Type declaration for renderer
declare global {
  interface Window {
    tikiDesktop: {
      getVersion: () => Promise<string>
      getCwd: () => Promise<string>
      getGitBranch: (cwd?: string) => Promise<string | null>
      platform: string
      updates: {
        check: () => Promise<void>
        download: () => Promise<void>
        install: () => Promise<void>
        onStatus: (callback: (status: UpdateStatusType) => void) => () => void
      }
      terminal: {
        create: (cwd: string, name?: string, projectPath?: string) => Promise<string>
        write: (id: string, data: string) => void
        resize: (id: string, cols: number, rows: number) => void
        kill: (id: string) => Promise<void>
        rename: (id: string, name: string) => Promise<boolean>
        onData: (callback: (id: string, data: string) => void) => () => void
        onExit: (callback: (id: string, code: number) => void) => () => void
        onStatusChange: (callback: (id: string, status: 'idle' | 'running') => void) => () => void
        // Session persistence
        getPersistedState: () => Promise<PersistedTerminalState | null>
        restoreSession: () => Promise<RestoreSessionResult>
        clearPersistedState: () => Promise<{ success: boolean }>
        isRestored: (id: string) => Promise<boolean>
        setPersistenceEnabled: (enabled: boolean) => Promise<{ success: boolean }>
      }
      tiki: {
        watch: (path: string) => Promise<boolean>
        unwatch: () => Promise<boolean>
        onStateChange: (callback: (state: unknown) => void) => () => void
        onPlanChange: (callback: (data: { filename: string; plan: unknown }) => void) => () => void
        onQueueChange: (callback: (queue: unknown) => void) => () => void
        onReleaseChange: (callback: (data: { filename: string; release: unknown }) => void) => () => void
        onBranchesChange: (callback: (branches: unknown) => void) => () => void
        getState: () => Promise<unknown>
        getPlan: (issueNumber: number) => Promise<unknown>
        getQueue: () => Promise<unknown>
        getReleases: () => Promise<unknown[]>
        getBranches: () => Promise<Record<number, { branchName: string; createdAt: string }> | null>
        getCommands: (cwd?: string) => Promise<Array<{
          name: string
          displayName: string
          description: string
          argumentHint?: string
        }>>
        createRelease: (data: {
          version: string
          issues: Array<{ number: number; title: string }>
        }) => Promise<{ success: boolean; error?: string }>
        recommendReleaseIssues: (data: {
          issues: Array<{ number: number; title: string; body?: string; labels?: string[] }>
          version: string
        }) => Promise<
          | {
              recommendations: Array<{
                number: number
                title: string
                reasoning: string
                includeInRelease: boolean
              }>
              summary: string
            }
          | { error: string }
        >
        onNotificationClick: (
          callback: (data: {
            event: string
            context?: { issueNumber?: number; phaseNumber?: number }
          }) => void
        ) => () => void
      }
      projects: {
        pickFolder: () => Promise<{ id: string; name: string; path: string } | null>
        validatePath: (path: string) => Promise<{ valid: boolean; error?: string }>
        switchProject: (path: string) => Promise<{ success: boolean; error?: string }>
        onSwitched: (callback: (data: { path: string }) => void) => () => void
      }
      git: {
        getFileDiff: (
          cwd: string,
          filePath: string,
          fromRef?: string,
          toRef?: string
        ) => Promise<string>
        getChangedFiles: (
          cwd: string,
          fromRef?: string,
          toRef?: string
        ) => Promise<
          Array<{
            path: string
            status: 'added' | 'modified' | 'deleted'
            additions: number
            deletions: number
          }>
        >
        getDiffStats: (
          cwd: string,
          fromRef?: string,
          toRef?: string
        ) => Promise<{
          files: Array<{
            path: string
            status: 'added' | 'modified' | 'deleted'
            additions: number
            deletions: number
          }>
          totalAdditions: number
          totalDeletions: number
          totalFiles: number
        }>
      }
      branch: {
        list: (cwd: string) => Promise<BranchInfo[]>
        current: (cwd: string) => Promise<BranchInfo>
        create: (
          cwd: string,
          options: { name: string; checkout?: boolean; baseBranch?: string }
        ) => Promise<GitOperationResult>
        switch: (
          cwd: string,
          branchName: string,
          options?: { stash?: boolean; discard?: boolean }
        ) => Promise<GitOperationResult>
        delete: (cwd: string, branchName: string, force?: boolean) => Promise<GitOperationResult>
        push: (cwd: string, branchName: string) => Promise<GitOperationResult>
        workingTreeStatus: (cwd: string) => Promise<WorkingTreeStatus>
        associateIssue: (
          cwd: string,
          branchName: string,
          issueNumber: number
        ) => Promise<{ success: boolean; error?: string }>
        getForIssue: (
          cwd: string,
          issueNumber: number
        ) => Promise<{ branchName: string; createdAt: string } | null>
        generateName: (
          issue: { number: number; title: string; type?: string },
          pattern?: string
        ) => Promise<string>
      }
      github: {
        checkCli: () => Promise<{ available: boolean; authenticated: boolean; error?: string }>
        getIssues: (state?: 'open' | 'closed' | 'all', cwd?: string) => Promise<unknown[]>
        getIssue: (number: number, cwd?: string) => Promise<unknown>
        refresh: (cwd?: string) => Promise<void>
        openInBrowser: (number: number, cwd?: string) => Promise<void>
        getPRForIssue: (issueNumber: number) => Promise<PullRequest | null>
        getPRChecks: (prNumber: number) => Promise<CheckStatus[]>
        onIssuesUpdated: (callback: (issues: unknown[]) => void) => () => void
        onError: (callback: (error: { error: string }) => void) => () => void
        createIssue: (
          input: { title: string; body?: string; labels?: string[]; assignees?: string[]; milestone?: string },
          cwd?: string
        ) => Promise<unknown>
        getLabels: (cwd?: string) => Promise<Array<{ name: string; color: string }>>
        onIssueCreated: (callback: (issue: unknown) => void) => () => void
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      settings: {
        get: {
          (): Promise<SettingsSchema>
          <K extends SettingsCategory>(category: K): Promise<SettingsSchema[K]>
        }
        set: (settings: DeepPartial<SettingsSchema>) => Promise<SettingsSchema>
        reset: (category?: SettingsCategory) => Promise<SettingsSchema>
        export: () => Promise<{ success: boolean; path?: string; error?: string }>
        import: () => Promise<{ success: boolean; error?: string }>
        onChange: (callback: (settings: SettingsSchema) => void) => () => void
      }
      config: {
        read: (projectPath: string) => Promise<{
          config: TikiConfig
          exists: boolean
          error?: string
        }>
        write: (projectPath: string, config: TikiConfig) => Promise<{
          success: boolean
          error?: string
        }>
        validate: (config: unknown) => Promise<{
          valid: boolean
          errors: string[]
          config?: TikiConfig
        }>
        reset: (projectPath: string) => Promise<{
          success: boolean
          config: TikiConfig
          error?: string
        }>
      }
      usage: {
        addRecord: (record: {
          inputTokens: number
          outputTokens: number
          model: string
          sessionId: string
          issueNumber?: number
        }) => Promise<void>
        getSummary: (since?: string) => Promise<UsageSummary>
        getRecords: (since?: string) => Promise<UsageRecord[]>
        clear: () => Promise<void>
        getIssueUsage: (issueNumber: number) => Promise<UsageSummary>
        getSessionUsage: (sessionId: string) => Promise<UsageSummary>
        getDailyUsage: (days?: number) => Promise<DailyUsage[]>
      }
      knowledge: {
        list: (
          projectPath: string,
          options?: { category?: string; search?: string }
        ) => Promise<KnowledgeEntry[]>
        get: (projectPath: string, id: string) => Promise<KnowledgeEntry | null>
        create: (
          projectPath: string,
          data: {
            title: string
            category: string
            content: string
            tags?: string[]
            sourceIssue?: number
          }
        ) => Promise<KnowledgeEntry>
        update: (
          projectPath: string,
          id: string,
          data: Partial<{
            title: string
            category: string
            content: string
            tags: string[]
            sourceIssue: number | null
          }>
        ) => Promise<KnowledgeEntry | null>
        delete: (projectPath: string, id: string) => Promise<boolean>
        tags: (projectPath: string) => Promise<string[]>
      }
      search: {
        query: (query: string, options?: SearchOptions) => Promise<SearchResult[]>
        updateIndex: (type: ContentType, items: SearchableContent[]) => Promise<{ success: boolean }>
        clearIndex: () => Promise<{ success: boolean }>
      }
      rollback: {
        preview: (
          cwd: string,
          scope: RollbackScope,
          target: RollbackTarget
        ) => Promise<RollbackPreview>
        execute: (
          cwd: string,
          scope: RollbackScope,
          target: RollbackTarget,
          options: RollbackOptions
        ) => Promise<RollbackResult>
        getIssueCommits: (cwd: string, issueNumber: number) => Promise<CommitTracking[]>
        getPhaseCommits: (
          cwd: string,
          issueNumber: number,
          phaseNumber: number
        ) => Promise<CommitTracking[]>
        onProgress: (callback: (data: RollbackProgress) => void) => () => void
        // Checkpoint methods
        createCheckpoint: (
          cwd: string,
          name: string,
          issueNumber?: number,
          description?: string
        ) => Promise<Checkpoint>
        listCheckpoints: (cwd: string) => Promise<Checkpoint[]>
        deleteCheckpoint: (cwd: string, id: string) => Promise<boolean>
        toCheckpoint: (cwd: string, id: string, options: RollbackOptions) => Promise<RollbackResult>
        onCheckpointsChange: (callback: (checkpoints: Checkpoint[]) => void) => () => void
      }
      failure: {
        analyze: (
          issueNumber: number,
          phaseNumber: number,
          errorText: string,
          context: FailureContext
        ) => Promise<FailureAnalysis>
        getStrategies: (classification: ErrorClassification) => Promise<RetryStrategy[]>
        executeStrategy: (
          strategy: RetryStrategy,
          issueNumber: number,
          phaseNumber: number,
          cwd: string
        ) => Promise<StrategyExecution>
        getExecutionStatus: (executionId: string) => Promise<StrategyExecution | null>
        cancelExecution: (executionId: string) => Promise<boolean>
        recordOutcome: (
          patternId: string,
          strategyId: string,
          outcome: 'success' | 'failure',
          context: RecordContext
        ) => Promise<void>
        getLearningStats: (projectPath: string) => Promise<LearningStats>
      }
      templates: {
        list: (projectPath: string, filter?: TemplateFilter) => Promise<PlanTemplate[]>
        get: (projectPath: string, id: string) => Promise<PlanTemplate | null>
        create: (projectPath: string, input: CreateTemplateInput) => Promise<PlanTemplate>
        createFromPlan: (
          projectPath: string,
          plan: ExecutionPlanForTemplate,
          name: string,
          description: string,
          category: TemplateCategory,
          tags: string[]
        ) => Promise<PlanTemplate>
        update: (
          projectPath: string,
          id: string,
          updates: UpdateTemplateInput
        ) => Promise<PlanTemplate | null>
        delete: (projectPath: string, id: string) => Promise<boolean>
        apply: (
          projectPath: string,
          templateId: string,
          variables: Record<string, string>,
          issueNumber: number
        ) => Promise<AppliedTemplate | null>
        suggest: (
          projectPath: string,
          issueTitle: string,
          issueBody?: string,
          issueLabels?: string[]
        ) => Promise<TemplateSuggestion[]>
        recordUsage: (projectPath: string, id: string, success: boolean) => Promise<void>
        export: (
          projectPath: string,
          id: string
        ) => Promise<{ json: string; template: PlanTemplate } | null>
        import: (
          projectPath: string,
          json: string
        ) => Promise<{ success: boolean; template?: PlanTemplate; error?: string }>
        extractVariables: (plan: ExecutionPlanForTemplate) => Promise<TemplateVariable[]>
      }
    }
  }
}

// Usage types (mirrors main process)
interface UsageRecord {
  id: string
  timestamp: string
  inputTokens: number
  outputTokens: number
  model: string
  issueNumber?: number
  sessionId: string
}

interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

interface DailyUsage {
  date: string
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  recordCount: number
}

// PR types (mirrors main process)
interface PullRequest {
  number: number
  title: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isDraft: boolean
  headRefName: string
  baseRefName: string
  url: string
  mergeable: string
  reviewDecision: string | null
  statusCheckRollup: {
    state: string
    contexts: { name: string; state: string; conclusion: string }[]
  } | null
}

interface CheckStatus {
  name: string
  state: string
  conclusion: string
}

// Knowledge entry type (mirrors main process)
interface KnowledgeEntry {
  id: string
  title: string
  category: 'pattern' | 'gotcha' | 'decision' | 'learning'
  content: string
  tags: string[]
  sourceIssue?: number
  createdAt: string
  updatedAt: string
}

// Tiki config type (mirrors main process)
interface TikiConfig {
  tdd: {
    enabled: boolean
    framework: 'vitest' | 'jest' | 'pytest' | 'mocha' | 'other'
  }
  releases: {
    requirementsEnabled: boolean
    milestoneSync: boolean
  }
  execution: {
    autoCommit: boolean
    pauseOnFailure: boolean
  }
  knowledge: {
    autoCapture: boolean
    maxEntries: number
  }
}

// Branch types (mirrors main process)
interface BranchInfo {
  name: string
  current: boolean
  remote: string | undefined
  ahead: number
  behind: number
  lastCommit: string | undefined
  associatedIssue: number | undefined
}

interface WorkingTreeStatus {
  isDirty: boolean
  hasUntracked: boolean
  hasStaged: boolean
  hasUnstaged: boolean
  files: Array<{ path: string; status: string }>
}

interface GitOperationResult<T = void> {
  success: boolean
  data?: T
  error?: string
  errorCode?: GitErrorCode
  recoveryOptions?: string[]
}

type GitErrorCode =
  | 'UNCOMMITTED_CHANGES'
  | 'MERGE_CONFLICT'
  | 'BRANCH_EXISTS'
  | 'BRANCH_NOT_FOUND'
  | 'UNMERGED_BRANCH'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR'

// Terminal persistence types
interface PersistedTerminal {
  id: string
  name: string
  cwd: string
  projectPath: string
  scrollback?: string[]
}

interface PersistedTerminalState {
  terminals: PersistedTerminal[]
  activeTerminal: string | null
  savedAt: string
}

interface RestoreSessionResult {
  success: boolean
  restoredCount: number
  idMap: Record<string, string>
  newActiveTerminal: string | null
}


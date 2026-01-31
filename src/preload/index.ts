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
  workflowFailed: boolean
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

// Export app data types for full backup
export interface ExportTerminalPane {
  id: string
  terminalId: string
  size: number
}

export interface ExportTerminalLayout {
  direction: 'horizontal' | 'vertical' | 'none'
  panes: ExportTerminalPane[]
}

export interface ExportLayoutInput {
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  activeTab: string
  terminalLayout: ExportTerminalLayout
  focusedPaneId: string | null
}

export interface ExportProjectInput {
  id: string
  name: string
  path: string
}

export interface ExportAppDataInput {
  projects: ExportProjectInput[]
  layout: ExportLayoutInput
  recentCommands: string[]
  recentSearches: string[]
}

// Import preview types
export interface SettingsCategoryChange {
  category: string
  fieldsChanged: number
}

export interface ImportPreviewResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  version: string
  changes: {
    settings: SettingsCategoryChange[]
    projects: { added: number; removed: number; unchanged: number }
    layout: boolean
    recentCommands: boolean
  }
  data: ExportDataResult | null
}

export interface ExportDataResult {
  version: string
  exportedAt: string
  appVersion: string
  data: {
    settings: SettingsSchema
    projects: ExportProjectInput[]
    layout: ExportLayoutInput
    recentCommands: string[]
    recentSearches: string[]
  }
}

// Import mode type
export type ImportModeType = 'replace' | 'merge'

// Import result type
export interface ImportResultType {
  success: boolean
  error?: string
  imported: {
    settings: boolean
    projects: number
    layout: boolean
    recentCommands: boolean
  }
  mergedData?: {
    projects: ExportProjectInput[]
    layout: ExportLayoutInput
    recentCommands: string[]
    recentSearches: string[]
  }
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

// Check result type (mirrored from main process for type safety)
export type CheckResult =
  | { success: true; status: 'available' | 'not-available'; version?: string }
  | { success: false; error: string }

// Workflow type definitions (mirrored from main process for type safety)
export interface Workflow {
  id: number
  name: string
  state: string
}

export interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  event: string
  headSha: string
  createdAt: string
  updatedAt: string
  url: string
}

export interface Job {
  name: string
  status: string
  conclusion: string | null
}

export interface RunDetails extends WorkflowRun {
  jobs: Job[]
  logsUrl: string
}

export interface WorkflowRunsUpdate {
  workflowId: number
  cwd: string
  runs: WorkflowRun[]
}

// Cost prediction type definitions (mirrored from main process for type safety)
export interface CostPrediction {
  estimatedTokens: {
    low: number
    expected: number
    high: number
  }
  estimatedCost: {
    low: number
    expected: number
    high: number
  }
  confidence: 'low' | 'medium' | 'high'
  factors: PredictionFactor[]
  comparisons: {
    vsAverage: number
    vsSimilar: number | null
    vsRecent: number | null
  }
  breakdown: {
    planning: number
    execution: number
    verification: number
    fixes: number
  }
  similarIssues: Array<{
    number: number
    title: string
    actualCost: number
    similarity: number
  }>
}

export interface PredictionFactor {
  name: string
  impact: 'increases' | 'decreases' | 'neutral'
  weight: number
  reason: string
}

export interface BudgetSettings {
  dailyBudget: number | null
  weeklyBudget: number | null
  warnThreshold: number
}

export interface BudgetStatus {
  settings: BudgetSettings
  dailySpend: number
  weeklySpend: number
}

export interface IssueFeatures {
  bodyLength: number
  criteriaCount: number
  estimatedFiles: number
  hasTests: boolean
  issueType: 'bug' | 'feature' | 'refactor' | 'docs' | 'other'
  labelComplexity: number
  codeKeywords: string[]
}

export interface ExecutionRecord {
  issueNumber: number
  issueTitle: string
  features: IssueFeatures
  actualInputTokens: number
  actualOutputTokens: number
  actualCost: number
  phases: number
  durationMs: number
  retries: number
  success: boolean
  executedAt: string
}

export interface PredictionIssueInput {
  number: number
  title: string
  body?: string
  labels?: Array<{ name: string }>
}

export interface PredictionPlanInput {
  phases: Array<{ files: string[]; verification: string[] }>
}

// Pattern detection type definitions (mirrored from main process for type safety)
export type PatternCategory = 'code' | 'project' | 'workflow'

export interface FailurePatternPreload {
  id: string
  name: string
  description: string
  category: PatternCategory
  errorSignatures: string[]
  filePatterns: string[]
  contextIndicators: string[]
  occurrenceCount: number
  lastOccurrence: string
  affectedIssues: number[]
  successfulFixes: FixRecordPreload[]
  preventiveMeasures: PreventiveMeasurePreload[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface FailureRecordPreload {
  id: string
  issueNumber: number
  phaseNumber: number
  errorText: string
  errorCategory: string
  files: string[]
  timestamp: string
  resolution: 'fixed' | 'skipped' | 'pending' | null
  fixDescription: string | null
}

export interface FixRecordPreload {
  failureId: string
  patternId: string
  description: string
  effectiveness: number
  appliedAt: string
  success: boolean
}

export interface PreventiveMeasurePreload {
  id: string
  description: string
  type: 'context' | 'verification' | 'phase_structure' | 'manual'
  automatic: boolean
  effectiveness: number
  application: string
}

export interface PatternMatchPreload {
  pattern: FailurePatternPreload
  confidence: number
  matchedIndicators: string[]
  suggestedMeasures: PreventiveMeasurePreload[]
}

export interface GitHubIssueForPatternPreload {
  number: number
  title: string
  body?: string
  labels?: Array<{ name: string }>
}

export interface ExecutionPlanForPatternPreload {
  phases: Array<{
    number: number
    title: string
    files: string[]
    verification: string[]
  }>
}

// Analytics type definitions (mirrored from main process for type safety)
export type AnalyticsTimePeriod = '7days' | '30days' | '90days' | 'all'
export type AnalyticsMetricType = 'issues' | 'phases' | 'tokens' | 'duration'
export type AnalyticsGranularity = 'day' | 'week' | 'month'

export interface AnalyticsVelocityMetrics {
  period: AnalyticsTimePeriod
  issues: { completed: number; failed: number; successRate: number; avgDuration: number }
  phases: { completed: number; retried: number; retryRate: number; avgDuration: number }
  tokens: { total: number; perIssue: number; perPhase: number }
  comparison?: { issuesDelta: number; successRateDelta: number; durationDelta: number; tokensDelta: number }
}

export interface AnalyticsTimeSeriesPoint { date: string; value: number }
export interface AnalyticsBreakdownItem { label: string; value: number; percentage: number }
export interface AnalyticsInsight {
  id: string
  type: 'positive' | 'improvement' | 'warning'
  category: 'success' | 'duration' | 'efficiency' | 'tokens' | 'trend'
  title: string
  description: string
  metric?: { current: number; previous?: number; change?: number }
  priority: number
}

export interface AnalyticsExecutionRecord {
  issueNumber: number
  issueTitle: string
  issueType: 'bug' | 'feature' | 'refactor' | 'docs' | 'other'
  startedAt: string
  completedAt?: string
  status: 'completed' | 'failed' | 'in_progress'
  phases: Array<{
    number: number
    title: string
    startedAt: string
    completedAt?: string
    duration: number
    status: 'completed' | 'failed' | 'skipped'
    tokens: number
    retried: boolean
  }>
  totalTokens: number
  retryCount: number
}

// Workspace type definitions (mirrored from main process for type safety)
export interface WorkspaceTerminalSnapshot {
  id: string
  name: string
  cwd: string
}

export interface WorkspaceLayoutSnapshot {
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  sidebarWidth: number
  detailPanelWidth: number
}

export interface WorkspaceSnapshot {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  terminals: WorkspaceTerminalSnapshot[]
  activeTerminal?: string
  layout: WorkspaceLayoutSnapshot
  activeTab: string
  activeIssue?: number
  currentPhase?: number
  selectedNode?: string
  size: number
}

export interface WorkspaceStorageInfo {
  used: number
  limit: number
  snapshots: number
}

export type WorkspaceSnapshotInput = Omit<WorkspaceSnapshot, 'id' | 'createdAt' | 'updatedAt' | 'size'>

// Learning type definitions (mirrored from main process for type safety)
export interface LearningProgress {
  learningModeEnabled: boolean
  expertModeEnabled: boolean
  conceptsSeen: string[]
  totalExecutions: number
}

export interface LearningConceptExplanation {
  id: string
  title: string
  shortDescription: string
  fullExplanation: string
  relatedConcepts: string[]
}

export interface LearningPhaseExplanation {
  whyThisPhase: string
  whatHappens: string[]
  conceptsInvolved: string[]
}

// Heatmap type definitions (mirrored from main process for type safety)
export type HeatMetricPreload = 'modifications' | 'bugs' | 'churn' | 'complexity'
export type TimePeriodPreload = '7days' | '30days' | '90days' | 'all'

export interface FileHeatDataPreload {
  path: string
  name: string
  directory: string
  metrics: {
    modifications: number
    bugIssues: number[]
    linesOfCode: number
    lastModified: string | null
  }
  heat: number
}

export interface DirectoryHeatDataPreload {
  path: string
  name: string
  files: FileHeatDataPreload[]
  subdirectories: DirectoryHeatDataPreload[]
  totalHeat: number
  fileCount: number
}

export interface HeatMapSummaryPreload {
  totalFiles: number
  hotSpots: number
  bugProne: number
  untouched: number
  topHotSpot: FileHeatDataPreload | null
}

export interface HeatMapDataPreload {
  files: FileHeatDataPreload[]
  tree: DirectoryHeatDataPreload
  summary: HeatMapSummaryPreload
  metric: HeatMetricPreload
  period: TimePeriodPreload
  generatedAt: string
}

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
    check: (): Promise<CheckResult> => ipcRenderer.invoke('app:check-updates'),
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
    updateRelease: (data: {
      currentVersion: string
      updates: {
        version?: string
        status?: 'active' | 'shipped' | 'completed' | 'not_planned'
        requirementsEnabled?: boolean
        issues?: Array<{
          number: number
          title: string
          status?: string
          requirements?: string[]
          currentPhase?: number | null
          totalPhases?: number | null
          completedAt?: string | null
        }>
      }
    }) => ipcRenderer.invoke('tiki:update-release', data),
    deleteRelease: (version: string) => ipcRenderer.invoke('tiki:delete-release', { version }),
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
    export: (appData?: ExportAppDataInput) => ipcRenderer.invoke('settings:export', { appData }),
    import: (
      mode: ImportModeType,
      data: ExportDataResult,
      currentAppData?: ExportAppDataInput
    ) => ipcRenderer.invoke('settings:import', { mode, data, currentAppData }),
    previewImport: (appData?: ExportAppDataInput) =>
      ipcRenderer.invoke('settings:preview-import', { appData }),
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

  // Hooks API (for .tiki/hooks/ lifecycle scripts)
  hooks: {
    list: (cwd?: string) => ipcRenderer.invoke('hooks:list', { cwd }),
    read: (name: string, cwd?: string) => ipcRenderer.invoke('hooks:read', { name, cwd }),
    write: (name: string, content: string, cwd?: string) =>
      ipcRenderer.invoke('hooks:write', { name, content, cwd }),
    delete: (name: string, cwd?: string) => ipcRenderer.invoke('hooks:delete', { name, cwd }),
    execute: (
      name: string,
      env?: Record<string, string>,
      cwd?: string,
      timeout?: number
    ) => ipcRenderer.invoke('hooks:execute', { name, env, cwd, timeout }),
    history: (limit?: number) => ipcRenderer.invoke('hooks:history', { limit }),
    types: () => ipcRenderer.invoke('hooks:types'),
    ensureDirectory: (cwd?: string) => ipcRenderer.invoke('hooks:ensure-directory', { cwd })
  },

  // Commands API (for .claude/commands/ and .tiki/commands/ custom slash commands)
  commands: {
    list: (cwd?: string) => ipcRenderer.invoke('commands:list', { cwd }),
    read: (name: string, cwd?: string) => ipcRenderer.invoke('commands:read', { name, cwd }),
    write: (name: string, content: string, cwd?: string, source?: CommandSource) =>
      ipcRenderer.invoke('commands:write', { name, content, cwd, source }),
    delete: (name: string, cwd?: string) => ipcRenderer.invoke('commands:delete', { name, cwd }),
    namespaces: (cwd?: string) => ipcRenderer.invoke('commands:namespaces', { cwd }),
    ensureDirectory: (cwd?: string, source?: CommandSource) =>
      ipcRenderer.invoke('commands:ensure-directory', { cwd, source })
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
  },

  // Workflow API (for CI/CD status dashboard)
  workflow: {
    list: (cwd: string) => ipcRenderer.invoke('workflow:list', { cwd }),
    runs: (workflowId: number, cwd: string) =>
      ipcRenderer.invoke('workflow:runs', { workflowId, cwd }),
    runDetails: (runId: number, cwd: string) =>
      ipcRenderer.invoke('workflow:run-details', { runId, cwd }),
    openInBrowser: (url: string) => ipcRenderer.invoke('workflow:open-in-browser', { url }),
    subscribe: (workflowId: number, cwd: string) =>
      ipcRenderer.invoke('workflow:subscribe', { workflowId, cwd }),
    unsubscribe: (workflowId: number, cwd: string) =>
      ipcRenderer.invoke('workflow:unsubscribe', { workflowId, cwd }),
    onRunsUpdate: (callback: (data: WorkflowRunsUpdate) => void) => {
      const handler = (_: unknown, data: WorkflowRunsUpdate) => callback(data)
      ipcRenderer.on('workflow:runs-updated', handler)
      return () => ipcRenderer.removeListener('workflow:runs-updated', handler)
    }
  },

  // Prediction API (for cost prediction before issue execution)
  prediction: {
    estimateIssue: (cwd: string, issue: PredictionIssueInput) =>
      ipcRenderer.invoke('prediction:estimate-issue', { cwd, issue }),
    estimatePlan: (cwd: string, plan: PredictionPlanInput, issue: PredictionIssueInput) =>
      ipcRenderer.invoke('prediction:estimate-plan', { cwd, plan, issue }),
    recordActual: (cwd: string, record: ExecutionRecord) =>
      ipcRenderer.invoke('prediction:record-actual', { cwd, record }),
    getHistory: (cwd: string, limit?: number) =>
      ipcRenderer.invoke('prediction:get-history', { cwd, limit }),
    getBudget: (cwd: string) => ipcRenderer.invoke('prediction:get-budget', { cwd }),
    setBudget: (cwd: string, settings: BudgetSettings) =>
      ipcRenderer.invoke('prediction:set-budget', { cwd, settings }),
    getAverageCost: (cwd: string) => ipcRenderer.invoke('prediction:get-average-cost', { cwd }),
    isHighCost: (cwd: string, prediction: CostPrediction, threshold?: number) =>
      ipcRenderer.invoke('prediction:is-high-cost', { cwd, prediction, threshold }),
    clearCache: (cwd: string) => ipcRenderer.invoke('prediction:clear-cache', { cwd })
  },

  // Patterns API (for failure pattern detection and proactive prevention)
  patterns: {
    list: (cwd: string) => ipcRenderer.invoke('patterns:list', { cwd }),
    get: (cwd: string, patternId: string) =>
      ipcRenderer.invoke('patterns:get', { cwd, patternId }),
    check: (cwd: string, issue: GitHubIssueForPatternPreload, plan?: ExecutionPlanForPatternPreload) =>
      ipcRenderer.invoke('patterns:check', { cwd, issue, plan }),
    recordFailure: (cwd: string, failure: FailureRecordPreload) =>
      ipcRenderer.invoke('patterns:record-failure', { cwd, failure }),
    recordFix: (cwd: string, patternId: string, fix: FixRecordPreload) =>
      ipcRenderer.invoke('patterns:record-fix', { cwd, patternId, fix }),
    analyze: (cwd: string) => ipcRenderer.invoke('patterns:analyze', { cwd }),
    applyPrevention: (cwd: string, plan: ExecutionPlanForPatternPreload, matches: PatternMatchPreload[]) =>
      ipcRenderer.invoke('patterns:apply-prevention', { cwd, plan, matches }),
    resolve: (cwd: string, patternId: string) =>
      ipcRenderer.invoke('patterns:resolve', { cwd, patternId }),
    delete: (cwd: string, patternId: string) =>
      ipcRenderer.invoke('patterns:delete', { cwd, patternId }),
    top: (cwd: string, limit?: number) =>
      ipcRenderer.invoke('patterns:top', { cwd, limit })
  },

  // Code Preview API (for inline code preview with syntax highlighting)
  code: {
    readFile: (cwd: string, filePath: string) =>
      ipcRenderer.invoke('code:read-file', { cwd, filePath }),
    getLanguage: (filePath: string) => ipcRenderer.invoke('code:get-language', { filePath }),
    openInEditor: (filePath: string) => ipcRenderer.invoke('code:open-in-editor', { filePath })
  },

  // Heatmap API (for codebase heat map visualization)
  heatmap: {
    generate: (cwd: string, metric: HeatMetricPreload, period: TimePeriodPreload) =>
      ipcRenderer.invoke('heatmap:generate', { cwd, metric, period }),
    get: (cwd: string, metric: HeatMetricPreload, period: TimePeriodPreload) =>
      ipcRenderer.invoke('heatmap:get', { cwd, metric, period }),
    getFile: (cwd: string, filePath: string) =>
      ipcRenderer.invoke('heatmap:get-file', { cwd, filePath }),
    getHotspots: (cwd: string, limit?: number) =>
      ipcRenderer.invoke('heatmap:get-hotspots', { cwd, limit }),
    refresh: (cwd: string, metric: HeatMetricPreload, period: TimePeriodPreload) =>
      ipcRenderer.invoke('heatmap:refresh', { cwd, metric, period }),
    clearCache: (cwd: string) => ipcRenderer.invoke('heatmap:clear-cache', { cwd })
  },

  // Analytics API (for velocity dashboard with productivity metrics)
  analytics: {
    getVelocity: (cwd: string, period: AnalyticsTimePeriod) =>
      ipcRenderer.invoke('analytics:get-velocity', { cwd, period }),
    getTimeSeries: (cwd: string, metric: AnalyticsMetricType, period: AnalyticsTimePeriod, granularity: AnalyticsGranularity) =>
      ipcRenderer.invoke('analytics:get-timeseries', { cwd, metric, period, granularity }),
    getBreakdown: (cwd: string, dimension: 'type' | 'phase' | 'status') =>
      ipcRenderer.invoke('analytics:get-breakdown', { cwd, dimension }),
    getInsights: (cwd: string, period: AnalyticsTimePeriod) =>
      ipcRenderer.invoke('analytics:get-insights', { cwd, period }),
    recordExecution: (cwd: string, record: AnalyticsExecutionRecord) =>
      ipcRenderer.invoke('analytics:record-execution', { cwd, record }),
    getRecent: (cwd: string, limit?: number) =>
      ipcRenderer.invoke('analytics:get-recent', { cwd, limit })
  },

  // Workspace API (for workspace snapshots and context switching)
  workspace: {
    save: (snapshot: WorkspaceSnapshotInput) =>
      ipcRenderer.invoke('workspace:save', { snapshot }),
    get: (id: string) =>
      ipcRenderer.invoke('workspace:get', { id }),
    list: () =>
      ipcRenderer.invoke('workspace:list'),
    delete: (id: string) =>
      ipcRenderer.invoke('workspace:delete', { id }),
    rename: (id: string, name: string) =>
      ipcRenderer.invoke('workspace:rename', { id, name }),
    getStorage: () =>
      ipcRenderer.invoke('workspace:get-storage')
  },

  // Learning API (for guided/learning mode for new users)
  learning: {
    getProgress: () => ipcRenderer.invoke('learning:get-progress'),
    markConceptSeen: (conceptId: string) =>
      ipcRenderer.invoke('learning:mark-concept-seen', { conceptId }),
    setLearningMode: (enabled: boolean) =>
      ipcRenderer.invoke('learning:set-learning-mode', { enabled }),
    setExpertMode: (enabled: boolean) =>
      ipcRenderer.invoke('learning:set-expert-mode', { enabled }),
    getExplanation: (conceptId: string) =>
      ipcRenderer.invoke('learning:get-explanation', { conceptId }),
    getPhaseExplanation: (phase: { title: string; files: string[] }) =>
      ipcRenderer.invoke('learning:get-phase-explanation', { phase }),
    shouldShow: (conceptId: string) =>
      ipcRenderer.invoke('learning:should-show', { conceptId })
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

// Check result type for renderer
type CheckResultType =
  | { success: true; status: 'available' | 'not-available'; version?: string }
  | { success: false; error: string }

// Type declaration for renderer
declare global {
  interface Window {
    tikiDesktop: {
      getVersion: () => Promise<string>
      getCwd: () => Promise<string>
      getGitBranch: (cwd?: string) => Promise<string | null>
      platform: string
      updates: {
        check: () => Promise<CheckResultType>
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
        updateRelease: (data: {
          currentVersion: string
          updates: {
            version?: string
            status?: 'active' | 'shipped' | 'completed' | 'not_planned'
            requirementsEnabled?: boolean
            issues?: Array<{
              number: number
              title: string
              status?: string
              requirements?: string[]
              currentPhase?: number | null
              totalPhases?: number | null
              completedAt?: string | null
            }>
          }
        }) => Promise<{ success: boolean; error?: string }>
        deleteRelease: (version: string) => Promise<{ success: boolean; error?: string }>
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
        export: (appData?: ExportAppDataInput) => Promise<{ success: boolean; path?: string; error?: string }>
        import: (
          mode: ImportModeType,
          data: ExportDataResult,
          currentAppData?: ExportAppDataInput
        ) => Promise<ImportResultType>
        previewImport: (appData?: ExportAppDataInput) => Promise<ImportPreviewResult>
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
      hooks: {
        list: (cwd?: string) => Promise<Hook[]>
        read: (name: string, cwd?: string) => Promise<Hook | null>
        write: (name: string, content: string, cwd?: string) => Promise<boolean>
        delete: (name: string, cwd?: string) => Promise<boolean>
        execute: (
          name: string,
          env?: Record<string, string>,
          cwd?: string,
          timeout?: number
        ) => Promise<HookExecutionResult>
        history: (limit?: number) => Promise<HookExecutionResult[]>
        types: () => Promise<string[]>
        ensureDirectory: (cwd?: string) => Promise<boolean>
      }
      commands: {
        list: (cwd?: string) => Promise<Command[]>
        read: (name: string, cwd?: string) => Promise<Command | null>
        write: (name: string, content: string, cwd?: string, source?: CommandSource) => Promise<boolean>
        delete: (name: string, cwd?: string) => Promise<boolean>
        namespaces: (cwd?: string) => Promise<string[]>
        ensureDirectory: (cwd?: string, source?: CommandSource) => Promise<boolean>
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
      workflow: {
        list: (cwd: string) => Promise<Workflow[]>
        runs: (workflowId: number, cwd: string) => Promise<WorkflowRun[]>
        runDetails: (runId: number, cwd: string) => Promise<RunDetails>
        openInBrowser: (url: string) => Promise<void>
        subscribe: (
          workflowId: number,
          cwd: string
        ) => Promise<{ subscribed: boolean; workflowId: number; cwd: string }>
        unsubscribe: (
          workflowId: number,
          cwd: string
        ) => Promise<{ unsubscribed: boolean; workflowId: number; cwd: string }>
        onRunsUpdate: (callback: (data: WorkflowRunsUpdate) => void) => () => void
      }
      prediction: {
        estimateIssue: (cwd: string, issue: PredictionIssueInput) => Promise<CostPrediction>
        estimatePlan: (
          cwd: string,
          plan: PredictionPlanInput,
          issue: PredictionIssueInput
        ) => Promise<CostPrediction>
        recordActual: (cwd: string, record: ExecutionRecord) => Promise<{ success: boolean }>
        getHistory: (cwd: string, limit?: number) => Promise<ExecutionRecord[]>
        getBudget: (cwd: string) => Promise<BudgetStatus>
        setBudget: (cwd: string, settings: BudgetSettings) => Promise<{ success: boolean }>
        getAverageCost: (cwd: string) => Promise<{ average: number | null; recent: number | null }>
        isHighCost: (cwd: string, prediction: CostPrediction, threshold?: number) => Promise<boolean>
        clearCache: (cwd: string) => Promise<{ success: boolean }>
      }
      patterns: {
        list: (cwd: string) => Promise<FailurePatternPreload[]>
        get: (cwd: string, patternId: string) => Promise<FailurePatternPreload | undefined>
        check: (
          cwd: string,
          issue: GitHubIssueForPatternPreload,
          plan?: ExecutionPlanForPatternPreload
        ) => Promise<PatternMatchPreload[]>
        recordFailure: (cwd: string, failure: FailureRecordPreload) => Promise<{ success: boolean }>
        recordFix: (
          cwd: string,
          patternId: string,
          fix: FixRecordPreload
        ) => Promise<{ success: boolean }>
        analyze: (cwd: string) => Promise<FailurePatternPreload[]>
        applyPrevention: (
          cwd: string,
          plan: ExecutionPlanForPatternPreload,
          matches: PatternMatchPreload[]
        ) => Promise<{
          modifiedPlan: ExecutionPlanForPatternPreload
          appliedMeasures: PreventiveMeasurePreload[]
        }>
        resolve: (cwd: string, patternId: string) => Promise<{ success: boolean }>
        delete: (cwd: string, patternId: string) => Promise<{ success: boolean }>
        top: (cwd: string, limit?: number) => Promise<FailurePatternPreload[]>
      }
      code: {
        readFile: (
          cwd: string,
          filePath: string
        ) => Promise<{
          content: string
          language: string
          lineCount: number
          isTruncated: boolean
          originalSize: number
        }>
        getLanguage: (filePath: string) => Promise<string>
        openInEditor: (filePath: string) => Promise<{ success: boolean }>
      }
      heatmap: {
        generate: (
          cwd: string,
          metric: HeatMetricPreload,
          period: TimePeriodPreload
        ) => Promise<HeatMapDataPreload>
        get: (
          cwd: string,
          metric: HeatMetricPreload,
          period: TimePeriodPreload
        ) => Promise<HeatMapDataPreload>
        getFile: (cwd: string, filePath: string) => Promise<FileHeatDataPreload | null>
        getHotspots: (cwd: string, limit?: number) => Promise<FileHeatDataPreload[]>
        refresh: (
          cwd: string,
          metric: HeatMetricPreload,
          period: TimePeriodPreload
        ) => Promise<HeatMapDataPreload>
        clearCache: (cwd: string) => Promise<{ success: boolean }>
      }
      analytics: {
        getVelocity: (cwd: string, period: AnalyticsTimePeriod) => Promise<AnalyticsVelocityMetrics>
        getTimeSeries: (cwd: string, metric: AnalyticsMetricType, period: AnalyticsTimePeriod, granularity: AnalyticsGranularity) => Promise<AnalyticsTimeSeriesPoint[]>
        getBreakdown: (cwd: string, dimension: 'type' | 'phase' | 'status') => Promise<AnalyticsBreakdownItem[]>
        getInsights: (cwd: string, period: AnalyticsTimePeriod) => Promise<AnalyticsInsight[]>
        recordExecution: (cwd: string, record: AnalyticsExecutionRecord) => Promise<void>
        getRecent: (cwd: string, limit?: number) => Promise<AnalyticsExecutionRecord[]>
      }
      workspace: {
        save: (snapshot: WorkspaceSnapshotInput) => Promise<WorkspaceSnapshot>
        get: (id: string) => Promise<WorkspaceSnapshot | null>
        list: () => Promise<WorkspaceSnapshot[]>
        delete: (id: string) => Promise<boolean>
        rename: (id: string, name: string) => Promise<WorkspaceSnapshot | null>
        getStorage: () => Promise<WorkspaceStorageInfo>
      }
      learning: {
        getProgress: () => Promise<LearningProgress>
        markConceptSeen: (conceptId: string) => Promise<void>
        setLearningMode: (enabled: boolean) => Promise<void>
        setExpertMode: (enabled: boolean) => Promise<void>
        getExplanation: (conceptId: string) => Promise<LearningConceptExplanation | null>
        getPhaseExplanation: (phase: { title: string; files: string[] }) => Promise<LearningPhaseExplanation>
        shouldShow: (conceptId: string) => Promise<boolean>
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

// Hook types (mirrors main process hooks-service.ts)
interface Hook {
  name: string
  path: string
  type: string
  enabled: boolean
  content?: string
}

interface HookExecutionResult {
  hook: string
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  timestamp: string
  success: boolean
}

// Command types (mirrors main process commands-service.ts)
type CommandSource = 'claude' | 'tiki'

interface Command {
  name: string
  path: string
  relativePath: string
  namespace?: string
  source: CommandSource
  content?: string
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


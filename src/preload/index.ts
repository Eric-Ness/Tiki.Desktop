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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('tikiDesktop', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getCwd: () => ipcRenderer.invoke('app:cwd'),
  getGitBranch: (cwd?: string) => ipcRenderer.invoke('git:branch', cwd),

  // Platform info
  platform: process.platform,

  // Terminal API (to be implemented in #2)
  terminal: {
    create: (cwd: string, name?: string) =>
      ipcRenderer.invoke('terminal:create', { cwd, name }),
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
    }
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
    getState: () => ipcRenderer.invoke('tiki:get-state'),
    getPlan: (issueNumber: number) => ipcRenderer.invoke('tiki:get-plan', issueNumber),
    getQueue: () => ipcRenderer.invoke('tiki:get-queue'),
    getReleases: () => ipcRenderer.invoke('tiki:get-releases'),
    getCommands: (cwd?: string) => ipcRenderer.invoke('tiki:get-commands', { cwd }),
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
    onIssuesUpdated: (callback: (issues: unknown[]) => void) => {
      const handler = (_: unknown, issues: unknown[]) => callback(issues)
      ipcRenderer.on('github:issues-updated', handler)
      return () => ipcRenderer.removeListener('github:issues-updated', handler)
    },
    onError: (callback: (error: { error: string }) => void) => {
      const handler = (_: unknown, error: { error: string }) => callback(error)
      ipcRenderer.on('github:error', handler)
      return () => ipcRenderer.removeListener('github:error', handler)
    }
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
  }
})

// Type declaration for renderer
declare global {
  interface Window {
    tikiDesktop: {
      getVersion: () => Promise<string>
      getCwd: () => Promise<string>
      getGitBranch: (cwd?: string) => Promise<string | null>
      platform: string
      terminal: {
        create: (cwd: string, name?: string) => Promise<string>
        write: (id: string, data: string) => void
        resize: (id: string, cols: number, rows: number) => void
        kill: (id: string) => Promise<void>
        rename: (id: string, name: string) => Promise<boolean>
        onData: (callback: (id: string, data: string) => void) => () => void
        onExit: (callback: (id: string, code: number) => void) => () => void
        onStatusChange: (callback: (id: string, status: 'idle' | 'running') => void) => () => void
      }
      tiki: {
        watch: (path: string) => Promise<boolean>
        unwatch: () => Promise<boolean>
        onStateChange: (callback: (state: unknown) => void) => () => void
        onPlanChange: (callback: (data: { filename: string; plan: unknown }) => void) => () => void
        onQueueChange: (callback: (queue: unknown) => void) => () => void
        onReleaseChange: (callback: (data: { filename: string; release: unknown }) => void) => () => void
        getState: () => Promise<unknown>
        getPlan: (issueNumber: number) => Promise<unknown>
        getQueue: () => Promise<unknown>
        getReleases: () => Promise<unknown[]>
        getCommands: (cwd?: string) => Promise<Array<{
          name: string
          displayName: string
          description: string
          argumentHint?: string
        }>>
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
      github: {
        checkCli: () => Promise<{ available: boolean; authenticated: boolean; error?: string }>
        getIssues: (state?: 'open' | 'closed' | 'all', cwd?: string) => Promise<unknown[]>
        getIssue: (number: number, cwd?: string) => Promise<unknown>
        refresh: (cwd?: string) => Promise<void>
        openInBrowser: (number: number, cwd?: string) => Promise<void>
        onIssuesUpdated: (callback: (issues: unknown[]) => void) => () => void
        onError: (callback: (error: { error: string }) => void) => () => void
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
    }
  }
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


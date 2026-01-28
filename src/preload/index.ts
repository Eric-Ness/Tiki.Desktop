import { contextBridge, ipcRenderer } from 'electron'

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
    getCommands: (cwd?: string) => ipcRenderer.invoke('tiki:get-commands', { cwd })
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
    }
  }
}

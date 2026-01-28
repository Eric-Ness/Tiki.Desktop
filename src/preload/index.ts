import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('tikiDesktop', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getCwd: () => ipcRenderer.invoke('app:cwd'),

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
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_: unknown, { id, data }: { id: string; data: string }) => callback(id, data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    onExit: (callback: (id: string, code: number) => void) => {
      const handler = (_: unknown, { id, code }: { id: string; code: number }) => callback(id, code)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.removeListener('terminal:exit', handler)
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
    getQueue: () => ipcRenderer.invoke('tiki:get-queue')
  },

  // GitHub API (to be implemented in #8)
  github: {
    getIssues: (state?: string) => ipcRenderer.invoke('github:get-issues', state),
    getIssue: (number: number) => ipcRenderer.invoke('github:get-issue', number),
    getReleases: () => ipcRenderer.invoke('github:get-releases')
  }
})

// Type declaration for renderer
declare global {
  interface Window {
    tikiDesktop: {
      getVersion: () => Promise<string>
      getCwd: () => Promise<string>
      platform: string
      terminal: {
        create: (cwd: string, name?: string) => Promise<string>
        write: (id: string, data: string) => void
        resize: (id: string, cols: number, rows: number) => void
        kill: (id: string) => Promise<void>
        onData: (callback: (id: string, data: string) => void) => () => void
        onExit: (callback: (id: string, code: number) => void) => () => void
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
      }
      github: {
        getIssues: (state?: string) => Promise<unknown[]>
        getIssue: (number: number) => Promise<unknown>
        getReleases: () => Promise<unknown[]>
      }
    }
  }
}

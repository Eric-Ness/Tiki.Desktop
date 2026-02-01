import { useState, useEffect, useCallback } from 'react'
import { logger } from '../../lib/logger'
import { useTikiStore } from '../../stores/tiki-store'
import {
  WorkspaceSelector,
  SaveWorkspaceDialog,
  RestoreConfirmDialog,
  WorkspaceManager
} from '../workspace'
import { LayoutModeSwitcher } from './LayoutModeSwitcher'

interface WorkspaceSnapshotData {
  id: string
  name: string
  description?: string
  activeIssue?: number
  terminals: Array<{ id: string; name: string; cwd: string }>
  updatedAt: string
  activeTab: string
  size: number
}

export function TitleBar() {
  const isMac = window.tikiDesktop.platform === 'darwin'
  const toggleSettingsModal = useTikiStore((state) => state.toggleSettingsModal)

  // Get store state for workspace snapshots
  const terminals = useTikiStore((state) => state.terminals)
  const activeTab = useTikiStore((state) => state.activeTab)
  const selectedIssue = useTikiStore((state) => state.selectedIssue)
  const selectedNode = useTikiStore((state) => state.selectedNode)
  const sidebarCollapsed = useTikiStore((state) => state.sidebarCollapsed)
  const detailPanelCollapsed = useTikiStore((state) => state.detailPanelCollapsed)
  const currentPhase = useTikiStore((state) => state.tikiState?.currentPhase ?? null)
  const activeWorkspace = useTikiStore((state) => state.activeWorkspace)
  const setActiveWorkspace = useTikiStore((state) => state.setActiveWorkspace)
  const activeProject = useTikiStore((state) => state.activeProject)

  // Workspace UI state
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotData[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSnapshotData | null>(null)
  const [restoringWorkspace, setRestoringWorkspace] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 100 * 1024 * 1024, snapshots: 0 })

  // Load workspaces when selector opens
  useEffect(() => {
    if (workspaceOpen || managerOpen) {
      loadWorkspaces()
    }
  }, [workspaceOpen, managerOpen])

  const loadWorkspaces = async () => {
    setWorkspaceLoading(true)
    try {
      const [snapshots, storage] = await Promise.all([
        window.tikiDesktop.workspace.list(),
        window.tikiDesktop.workspace.getStorage()
      ])
      setWorkspaces(snapshots as WorkspaceSnapshotData[])
      setStorageInfo(storage)
    } catch (error) {
      logger.error('Failed to load workspaces:', error)
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const getCurrentWorkspaceState = useCallback(() => {
    return {
      terminals: terminals.map((t) => ({
        id: t.id,
        name: t.name,
        cwd: t.projectPath || ''
      })),
      activeTerminal: undefined,
      layout: {
        sidebarCollapsed,
        detailPanelCollapsed,
        sidebarWidth: 256,
        detailPanelWidth: 320
      },
      activeTab,
      activeIssue: selectedIssue ?? undefined,
      currentPhase: currentPhase ?? undefined,
      selectedNode: selectedNode ?? undefined
    }
  }, [terminals, sidebarCollapsed, detailPanelCollapsed, activeTab, selectedIssue, currentPhase, selectedNode])

  const handleSaveWorkspace = async (name: string, description?: string) => {
    setSavingWorkspace(true)
    try {
      const state = getCurrentWorkspaceState()
      const snapshot = await window.tikiDesktop.workspace.save({
        name,
        description,
        ...state
      })
      setActiveWorkspace(snapshot.id)
      setSaveDialogOpen(false)
      await loadWorkspaces()
    } catch (error) {
      logger.error('Failed to save workspace:', error)
    } finally {
      setSavingWorkspace(false)
    }
  }

  const handleRestore = async (id: string) => {
    const snapshot = await window.tikiDesktop.workspace.get(id)
    if (snapshot) {
      setSelectedWorkspace(snapshot as WorkspaceSnapshotData)
      setRestoreDialogOpen(true)
      setWorkspaceOpen(false)
    }
  }

  const handleConfirmRestore = async () => {
    if (!selectedWorkspace) return

    setRestoringWorkspace(true)
    try {
      // For now, just set the active workspace and close the dialog
      // Full restore logic (recreating terminals, restoring layout) would be implemented here
      setActiveWorkspace(selectedWorkspace.id)
      setRestoreDialogOpen(false)
      setSelectedWorkspace(null)
    } catch (error) {
      logger.error('Failed to restore workspace:', error)
    } finally {
      setRestoringWorkspace(false)
    }
  }

  const handleSaveFirstThenRestore = () => {
    // Close restore dialog and open save dialog
    setRestoreDialogOpen(false)
    setSaveDialogOpen(true)
  }

  const handleManageWorkspaces = () => {
    setWorkspaceOpen(false)
    setManagerOpen(true)
  }

  const handleRenameWorkspace = async (id: string, name: string) => {
    try {
      await window.tikiDesktop.workspace.rename(id, name)
      await loadWorkspaces()
    } catch (error) {
      logger.error('Failed to rename workspace:', error)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    try {
      await window.tikiDesktop.workspace.delete(id)
      if (activeWorkspace === id) {
        setActiveWorkspace(null)
      }
      await loadWorkspaces()
    } catch (error) {
      logger.error('Failed to delete workspace:', error)
    }
  }

  return (
    <>
      <div className="h-10 bg-background-secondary border-b border-border flex items-center px-4 drag-region">
        {/* Mac traffic lights space */}
        {isMac && <div className="w-16" />}

        {/* Logo and Title */}
        <div className="flex items-center gap-2 no-drag">
          <svg
            className="w-5 h-5 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="font-semibold text-sm">Tiki Desktop</span>
        </div>

        {/* Workspace button */}
        <div className="ml-2 relative no-drag">
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="p-1.5 rounded hover:bg-background-tertiary active:bg-background-tertiary/70 transition-colors duration-150"
            title="Workspaces"
          >
            <svg
              className={`w-4 h-4 transition-colors duration-150 ${
                activeWorkspace ? 'text-amber-500' : 'text-slate-400 hover:text-slate-300'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {/* Center - Mode Switcher and Project name */}
        <div className="flex-1 flex justify-center items-center gap-4 no-drag">
          <LayoutModeSwitcher variant="titlebar" />
          <span className={`text-xs ${activeProject ? 'text-slate-300' : 'text-slate-500'}`}>
            {activeProject ? activeProject.name : 'No project selected'}
          </span>
        </div>

        {/* Right side - Window controls on Windows */}
        <div className="flex items-center gap-2 no-drag">
          {/* Settings button */}
          <button
            onClick={toggleSettingsModal}
            className="p-1.5 rounded hover:bg-background-tertiary active:bg-background-tertiary/70 transition-colors duration-150"
            title="Settings (Ctrl+,)"
          >
            <svg className="w-4 h-4 text-slate-400 hover:text-slate-300 transition-colors duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Workspace Selector Popover */}
      <WorkspaceSelector
        isOpen={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        snapshots={workspaces}
        onRestore={handleRestore}
        onSaveNew={() => {
          setWorkspaceOpen(false)
          setSaveDialogOpen(true)
        }}
        onManage={handleManageWorkspaces}
        loading={workspaceLoading}
      />

      {/* Save Workspace Dialog */}
      <SaveWorkspaceDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveWorkspace}
        currentState={{
          terminalCount: terminals.length,
          activeIssue: selectedIssue ?? undefined,
          activeTab
        }}
        saving={savingWorkspace}
      />

      {/* Restore Confirm Dialog */}
      {selectedWorkspace && (
        <RestoreConfirmDialog
          isOpen={restoreDialogOpen}
          onClose={() => {
            setRestoreDialogOpen(false)
            setSelectedWorkspace(null)
          }}
          onRestore={handleConfirmRestore}
          onSaveFirst={handleSaveFirstThenRestore}
          snapshot={{
            name: selectedWorkspace.name,
            terminals: selectedWorkspace.terminals,
            activeIssue: selectedWorkspace.activeIssue,
            activeTab: selectedWorkspace.activeTab
          }}
          currentState={{
            terminalCount: terminals.length
          }}
          restoring={restoringWorkspace}
        />
      )}

      {/* Workspace Manager */}
      <WorkspaceManager
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        snapshots={workspaces}
        storageInfo={storageInfo}
        onRestore={handleRestore}
        onRename={handleRenameWorkspace}
        onDelete={handleDeleteWorkspace}
        loading={workspaceLoading}
      />
    </>
  )
}

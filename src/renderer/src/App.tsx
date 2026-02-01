import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ImperativePanelHandle } from 'react-resizable-panels'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/ResizablePanels'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DetailPanel } from './components/layout/DetailPanel'
import { StatusBar } from './components/layout/StatusBar'
import { TitleBar } from './components/layout/TitleBar'
import { DevelopmentLayout } from './components/layout/DevelopmentLayout'
import { CommandPalette } from './components/command-palette'
import { GlobalSearch } from './components/search'
import { SettingsModal } from './components/settings'
import { SettingsProvider } from './contexts/SettingsContext'
import { LearningProvider } from './contexts/LearningContext'
import { useTikiSync } from './hooks/useTikiSync'
import { useGitHubSync } from './hooks/useGitHubSync'
import { useSidebarShortcuts } from './hooks/useSidebarShortcuts'
import { useDetailPanelShortcuts } from './hooks/useDetailPanelShortcuts'
import { useLayoutPresetShortcuts } from './hooks/useLayoutPresetShortcuts'
import { useCommandPaletteShortcut } from './hooks/useCommandPaletteShortcut'
import { useTikiCommands } from './hooks/useTikiCommands'
import { useCommandExecution } from './hooks/useCommandExecution'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useSearchShortcut } from './hooks/useSearchShortcut'
import { useSearchIndexSync } from './hooks/useSearchIndexSync'
import { useActivityLogger } from './hooks/useActivityLogger'
import { useLayoutModeShortcuts } from './hooks/useLayoutModeShortcuts'
import { useQuickOpenShortcut } from './hooks/useQuickOpenShortcut'
import { QuickOpen } from './components/editor/QuickOpen'
import { useShallow } from 'zustand/react/shallow'
import { useTikiStore, type Project } from './stores/tiki-store'
import { useLayoutPresetsStore, builtInPresets } from './stores/layout-presets'
import { UpdateToast, type UpdateStatus } from './components/UpdateToast'

function App() {
  const [version, setVersion] = useState<string>('')
  const [cwd, setCwd] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [enablePanelTransition, setEnablePanelTransition] = useState(false)
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)
  const detailPanelRef = useRef<ImperativePanelHandle>(null)

  // Layout state - consolidated selectors
  const { sidebarCollapsed, detailPanelCollapsed, layoutMode } = useTikiStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      detailPanelCollapsed: state.detailPanelCollapsed,
      layoutMode: state.layoutMode
    }))
  )

  // Layout presets - consolidated selectors
  const { updatePanelSizes, activePresetId, presets } = useLayoutPresetsStore(
    useShallow((state) => ({
      updatePanelSizes: state.updatePanelSizes,
      activePresetId: state.activePresetId,
      presets: state.presets
    }))
  )

  // Project state - needed early for sync hooks
  const activeProject = useTikiStore((state) => state.activeProject)

  // Sync file watcher with Zustand store (only when project is active)
  useTikiSync(activeProject)

  // Sync GitHub issues (only when project is active)
  useGitHubSync(activeProject)

  // Sync store data to search index
  useSearchIndexSync()

  // Register keyboard shortcuts
  useSidebarShortcuts()
  useDetailPanelShortcuts()
  useLayoutPresetShortcuts()

  // Log activity events
  useActivityLogger()

  // Layout mode shortcuts (Ctrl+Shift+W/D/L)
  useLayoutModeShortcuts()

  // Quick open shortcut (Ctrl+P in Development mode)
  const { isQuickOpenOpen, closeQuickOpen } = useQuickOpenShortcut()

  // Command palette state and commands
  const { isOpen: commandPaletteOpen, close: closeCommandPalette } = useCommandPaletteShortcut()
  const { commands } = useTikiCommands()
  const { executeCommand, executeCommandWithArgs } = useCommandExecution()

  // Settings modal state
  const { isOpen: settingsOpen, close: closeSettings } = useSettingsShortcut()

  // Global search state
  const { isOpen: searchOpen, close: closeSearch } = useSearchShortcut()

  // Project actions - consolidated selectors (activeProject already declared above)
  const { recentCommands, setActiveProject, setTikiState, setCurrentPlan, setIssues } = useTikiStore(
    useShallow((state) => ({
      recentCommands: state.recentCommands,
      setActiveProject: state.setActiveProject,
      setTikiState: state.setTikiState,
      setCurrentPlan: state.setCurrentPlan,
      setIssues: state.setIssues
    }))
  )

  // Handle project switching
  const handleProjectSwitch = useCallback(
    async (project: Project) => {
      // Update active project in store
      setActiveProject(project)
      setCwd(project.path)

      // Clear current state for clean switch
      setTikiState(null)
      setCurrentPlan(null)
      setIssues([])

      // Switch file watcher to new project path
      await window.tikiDesktop.projects.switchProject(project.path)
    },
    [setActiveProject, setTikiState, setCurrentPlan, setIssues]
  )

  // On mount, check for active project and set cwd
  useEffect(() => {
    if (activeProject) {
      setCwd(activeProject.path)
      // Ensure file watcher is watching the active project
      window.tikiDesktop.projects.switchProject(activeProject.path)
    }
  }, []) // Only on mount

  // Sync sidebar panel collapse state with store
  useEffect(() => {
    if (sidebarPanelRef.current) {
      if (sidebarCollapsed) {
        sidebarPanelRef.current.collapse()
      } else {
        sidebarPanelRef.current.expand()
      }
    }
  }, [sidebarCollapsed])

  // Sync detail panel collapse state with store
  useEffect(() => {
    if (detailPanelRef.current) {
      if (detailPanelCollapsed) {
        detailPanelRef.current.collapse()
      } else {
        detailPanelRef.current.expand()
      }
    }
  }, [detailPanelCollapsed])

  // Track previous preset ID to detect changes
  const prevPresetIdRef = useRef<string | null>(activePresetId)

  // Apply preset when activePresetId changes
  useEffect(() => {
    // Skip if it's the same preset (e.g., initial render)
    if (prevPresetIdRef.current === activePresetId) {
      return
    }
    prevPresetIdRef.current = activePresetId

    if (!activePresetId) return

    // Find the preset (check built-in first, then user presets)
    const preset = builtInPresets.find((p) => p.id === activePresetId) || presets.find((p) => p.id === activePresetId)
    if (!preset) return

    // Enable transition for smooth animation
    setEnablePanelTransition(true)

    // Apply panel sizes using imperative handles
    const { sidebarSize, detailPanelSize, sidebarCollapsed: shouldCollapseSidebar, detailPanelCollapsed: shouldCollapseDetail } = preset.layout

    if (sidebarPanelRef.current) {
      if (shouldCollapseSidebar || sidebarSize === 0) {
        sidebarPanelRef.current.collapse()
      } else {
        sidebarPanelRef.current.expand()
        sidebarPanelRef.current.resize(sidebarSize)
      }
    }

    if (detailPanelRef.current) {
      if (shouldCollapseDetail || detailPanelSize === 0) {
        detailPanelRef.current.collapse()
      } else {
        detailPanelRef.current.expand()
        detailPanelRef.current.resize(detailPanelSize)
      }
    }

    // Disable transition after animation completes to avoid affecting manual resizes
    const timer = setTimeout(() => {
      setEnablePanelTransition(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [activePresetId, presets])

  useEffect(() => {
    // Get app version on mount
    window.tikiDesktop.getVersion().then(setVersion)
    // Note: cwd is set from activeProject.path in the mount effect above
    // We don't call getCwd() here to avoid setting cwd when no project is selected
  }, [])

  // Listen for update status events
  useEffect(() => {
    const unsubscribe = window.tikiDesktop.updates.onStatus((status) => {
      setUpdateStatus(status)
      // Reset dismissed state when a new update becomes available
      if (status.type === 'available' || status.type === 'downloaded') {
        setUpdateDismissed(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Update toast handlers
  const handleDownloadUpdate = useCallback(() => {
    window.tikiDesktop.updates.download()
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.tikiDesktop.updates.install()
  }, [])

  const handleDismissUpdate = useCallback(() => {
    setUpdateDismissed(true)
  }, [])

  // Memoize whether to show the update toast
  const showUpdateToast = useMemo(() => {
    if (!updateStatus || updateDismissed) return false
    return updateStatus.type === 'available' ||
           updateStatus.type === 'downloading' ||
           updateStatus.type === 'downloaded' ||
           updateStatus.type === 'error'
  }, [updateStatus, updateDismissed])

  // Handle command selection from palette (commands without arguments)
  const handleCommandSelect = async (command: { name: string; displayName: string; description: string; argumentHint?: string }) => {
    closeCommandPalette()
    await executeCommand(command)
  }

  // Handle command selection with arguments
  const handleCommandSelectWithArgs = async (
    command: { name: string; displayName: string; description: string; argumentHint?: string },
    args: string
  ) => {
    closeCommandPalette()
    await executeCommandWithArgs(command, args)
  }

  return (
    <SettingsProvider>
      <LearningProvider>
        <div className="h-screen flex flex-col bg-background text-slate-100">
        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={closeCommandPalette}
          commands={commands}
          recentCommands={recentCommands}
          onSelect={handleCommandSelect}
          onSelectWithArgs={handleCommandSelectWithArgs}
        />

        {/* Global Search */}
        <GlobalSearch isOpen={searchOpen} onClose={closeSearch} />

        {/* Settings Modal */}
        <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />

        {/* Title Bar */}
        <TitleBar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {layoutMode === 'development' ? (
            <DevelopmentLayout cwd={cwd} />
          ) : (
            <ResizablePanelGroup direction="horizontal" onLayout={(sizes) => updatePanelSizes(sizes)} enableTransition={enablePanelTransition}>
              {/* Sidebar */}
              <ResizablePanel
                ref={sidebarPanelRef}
                defaultSize={20}
                minSize={15}
                maxSize={30}
                collapsible={true}
                collapsedSize={0}
              >
                <Sidebar cwd={cwd} onProjectSwitch={handleProjectSwitch} />
              </ResizablePanel>

              <ResizableHandle />

              {/* Main Content */}
              <ResizablePanel defaultSize={55} minSize={30}>
                <MainContent cwd={cwd} />
              </ResizablePanel>

              <ResizableHandle />

              {/* Detail Panel */}
              <ResizablePanel
                ref={detailPanelRef}
                defaultSize={25}
                minSize={20}
                maxSize={40}
                collapsible={true}
                collapsedSize={0}
              >
                <DetailPanel cwd={cwd} />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>

        {/* Status Bar */}
        <StatusBar version={version} cwd={cwd} />

        {/* Quick Open Dialog (Development mode) */}
        <QuickOpen isOpen={isQuickOpenOpen} onClose={closeQuickOpen} />

        {/* Update Toast */}
        {showUpdateToast && updateStatus && (
          <UpdateToast
            status={updateStatus}
            onDownload={handleDownloadUpdate}
            onInstall={handleInstallUpdate}
            onDismiss={handleDismissUpdate}
          />
        )}
        </div>
      </LearningProvider>
    </SettingsProvider>
  )
}

export default App

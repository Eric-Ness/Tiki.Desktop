import { useState, useEffect, useRef, useCallback } from 'react'
import { ImperativePanelHandle } from 'react-resizable-panels'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/ResizablePanels'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DetailPanel } from './components/layout/DetailPanel'
import { StatusBar } from './components/layout/StatusBar'
import { TitleBar } from './components/layout/TitleBar'
import { CommandPalette } from './components/command-palette'
import { SettingsModal } from './components/settings'
import { SettingsProvider } from './contexts/SettingsContext'
import { useTikiSync } from './hooks/useTikiSync'
import { useGitHubSync } from './hooks/useGitHubSync'
import { useSidebarShortcuts } from './hooks/useSidebarShortcuts'
import { useDetailPanelShortcuts } from './hooks/useDetailPanelShortcuts'
import { useCommandPaletteShortcut } from './hooks/useCommandPaletteShortcut'
import { useTikiCommands } from './hooks/useTikiCommands'
import { useCommandExecution } from './hooks/useCommandExecution'
import { useSettingsShortcut } from './hooks/useSettingsShortcut'
import { useTikiStore, type Project } from './stores/tiki-store'

function App() {
  const [version, setVersion] = useState<string>('')
  const [cwd, setCwd] = useState<string>('')
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)
  const detailPanelRef = useRef<ImperativePanelHandle>(null)
  const sidebarCollapsed = useTikiStore((state) => state.sidebarCollapsed)
  const detailPanelCollapsed = useTikiStore((state) => state.detailPanelCollapsed)

  // Sync file watcher with Zustand store
  useTikiSync()

  // Sync GitHub issues
  useGitHubSync(cwd)

  // Register keyboard shortcuts
  useSidebarShortcuts()
  useDetailPanelShortcuts()

  // Command palette state and commands
  const { isOpen: commandPaletteOpen, close: closeCommandPalette } = useCommandPaletteShortcut()
  const { commands } = useTikiCommands()
  const { executeCommand, executeCommandWithArgs } = useCommandExecution()
  const recentCommands = useTikiStore((state) => state.recentCommands)

  // Settings modal state
  const { isOpen: settingsOpen, close: closeSettings } = useSettingsShortcut()

  // Project management
  const activeProject = useTikiStore((state) => state.activeProject)
  const setActiveProject = useTikiStore((state) => state.setActiveProject)
  const setTikiState = useTikiStore((state) => state.setTikiState)
  const setCurrentPlan = useTikiStore((state) => state.setCurrentPlan)
  const setIssues = useTikiStore((state) => state.setIssues)

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

  useEffect(() => {
    // Get app info on mount
    window.tikiDesktop.getVersion().then(setVersion)
    window.tikiDesktop.getCwd().then(setCwd)
  }, [])

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

        {/* Settings Modal */}
        <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />

        {/* Title Bar */}
        <TitleBar />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
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
        </div>

        {/* Status Bar */}
        <StatusBar version={version} cwd={cwd} />
      </div>
    </SettingsProvider>
  )
}

export default App

import { useState, useEffect, useRef } from 'react'
import { ImperativePanelHandle } from 'react-resizable-panels'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/ResizablePanels'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DetailPanel } from './components/layout/DetailPanel'
import { StatusBar } from './components/layout/StatusBar'
import { TitleBar } from './components/layout/TitleBar'
import { useTikiSync } from './hooks/useTikiSync'
import { useGitHubSync } from './hooks/useGitHubSync'
import { useSidebarShortcuts } from './hooks/useSidebarShortcuts'
import { useDetailPanelShortcuts } from './hooks/useDetailPanelShortcuts'
import { useTikiStore } from './stores/tiki-store'

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

  return (
    <div className="h-screen flex flex-col bg-background text-slate-100">
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
            <Sidebar cwd={cwd} />
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
  )
}

export default App

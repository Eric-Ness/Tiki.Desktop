import { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/ResizablePanels'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DetailPanel } from './components/layout/DetailPanel'
import { StatusBar } from './components/layout/StatusBar'
import { TitleBar } from './components/layout/TitleBar'
import { useTikiSync } from './hooks/useTikiSync'

function App() {
  const [version, setVersion] = useState<string>('')
  const [cwd, setCwd] = useState<string>('')

  // Sync file watcher with Zustand store
  useTikiSync()

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
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar cwd={cwd} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Content */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <MainContent cwd={cwd} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Detail Panel */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <DetailPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar version={version} />
    </div>
  )
}

export default App

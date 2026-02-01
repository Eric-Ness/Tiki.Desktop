/**
 * DevelopmentLayout Component
 *
 * The main layout for Development mode - a VS Code-like interface with:
 * - Left: File Explorer
 * - Center: Editor + Terminal (vertical split)
 * - Right: Outline/Preview panel
 */

import { useRef } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/ResizablePanels'
import { FileExplorer } from '../explorer/FileExplorer'
import { EditorPane } from '../editor/EditorPane'
import { IntegratedTerminal } from '../terminal/IntegratedTerminal'
import { DevelopmentDetailPanel } from './DevelopmentDetailPanel'
import { useTikiStore } from '../../stores/tiki-store'
import type { ImperativePanelHandle } from 'react-resizable-panels'

interface DevelopmentLayoutProps {
  cwd: string
}

export function DevelopmentLayout({ cwd }: DevelopmentLayoutProps) {
  const setDevelopmentState = useTikiStore((state) => state.setDevelopmentState)

  const explorerPanelRef = useRef<ImperativePanelHandle>(null)
  const terminalPanelRef = useRef<ImperativePanelHandle>(null)
  const detailPanelRef = useRef<ImperativePanelHandle>(null)

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* File Explorer (Left) */}
      <ResizablePanel
        ref={explorerPanelRef}
        defaultSize={20}
        minSize={15}
        maxSize={35}
        collapsible
        collapsedSize={0}
      >
        <FileExplorer />
      </ResizablePanel>

      <ResizableHandle />

      {/* Editor + Terminal (Center) */}
      <ResizablePanel defaultSize={60} minSize={40}>
        <ResizablePanelGroup direction="vertical">
          {/* Editor area */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <EditorPane />
          </ResizablePanel>

          <ResizableHandle />

          {/* Integrated terminal */}
          <ResizablePanel
            ref={terminalPanelRef}
            defaultSize={30}
            minSize={10}
            maxSize={60}
            collapsible
            collapsedSize={0}
            onCollapse={() => {
              setDevelopmentState({ terminalCollapsed: true })
            }}
            onExpand={() => {
              setDevelopmentState({ terminalCollapsed: false })
            }}
          >
            <IntegratedTerminal cwd={cwd} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle />

      {/* Detail Panel (Right) */}
      <ResizablePanel
        ref={detailPanelRef}
        defaultSize={20}
        minSize={15}
        maxSize={30}
        collapsible
        collapsedSize={0}
      >
        <DevelopmentDetailPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

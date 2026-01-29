import React, { useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useTikiStore } from '../../stores/tiki-store'
import { Terminal } from './Terminal'

interface TerminalSplitContainerProps {
  cwd: string
}

export function TerminalSplitContainer({ cwd }: TerminalSplitContainerProps) {
  const layout = useTikiStore((s) => s.terminalLayout)
  const allTerminals = useTikiStore((s) => s.terminals)
  const focusedPaneId = useTikiStore((s) => s.focusedPaneId)
  const setFocusedPane = useTikiStore((s) => s.setFocusedPane)
  const closeSplit = useTikiStore((s) => s.closeSplit)
  const splitTerminal = useTikiStore((s) => s.splitTerminal)
  const updatePaneTerminal = useTikiStore((s) => s.updatePaneTerminal)

  // Filter terminals by current project
  const terminals = useMemo(
    () => allTerminals.filter((t) => t.projectPath === cwd),
    [allTerminals, cwd]
  )

  // Filter panes to only show those with terminals from this project
  const projectPanes = useMemo(
    () => layout.panes.filter((p) => terminals.some((t) => t.id === p.terminalId)),
    [layout.panes, terminals]
  )

  // Get terminal name by ID
  const getTerminalName = (terminalId: string) => {
    const terminal = terminals.find((t) => t.id === terminalId)
    return terminal?.name || 'Terminal'
  }

  // Single pane - render simplified view
  if (layout.direction === 'none' || projectPanes.length <= 1) {
    const pane = projectPanes[0]
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="h-8 bg-background-tertiary border-b border-border flex items-center justify-between px-2">
          <span className="text-xs text-slate-400">{pane ? getTerminalName(pane.terminalId) : 'Terminal'}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => splitTerminal('horizontal')}
              title="Split horizontally"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-background/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
            <button
              onClick={() => splitTerminal('vertical')}
              title="Split vertically"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-background/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Terminal */}
        <div className="flex-1">
          <Terminal terminalId={pane?.terminalId || null} />
        </div>
      </div>
    )
  }

  // Multiple panes - render split view
  const direction = layout.direction === 'horizontal' ? 'horizontal' : 'vertical'

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-8 bg-background-tertiary border-b border-border flex items-center justify-end px-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => splitTerminal('horizontal')}
            title="Split horizontally"
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-background/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
          <button
            onClick={() => splitTerminal('vertical')}
            title="Split vertically"
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-background/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Split panes */}
      <div className="flex-1">
        <PanelGroup direction={direction} className="h-full">
          {projectPanes.map((pane, index) => (
            <React.Fragment key={pane.id}>
              {index > 0 && (
                <PanelResizeHandle
                  className={`
                    ${direction === 'horizontal' ? 'w-1' : 'h-1'}
                    bg-slate-600 hover:bg-blue-500 transition-colors
                  `}
                />
              )}
              <Panel defaultSize={pane.size}>
                <TerminalPane
                  paneId={pane.id}
                  terminalId={pane.terminalId}
                  terminalName={getTerminalName(pane.terminalId)}
                  isFocused={focusedPaneId === pane.id}
                  onFocus={() => setFocusedPane(pane.id)}
                  onClose={() => closeSplit(pane.id)}
                  onTerminalChange={(terminalId) => updatePaneTerminal(pane.id, terminalId)}
                  terminals={terminals}
                  showCloseButton={projectPanes.length > 1}
                />
              </Panel>
            </React.Fragment>
          ))}
        </PanelGroup>
      </div>
    </div>
  )
}

interface TerminalPaneProps {
  paneId: string
  terminalId: string
  terminalName: string
  isFocused: boolean
  onFocus: () => void
  onClose: () => void
  onTerminalChange: (terminalId: string) => void
  terminals: Array<{ id: string; name: string; status: string }>
  showCloseButton: boolean
}

function TerminalPane({
  paneId,
  terminalId,
  terminalName,
  isFocused,
  onFocus,
  onClose,
  onTerminalChange,
  terminals,
  showCloseButton
}: TerminalPaneProps) {
  return (
    <div
      data-testid={`pane-${paneId}`}
      className={`h-full flex flex-col ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
      onClick={onFocus}
    >
      {/* Pane header */}
      <div className="h-6 bg-background-secondary border-b border-border flex items-center justify-between px-2">
        <select
          value={terminalId}
          onChange={(e) => onTerminalChange(e.target.value)}
          className="text-xs bg-transparent text-slate-300 border-none outline-none cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {terminals.map((t) => (
            <option key={t.id} value={t.id} className="bg-background">
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{terminalName}</span>
        {showCloseButton && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            title="Close pane"
            className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-red-500/20"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Terminal content */}
      <div className="flex-1">
        <Terminal terminalId={terminalId} />
      </div>
    </div>
  )
}

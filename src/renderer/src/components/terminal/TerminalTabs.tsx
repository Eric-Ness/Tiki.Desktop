import { useState, useCallback, useEffect } from 'react'
import { Terminal } from './Terminal'

interface TerminalTab {
  id: string
  name: string
}

interface TerminalTabsProps {
  cwd: string
}

export function TerminalTabs({ cwd }: TerminalTabsProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  // Create initial terminal on mount
  useEffect(() => {
    if (tabs.length === 0 && cwd) {
      createTerminal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd])

  const createTerminal = useCallback(async () => {
    if (!cwd) return

    const id = await window.tikiDesktop.terminal.create(cwd)
    const newTab: TerminalTab = {
      id,
      name: `Terminal ${tabs.length + 1}`
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTab(id)
  }, [cwd, tabs.length])

  const closeTerminal = useCallback(async (tabId: string) => {
    await window.tikiDesktop.terminal.kill(tabId)
    setTabs((prev) => prev.filter((t) => t.id !== tabId))

    // Switch to another tab if we closed the active one
    if (activeTab === tabId) {
      const remaining = tabs.filter((t) => t.id !== tabId)
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    }
  }, [activeTab, tabs])

  if (!cwd) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <p>No project directory set</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="h-8 bg-background-tertiary border-b border-border flex items-center px-1 gap-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer
              ${activeTab === tab.id
                ? 'bg-background text-white'
                : 'text-slate-400 hover:text-white hover:bg-background/50'
              }
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTerminal(tab.id)
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* New terminal button */}
        <button
          onClick={createTerminal}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-background/50"
          title="New Terminal"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${activeTab === tab.id ? 'visible' : 'invisible'}`}
          >
            <Terminal terminalId={tab.id} />
          </div>
        ))}

        {tabs.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <p className="text-sm mb-3">No terminals open</p>
              <button
                onClick={createTerminal}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium transition-colors"
              >
                New Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from './Terminal'
import { useTikiStore } from '../../stores/tiki-store'
import { useTerminalShortcuts } from '../../hooks/useTerminalShortcuts'

interface TerminalTabsProps {
  cwd: string
}

export function TerminalTabs({ cwd }: TerminalTabsProps) {
  // Get terminal state and actions from the store
  const terminals = useTikiStore((state) => state.terminals)
  const activeTerminal = useTikiStore((state) => state.activeTerminal)
  const closeTab = useTikiStore((state) => state.closeTab)
  const setActiveTerminalTab = useTikiStore((state) => state.setActiveTerminalTab)
  const renameTab = useTikiStore((state) => state.renameTab)
  const setTabStatus = useTikiStore((state) => state.setTabStatus)

  // Edit mode state
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Track whether we've initialized a terminal for this cwd
  const initializedRef = useRef(false)

  // Register keyboard shortcuts
  useTerminalShortcuts()

  // Subscribe to terminal status changes from main process
  useEffect(() => {
    const unsubscribe = window.tikiDesktop.terminal.onStatusChange((id, status) => {
      // Map main process status to store status
      const storeStatus = status === 'running' ? 'busy' : 'idle'
      setTabStatus(id, storeStatus)
    })
    return unsubscribe
  }, [setTabStatus])

  // Enter edit mode for a tab
  const enterEditMode = useCallback((tabId: string, currentName: string) => {
    setEditingTabId(tabId)
    setEditValue(currentName)
    // Focus input after state update
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }, [])

  // Save the edited name
  const saveEdit = useCallback(() => {
    if (editingTabId) {
      const trimmedValue = editValue.trim()
      if (trimmedValue) {
        renameTab(editingTabId, trimmedValue)
      } else {
        // Revert to default name for empty input
        const index = terminals.findIndex(t => t.id === editingTabId)
        renameTab(editingTabId, `Terminal ${index + 1}`)
      }
      setEditingTabId(null)
      setEditValue('')
    }
  }, [editingTabId, editValue, renameTab, terminals])

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingTabId(null)
    setEditValue('')
  }, [])

  // Handle input key events
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  // Create initial terminal on mount
  useEffect(() => {
    if (terminals.length === 0 && cwd && !initializedRef.current) {
      initializedRef.current = true
      createTerminal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd])

  // Reset initialization flag when cwd changes
  useEffect(() => {
    initializedRef.current = false
  }, [cwd])

  const createTerminal = useCallback(async () => {
    if (!cwd) return

    try {
      const ptyId = await window.tikiDesktop.terminal.create(cwd)
      const tabName = `Terminal ${terminals.length + 1}`
      // Create a tab in the store with the PTY ID
      // Note: We need to use the PTY ID as the tab ID so the Terminal component can connect
      useTikiStore.setState((state) => ({
        terminals: [...state.terminals, { id: ptyId, name: tabName, status: 'active' as const }],
        activeTerminal: ptyId
      }))
    } catch (error) {
      console.error('Failed to create terminal:', error)
    }
  }, [cwd, terminals.length])

  const closeTerminal = useCallback(async (tabId: string) => {
    try {
      await window.tikiDesktop.terminal.kill(tabId)
    } catch (error) {
      console.error('Failed to kill terminal:', error)
    }

    // Get current state to check if this is the last terminal
    const currentTerminals = useTikiStore.getState().terminals
    const remainingTerminals = currentTerminals.filter((t) => t.id !== tabId)

    if (remainingTerminals.length === 0 && cwd) {
      // If closing the last terminal, create a new one
      closeTab(tabId)
      // The store's closeTab will auto-create a new tab, but we need to create a PTY for it
      setTimeout(async () => {
        try {
          const ptyId = await window.tikiDesktop.terminal.create(cwd)
          useTikiStore.setState({
            terminals: [{ id: ptyId, name: 'Terminal 1', status: 'active' as const }],
            activeTerminal: ptyId
          })
        } catch (error) {
          console.error('Failed to create replacement terminal:', error)
        }
      }, 0)
    } else {
      // Just close the tab normally
      closeTab(tabId)
    }
  }, [cwd, closeTab])

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
        {terminals.map((tab, index) => (
          <div
            key={tab.id}
            className={`
              group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer
              ${activeTerminal === tab.id
                ? 'bg-background text-white'
                : 'text-slate-400 hover:text-white hover:bg-background/50'
              }
            `}
            onClick={() => setActiveTerminalTab(tab.id)}
            title={`${tab.name} (Ctrl+${index + 1})`}
          >
            {/* Status indicator dot */}
            <span
              data-testid={`status-indicator-${tab.id}`}
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                tab.status === 'busy' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
              }`}
              title={tab.status === 'busy' ? 'Running' : 'Idle'}
            />
            {editingTabId === tab.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={saveEdit}
                className="bg-slate-700 text-white text-xs px-1 py-0.5 rounded outline-none focus:ring-1 focus:ring-amber-500 w-24"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  data-testid={`tab-name-${tab.id}`}
                  className="truncate max-w-[120px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    enterEditMode(tab.id, tab.name)
                  }}
                >
                  {tab.name}
                </span>
                <button
                  data-testid={`edit-icon-${tab.id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    enterEditMode(tab.id, tab.name)
                  }}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-600/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename terminal"
                >
                  <svg data-testid="edit-icon" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTerminal(tab.id)
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Close terminal (Ctrl+W)"
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
          title="New Terminal (Ctrl+Shift+T)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden relative">
        {terminals.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${activeTerminal === tab.id ? 'visible' : 'invisible'}`}
          >
            <Terminal terminalId={tab.id} />
          </div>
        ))}

        {terminals.length === 0 && (
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
                New Terminal (Ctrl+Shift+T)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

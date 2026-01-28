import { useState } from 'react'

type Tab = 'terminal' | 'workflow' | 'config'

export function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>('terminal')

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Bar */}
      <div className="h-9 bg-background-secondary border-b border-border flex items-center px-2 gap-1">
        <TabButton
          active={activeTab === 'terminal'}
          onClick={() => setActiveTab('terminal')}
        >
          Terminal
        </TabButton>
        <TabButton
          active={activeTab === 'workflow'}
          onClick={() => setActiveTab('workflow')}
        >
          Workflow
        </TabButton>
        <TabButton
          active={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
        >
          Config
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <TerminalPlaceholder />}
        {activeTab === 'workflow' && <WorkflowPlaceholder />}
        {activeTab === 'config' && <ConfigPlaceholder />}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 text-sm rounded transition-colors
        ${active
          ? 'bg-background text-white'
          : 'text-slate-400 hover:text-white hover:bg-background-tertiary'
        }
      `}
    >
      {children}
    </button>
  )
}

function TerminalPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-slate-500">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <p className="text-lg mb-2">Terminal</p>
        <p className="text-sm">Terminal integration coming in issue #2</p>
      </div>
    </div>
  )
}

function WorkflowPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-slate-500">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="15" y="3" width="6" height="6" rx="1" />
          <rect x="9" y="15" width="6" height="6" rx="1" />
          <path d="M6 9v3a1 1 0 0 0 1 1h4" />
          <path d="M18 9v3a1 1 0 0 1-1 1h-4" />
        </svg>
        <p className="text-lg mb-2">Workflow Diagram</p>
        <p className="text-sm">React Flow integration coming in issue #6</p>
      </div>
    </div>
  )
}

function ConfigPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-slate-500">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <p className="text-lg mb-2">Configuration</p>
        <p className="text-sm">.tiki/config.json editor</p>
      </div>
    </div>
  )
}

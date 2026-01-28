import { useState } from 'react'
import { TerminalTabs } from '../terminal/TerminalTabs'
import { WorkflowCanvas } from '../workflow/WorkflowCanvas'

type Tab = 'terminal' | 'workflow' | 'config'

interface MainContentProps {
  cwd: string
}

export function MainContent({ cwd }: MainContentProps) {
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
        {activeTab === 'terminal' && <TerminalTabs cwd={cwd} />}
        {activeTab === 'workflow' && <WorkflowCanvas />}
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
        px-3 py-1 text-sm rounded transition-all duration-150
        ${active
          ? 'bg-background text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-background-tertiary active:bg-background-tertiary/70'
        }
      `}
    >
      {children}
    </button>
  )
}

function ConfigPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-slate-500">
      <div className="text-center px-6 max-w-[280px]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-tertiary/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">Configuration</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          .tiki/config.json editor
        </p>
      </div>
    </div>
  )
}

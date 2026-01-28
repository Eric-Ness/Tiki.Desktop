import { useState } from 'react'
import { TerminalTabs } from '../terminal/TerminalTabs'
import { WorkflowCanvas } from '../workflow/WorkflowCanvas'
import { ConfigEditor } from '../config'

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
        {activeTab === 'config' && <ConfigEditor />}
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


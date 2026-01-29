import { useState, useCallback, useEffect } from 'react'
import { SettingsNav, type SettingsCategoryId } from './SettingsNav'
import { AppearanceSection } from './sections/AppearanceSection'
import { TerminalSection } from './sections/TerminalSection'
import { NotificationsSection } from './sections/NotificationsSection'
import { KeyboardShortcutsSection } from './sections/KeyboardShortcutsSection'
import { GitHubSection } from './sections/GitHubSection'
import { DataPrivacySection } from './sections/DataPrivacySection'
import { AboutSection } from './sections/AboutSection'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('appearance')

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  // Reset to first category when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveCategory('appearance')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const renderSection = () => {
    switch (activeCategory) {
      case 'appearance':
        return <AppearanceSection />
      case 'terminal':
        return <TerminalSection />
      case 'notifications':
        return <NotificationsSection />
      case 'keyboardShortcuts':
        return <KeyboardShortcutsSection />
      case 'github':
        return <GitHubSection />
      case 'dataPrivacy':
        return <DataPrivacySection />
      case 'about':
        return <AboutSection />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl h-[600px] bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-background-tertiary transition-colors"
              aria-label="Close settings"
            >
              <svg
                className="w-5 h-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Navigation */}
            <div className="w-56 border-r border-border bg-background">
              <SettingsNav
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
              />
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

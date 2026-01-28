import { useState, useEffect, useCallback } from 'react'
import { useTikiStore } from '../../stores/tiki-store'
import { ConfigSection } from './ConfigSection'
import { ConfigToggle, ConfigSelect, ConfigInput } from './ConfigField'

// Mirror the TikiConfig type from main process
interface TikiConfig {
  tdd: {
    enabled: boolean
    framework: 'vitest' | 'jest' | 'pytest' | 'mocha' | 'other'
  }
  releases: {
    requirementsEnabled: boolean
    milestoneSync: boolean
  }
  execution: {
    autoCommit: boolean
    pauseOnFailure: boolean
  }
  knowledge: {
    autoCapture: boolean
    maxEntries: number
  }
}

const defaultConfig: TikiConfig = {
  tdd: {
    enabled: true,
    framework: 'vitest'
  },
  releases: {
    requirementsEnabled: true,
    milestoneSync: true
  },
  execution: {
    autoCommit: true,
    pauseOnFailure: true
  },
  knowledge: {
    autoCapture: true,
    maxEntries: 100
  }
}

export function ConfigEditor() {
  const activeProject = useTikiStore((state) => state.activeProject)
  const [config, setConfig] = useState<TikiConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [configExists, setConfigExists] = useState(false)

  // Load config on mount or project change
  useEffect(() => {
    async function loadConfig() {
      if (!activeProject?.path) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await window.tikiDesktop.config.read(activeProject.path)
        if (result.error) {
          setError(result.error)
        } else {
          setConfig(result.config)
          setConfigExists(result.exists)
        }
      } catch (err) {
        setError(`Failed to load config: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
    setHasChanges(false)
  }, [activeProject?.path])

  // Update a config value
  const updateConfig = useCallback(
    <K extends keyof TikiConfig, F extends keyof TikiConfig[K]>(
      section: K,
      field: F,
      value: TikiConfig[K][F]
    ) => {
      setConfig((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }))
      setHasChanges(true)
    },
    []
  )

  // Save config
  const handleSave = useCallback(async () => {
    if (!activeProject?.path) return

    setSaving(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.config.write(activeProject.path, config)
      if (!result.success) {
        setError(result.error || 'Failed to save config')
      } else {
        setHasChanges(false)
        setConfigExists(true)
      }
    } catch (err) {
      setError(`Failed to save config: ${err}`)
    } finally {
      setSaving(false)
    }
  }, [activeProject?.path, config])

  // Reset to defaults
  const handleReset = useCallback(async () => {
    if (!activeProject?.path) return

    setSaving(true)
    setError(null)

    try {
      const result = await window.tikiDesktop.config.reset(activeProject.path)
      if (!result.success) {
        setError(result.error || 'Failed to reset config')
      } else {
        setConfig(result.config)
        setHasChanges(false)
        setConfigExists(true)
      }
    } catch (err) {
      setError(`Failed to reset config: ${err}`)
    } finally {
      setSaving(false)
    }
  }, [activeProject?.path])

  // No project selected
  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center px-6">
          <p className="text-sm">No project selected</p>
          <p className="text-xs mt-1 text-slate-600">
            Select a project to edit its Tiki configuration
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-200">Tiki Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {configExists ? '.tiki/config.json' : 'Config file will be created on save'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-background-tertiary rounded transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              hasChanges
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-background-tertiary text-slate-400'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Config sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TDD Section */}
        <ConfigSection
          title="Test-Driven Development"
          description="Configure TDD workflow and testing framework"
        >
          <ConfigToggle
            label="Enable TDD"
            description="Run tests as part of the development workflow"
            checked={config.tdd.enabled}
            onChange={(value) => updateConfig('tdd', 'enabled', value)}
          />
          <ConfigSelect
            label="Test Framework"
            description="Testing framework to use for the project"
            value={config.tdd.framework}
            options={[
              { value: 'vitest', label: 'Vitest' },
              { value: 'jest', label: 'Jest' },
              { value: 'pytest', label: 'pytest' },
              { value: 'mocha', label: 'Mocha' },
              { value: 'other', label: 'Other' }
            ]}
            onChange={(value) =>
              updateConfig('tdd', 'framework', value as TikiConfig['tdd']['framework'])
            }
          />
        </ConfigSection>

        {/* Releases Section */}
        <ConfigSection
          title="Releases"
          description="Configure release management and tracking"
        >
          <ConfigToggle
            label="Requirements Tracking"
            description="Track requirements and acceptance criteria for releases"
            checked={config.releases.requirementsEnabled}
            onChange={(value) => updateConfig('releases', 'requirementsEnabled', value)}
          />
          <ConfigToggle
            label="GitHub Milestone Sync"
            description="Sync release issues with GitHub milestones"
            checked={config.releases.milestoneSync}
            onChange={(value) => updateConfig('releases', 'milestoneSync', value)}
          />
        </ConfigSection>

        {/* Execution Section */}
        <ConfigSection
          title="Execution"
          description="Configure workflow execution behavior"
        >
          <ConfigToggle
            label="Auto-commit"
            description="Automatically commit changes after successful phases"
            checked={config.execution.autoCommit}
            onChange={(value) => updateConfig('execution', 'autoCommit', value)}
          />
          <ConfigToggle
            label="Pause on Failure"
            description="Stop execution when a phase fails"
            checked={config.execution.pauseOnFailure}
            onChange={(value) => updateConfig('execution', 'pauseOnFailure', value)}
          />
        </ConfigSection>

        {/* Knowledge Section */}
        <ConfigSection
          title="Knowledge"
          description="Configure institutional knowledge capture"
        >
          <ConfigToggle
            label="Auto-capture"
            description="Automatically capture knowledge from completed issues"
            checked={config.knowledge.autoCapture}
            onChange={(value) => updateConfig('knowledge', 'autoCapture', value)}
          />
          <ConfigInput
            label="Max Entries"
            description="Maximum number of knowledge entries to keep (1-1000)"
            type="number"
            value={config.knowledge.maxEntries}
            min={1}
            max={1000}
            onChange={(value) => updateConfig('knowledge', 'maxEntries', value as number)}
          />
        </ConfigSection>
      </div>
    </div>
  )
}

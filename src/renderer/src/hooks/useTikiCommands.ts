import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TikiCommand } from '../lib/command-registry'

interface UseTikiCommandsResult {
  commands: TikiCommand[]
  filteredCommands: TikiCommand[]
  loading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  reload: () => Promise<void>
}

/**
 * Hook to load and search Tiki commands from .claude/commands/tiki/*.md
 */
export function useTikiCommands(): UseTikiCommandsResult {
  const [commands, setCommands] = useState<TikiCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadCommands = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loadedCommands = await window.tikiDesktop.tiki.getCommands()
      setCommands(loadedCommands)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load commands'
      setError(message)
      setCommands([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load commands on mount
  useEffect(() => {
    loadCommands()
  }, [loadCommands])

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands
    }

    const query = searchQuery.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.displayName.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
    )
  }, [commands, searchQuery])

  return {
    commands,
    filteredCommands,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    reload: loadCommands
  }
}

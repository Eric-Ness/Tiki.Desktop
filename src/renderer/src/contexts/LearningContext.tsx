import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type {
  LearningProgress,
  LearningConceptExplanation,
  LearningPhaseExplanation
} from '../../../preload'
import { logger } from '../lib/logger'

// Re-export types for convenience
export type { LearningProgress, LearningConceptExplanation, LearningPhaseExplanation }

// Alias for component use
export type ConceptExplanation = LearningConceptExplanation
export type PhaseExplanation = LearningPhaseExplanation

export interface LearningContextValue {
  progress: LearningProgress | null
  loading: boolean
  learningModeEnabled: boolean
  expertModeEnabled: boolean

  // Actions
  toggleLearningMode: () => Promise<void>
  toggleExpertMode: () => Promise<void>
  markConceptSeen: (conceptId: string) => Promise<void>
  shouldShowExplanation: (conceptId: string) => Promise<boolean>
  getExplanation: (conceptId: string) => Promise<ConceptExplanation | null>
  getPhaseExplanation: (phase: { title: string; files: string[] }) => Promise<PhaseExplanation>
  refreshProgress: () => Promise<void>
}

const LearningContext = createContext<LearningContextValue | null>(null)

interface LearningProviderProps {
  children: ReactNode
}

export function LearningProvider({ children }: LearningProviderProps) {
  const [progress, setProgress] = useState<LearningProgress | null>(null)
  const [loading, setLoading] = useState(true)

  // Derived state
  const learningModeEnabled = progress?.learningModeEnabled ?? false
  const expertModeEnabled = progress?.expertModeEnabled ?? false

  // Load initial progress from main process
  useEffect(() => {
    async function loadProgress() {
      try {
        const loaded = await window.tikiDesktop.learning.getProgress()
        setProgress(loaded)
      } catch (err) {
        logger.error('Failed to load learning progress:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [])

  // Refresh progress from main process
  const refreshProgress = useCallback(async () => {
    try {
      const loaded = await window.tikiDesktop.learning.getProgress()
      setProgress(loaded)
    } catch (err) {
      logger.error('Failed to refresh learning progress:', err)
      throw err
    }
  }, [])

  // Toggle learning mode
  const toggleLearningMode = useCallback(async () => {
    const newValue = !learningModeEnabled
    try {
      await window.tikiDesktop.learning.setLearningMode(newValue)
      setProgress((prev) =>
        prev ? { ...prev, learningModeEnabled: newValue } : prev
      )
    } catch (err) {
      logger.error('Failed to toggle learning mode:', err)
      throw err
    }
  }, [learningModeEnabled])

  // Toggle expert mode
  const toggleExpertMode = useCallback(async () => {
    const newValue = !expertModeEnabled
    try {
      await window.tikiDesktop.learning.setExpertMode(newValue)
      setProgress((prev) =>
        prev ? { ...prev, expertModeEnabled: newValue } : prev
      )
    } catch (err) {
      logger.error('Failed to toggle expert mode:', err)
      throw err
    }
  }, [expertModeEnabled])

  // Mark concept as seen
  const markConceptSeen = useCallback(async (conceptId: string) => {
    try {
      await window.tikiDesktop.learning.markConceptSeen(conceptId)
      setProgress((prev) => {
        if (!prev) return prev
        if (prev.conceptsSeen.includes(conceptId)) return prev
        return {
          ...prev,
          conceptsSeen: [...prev.conceptsSeen, conceptId]
        }
      })
    } catch (err) {
      logger.error('Failed to mark concept as seen:', err)
      throw err
    }
  }, [])

  // Check if explanation should be shown
  const shouldShowExplanation = useCallback(async (conceptId: string): Promise<boolean> => {
    try {
      return await window.tikiDesktop.learning.shouldShow(conceptId)
    } catch (err) {
      logger.error('Failed to check if explanation should show:', err)
      return false
    }
  }, [])

  // Get explanation for a concept
  const getExplanation = useCallback(async (conceptId: string): Promise<ConceptExplanation | null> => {
    try {
      return await window.tikiDesktop.learning.getExplanation(conceptId)
    } catch (err) {
      logger.error('Failed to get explanation:', err)
      return null
    }
  }, [])

  // Get explanation for a phase
  const getPhaseExplanation = useCallback(async (phase: { title: string; files: string[] }): Promise<PhaseExplanation> => {
    try {
      return await window.tikiDesktop.learning.getPhaseExplanation(phase)
    } catch (err) {
      logger.error('Failed to get phase explanation:', err)
      // Return a default explanation on error
      return {
        whyThisPhase: 'Unable to load explanation',
        whatHappens: [],
        conceptsInvolved: []
      }
    }
  }, [])

  return (
    <LearningContext.Provider
      value={{
        progress,
        loading,
        learningModeEnabled,
        expertModeEnabled,
        toggleLearningMode,
        toggleExpertMode,
        markConceptSeen,
        shouldShowExplanation,
        getExplanation,
        getPhaseExplanation,
        refreshProgress
      }}
    >
      {children}
    </LearningContext.Provider>
  )
}

export function useLearning(): LearningContextValue {
  const context = useContext(LearningContext)
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider')
  }
  return context
}

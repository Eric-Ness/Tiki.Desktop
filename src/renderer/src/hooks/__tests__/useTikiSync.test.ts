import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTikiSync, mapRawStateToTikiState } from '../useTikiSync'
import type { Project, ExecutionPlan, TikiState } from '../../stores/tiki-store'

// Create mocks that we can track
const setTikiStateMock = vi.fn()
const setYoloStateMock = vi.fn()
const setReleasesMock = vi.fn()
const setQueueMock = vi.fn()
const setPlanMock = vi.fn()
const setCurrentPlanMock = vi.fn()
const updateReleaseMock = vi.fn()
const setPhasesDisplayMock = vi.fn()

// Track the tikiState and yoloState values for the mock
let mockTikiState: TikiState | null = null
let mockYoloState: unknown = null

// Mock the tiki store - must define inline to work with vi.mock hoisting
vi.mock('../../stores/tiki-store', async () => {
  // Create a mock store with getState method
  const createMockState = () => ({
    setTikiState: setTikiStateMock,
    setYoloState: setYoloStateMock,
    setPlan: setPlanMock,
    setCurrentPlan: setCurrentPlanMock,
    setQueue: setQueueMock,
    setReleases: setReleasesMock,
    updateRelease: updateReleaseMock,
    setPhasesDisplay: setPhasesDisplayMock,
    tikiState: mockTikiState,
    yoloState: mockYoloState
  })

  // Create mock useTikiStore function with getState support
  const mockFn = vi.fn((selector: (state: ReturnType<typeof createMockState>) => unknown) => selector(createMockState()))
  // Add getState method for direct state access (used in callbacks to avoid stale closures)
  // Use Object.assign to satisfy TypeScript while adding the getState property
  const mockWithGetState = Object.assign(mockFn, {
    getState: () => createMockState()
  })

  return {
    useTikiStore: mockWithGetState
  }
})

// Mock window.tikiDesktop
const mockGetReleases = vi.fn(() => Promise.resolve([]))
const mockGetState = vi.fn(() => Promise.resolve(null))
const mockGetYoloState = vi.fn(() => Promise.resolve(null))
const mockGetQueue = vi.fn(() => Promise.resolve([]))
const mockGetPlan = vi.fn(() => Promise.resolve(null))
const mockOnStateChange = vi.fn(() => vi.fn())
const mockOnYoloChange = vi.fn(() => vi.fn())
const mockOnQueueChange = vi.fn(() => vi.fn())
const mockOnReleaseChange = vi.fn(() => vi.fn())

// Store the plan change callback so we can invoke it in tests
let onPlanChangeCallback: ((data: { plan: ExecutionPlan }) => void) | null = null
const mockOnPlanChange = vi.fn((callback: (data: { plan: ExecutionPlan }) => void) => {
  onPlanChangeCallback = callback
  return vi.fn() // cleanup function
})

// Store the callback so we can invoke it
let onSwitchedCallback: ((data: { path: string }) => void) | null = null
const mockOnSwitched = vi.fn((callback: (data: { path: string }) => void) => {
  onSwitchedCallback = callback
  return vi.fn() // cleanup function
})

const mockOnPhasesChange = vi.fn(() => vi.fn())
const mockGetPhases = vi.fn(() => Promise.resolve(null))

const mockTikiDesktop = {
  tiki: {
    onStateChange: mockOnStateChange,
    onYoloChange: mockOnYoloChange,
    onPlanChange: mockOnPlanChange,
    onQueueChange: mockOnQueueChange,
    onReleaseChange: mockOnReleaseChange,
    onPhasesChange: mockOnPhasesChange,
    getState: mockGetState,
    getYoloState: mockGetYoloState,
    getReleases: mockGetReleases,
    getQueue: mockGetQueue,
    getPlan: mockGetPlan,
    getPhases: mockGetPhases
  },
  projects: {
    onSwitched: mockOnSwitched
  }
}

describe('useTikiSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSwitchedCallback = null
    onPlanChangeCallback = null
    mockTikiState = null
    mockYoloState = null
    // @ts-expect-error - mocking window.tikiDesktop
    window.tikiDesktop = mockTikiDesktop
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('activeProject guard', () => {
    it('should not load releases when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(mockGetReleases).not.toHaveBeenCalled()
    })

    it('should not load state when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(mockGetState).not.toHaveBeenCalled()
    })

    it('should clear releases when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(setReleasesMock).toHaveBeenCalledWith([])
    })

    it('should clear tikiState when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(setTikiStateMock).toHaveBeenCalledWith(null)
    })

    it('should clear queue when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(setQueueMock).toHaveBeenCalledWith([])
    })

    it('should clear phasesDisplay when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(setPhasesDisplayMock).toHaveBeenCalledWith(null)
    })

    it('should NOT load data immediately when activeProject is provided (waits for switch event)', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      // Data should NOT be loaded immediately - it waits for the onSwitched event
      expect(mockGetReleases).not.toHaveBeenCalled()
      expect(mockGetState).not.toHaveBeenCalled()
    })

    it('should load data when projects:switched event is received', async () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      // Simulate the project switch completion event
      act(() => {
        onSwitchedCallback?.({ path: '/test/path' })
      })

      // Now data should be loaded
      await waitFor(() => {
        expect(mockGetReleases).toHaveBeenCalled()
        expect(mockGetState).toHaveBeenCalled()
        expect(mockGetQueue).toHaveBeenCalled()
      })
    })

    it('should ignore switch events for different projects', async () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      // Simulate a switch event for a DIFFERENT project
      act(() => {
        onSwitchedCallback?.({ path: '/different/path' })
      })

      // Data should NOT be loaded since path doesn't match
      expect(mockGetReleases).not.toHaveBeenCalled()
      expect(mockGetState).not.toHaveBeenCalled()
    })

    it('should set up event listeners when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      expect(mockOnStateChange).toHaveBeenCalled()
      expect(mockOnPlanChange).toHaveBeenCalled()
      expect(mockOnQueueChange).toHaveBeenCalled()
      expect(mockOnReleaseChange).toHaveBeenCalled()
      expect(mockOnSwitched).toHaveBeenCalled()
    })

    it('should not set up event listeners when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(mockOnStateChange).not.toHaveBeenCalled()
      expect(mockOnPlanChange).not.toHaveBeenCalled()
      expect(mockOnQueueChange).not.toHaveBeenCalled()
      expect(mockOnReleaseChange).not.toHaveBeenCalled()
      expect(mockOnSwitched).not.toHaveBeenCalled()
    })

    it('should clear state when activeProject becomes null', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      const { rerender } = renderHook(
        ({ project }) => useTikiSync(project),
        { initialProps: { project: mockProject as Project | null } }
      )

      // Clear mocks from initial render
      vi.clearAllMocks()

      // Change activeProject to null
      rerender({ project: null })

      // The hook should clear releases when project becomes null
      expect(setReleasesMock).toHaveBeenCalledWith([])
      expect(setTikiStateMock).toHaveBeenCalledWith(null)
      expect(setQueueMock).toHaveBeenCalledWith([])
    })

    it('should only load data once per project (prevents duplicate loads)', async () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      // First switch event
      act(() => {
        onSwitchedCallback?.({ path: '/test/path' })
      })

      await waitFor(() => {
        expect(mockGetReleases).toHaveBeenCalledTimes(1)
      })

      // Clear mocks
      vi.clearAllMocks()

      // Second switch event for the same path should be ignored
      act(() => {
        onSwitchedCallback?.({ path: '/test/path' })
      })

      // Should NOT load data again
      expect(mockGetReleases).not.toHaveBeenCalled()
    })
  })

  describe('plan change handling', () => {
    const mockProject: Project = {
      id: '1',
      name: 'Test Project',
      path: '/test/path'
    }

    it('should update plans cache when a plan file changes', () => {
      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      expect(setPlanMock).toHaveBeenCalledWith(42, mockPlan)
    })

    it('should update currentPlan when plan matches activeIssue in tikiState', () => {
      // Set up tikiState with an activeIssue
      mockTikiState = {
        activeIssue: 42,
        currentPhase: 1,
        status: 'executing',
        completedPhases: [],
        lastActivity: null
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'in_progress', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
    })

    it('should NOT update currentPlan when plan does not match activeIssue', () => {
      // Set up tikiState with a DIFFERENT activeIssue
      mockTikiState = {
        activeIssue: 99, // Different from the plan's issue
        currentPhase: 1,
        status: 'executing',
        completedPhases: [],
        lastActivity: null
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'in_progress', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // setPlan should be called to update the cache
      expect(setPlanMock).toHaveBeenCalledWith(42, mockPlan)
      // But setCurrentPlan should NOT be called since issue doesn't match
      expect(setCurrentPlanMock).not.toHaveBeenCalled()
    })
  })

  describe('simplified plan change handling (phases.json is now authoritative)', () => {
    const mockProject: Project = {
      id: '1',
      name: 'Test Project',
      path: '/test/path'
    }

    it('should NOT set currentPlan when plan has in_progress phase but no activeIssue in state', () => {
      // With phases.json being authoritative, we no longer derive state from plans
      // when there's no active issue in state
      mockTikiState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'in_progress', files: [], verification: [] },
          { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // Plan should be cached
      expect(setPlanMock).toHaveBeenCalledWith(42, mockPlan)
      // But NOT set as currentPlan since no activeIssue matches
      expect(setCurrentPlanMock).not.toHaveBeenCalled()
      // And state should NOT be derived from plan
      const derivedStateCalls = setTikiStateMock.mock.calls.filter(
        (call) => call[0]?.activeIssue === 42
      )
      expect(derivedStateCalls).toHaveLength(0)
    })

    it('should NOT derive tikiState from plan phases anymore', () => {
      // State is now derived from phases.json, not plans
      mockTikiState = {
        activeIssue: 42,
        currentPhase: 2,
        status: 'executing',
        completedPhases: [1],
        lastActivity: '2024-01-15T10:00:00Z'
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] },
          { number: 3, title: 'Phase 3', status: 'in_progress', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // Plan should be cached and set as current
      expect(setPlanMock).toHaveBeenCalledWith(42, mockPlan)
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
      // But setTikiState should NOT be called to derive state from plan
      // State panel now uses phases.json as the authoritative source
      expect(setTikiStateMock).not.toHaveBeenCalled()
    })

    it('should set currentPlan when activeIssue matches plan issue number', () => {
      mockTikiState = {
        activeIssue: 42,
        currentPhase: 2,
        status: 'executing',
        completedPhases: [1],
        lastActivity: '2024-01-15T10:00:00Z'
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'in_progress', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // Should set currentPlan since activeIssue matches
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
    })

    it('should set currentPlan when yoloState.currentIssue matches plan issue number', () => {
      mockTikiState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null
      }
      mockYoloState = {
        release: 'v1.0.0',
        status: 'in_progress',
        currentIssue: 42,
        issueOrder: [42, 43],
        completedIssues: [],
        skippedIssues: [],
        failedIssues: []
      }

      renderHook(() => useTikiSync(mockProject))

      const mockPlan: ExecutionPlan = {
        issue: { number: 42, title: 'Test Issue' },
        status: 'in_progress',
        phases: [
          { number: 1, title: 'Phase 1', status: 'in_progress', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // Should set currentPlan since yoloState.currentIssue matches
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
    })
  })
})

// Note: getPlanExecutionStatus was removed in State Panel Redesign Phase 4
// The function was part of plan-based state derivation which is now replaced by phases.json

describe('mapRawStateToTikiState', () => {
  describe('simplified format (v3)', () => {
    it('should map simplified format fields correctly', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 2,
        status: 'executing',
        completedPhases: [1],
        lastActivity: '2024-01-15T10:00:00Z'
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result).not.toBeNull()
      expect(result?.activeIssue).toBe(42)
      expect(result?.currentPhase).toBe(2)
      expect(result?.status).toBe('executing')
      expect(result?.completedPhases).toEqual([1])
      expect(result?.lastActivity).toBe('2024-01-15T10:00:00Z')
    })

    it('should map new v3 fields correctly (startedAt, lastCompletedIssue, etc.)', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 3,
        status: 'executing',
        completedPhases: [1, 2],
        lastActivity: '2024-01-15T10:00:00Z',
        startedAt: '2024-01-15T09:00:00Z',
        lastCompletedIssue: 41,
        lastCompletedAt: '2024-01-14T18:00:00Z',
        totalPhases: 5,
        activeIssueTitle: 'Add user authentication'
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result).not.toBeNull()
      expect(result?.startedAt).toBe('2024-01-15T09:00:00Z')
      expect(result?.lastCompletedIssue).toBe(41)
      expect(result?.lastCompletedAt).toBe('2024-01-14T18:00:00Z')
      expect(result?.totalPhases).toBe(5)
      expect(result?.activeIssueTitle).toBe('Add user authentication')
    })

    it('should handle missing v3 fields gracefully (undefined)', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 1,
        status: 'executing',
        completedPhases: [],
        lastActivity: '2024-01-15T10:00:00Z'
        // No v3 fields provided
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result).not.toBeNull()
      expect(result?.startedAt).toBeUndefined()
      expect(result?.lastCompletedIssue).toBeUndefined()
      expect(result?.lastCompletedAt).toBeUndefined()
      expect(result?.totalPhases).toBeUndefined()
      expect(result?.activeIssueTitle).toBeUndefined()
    })

    it('should handle null values for v3 fields', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 1,
        status: 'executing',
        completedPhases: [],
        lastActivity: null,
        startedAt: null,
        lastCompletedIssue: null,
        lastCompletedAt: null,
        totalPhases: null,
        activeIssueTitle: null
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result).not.toBeNull()
      expect(result?.startedAt).toBeNull()
      expect(result?.lastCompletedIssue).toBeNull()
      expect(result?.lastCompletedAt).toBeNull()
      expect(result?.totalPhases).toBeNull()
      expect(result?.activeIssueTitle).toBeNull()
    })
  })

  describe('v2 format with activeExecutions', () => {
    it('should map activeExecutions to executions array', () => {
      const rawState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null,
        activeExecutions: [
          {
            id: 'exec-1',
            issue: 42,
            currentPhase: 2,
            totalPhases: 4,
            status: 'executing',
            completedPhases: [1],
            startedAt: '2024-01-15T09:00:00Z'
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result).not.toBeNull()
      expect(result?.executions).toHaveLength(1)
      expect(result?.executions?.[0]).toMatchObject({
        issueNumber: 42,
        status: 'executing',
        currentPhase: 2,
        totalPhases: 4,
        completedPhases: [1],
        startedAt: '2024-01-15T09:00:00Z'
      })
    })

    it('should handle issueNumber field instead of issue', () => {
      const rawState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null,
        activeExecutions: [
          {
            id: 'exec-1',
            issueNumber: 55,
            status: 'executing',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions?.[0]?.issueNumber).toBe(55)
    })

    it('should handle currentIssue field for release executions', () => {
      const rawState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null,
        activeExecutions: [
          {
            id: 'release-exec-1',
            type: 'release',
            currentIssue: 99,
            status: 'executing',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions?.[0]?.issueNumber).toBe(99)
    })

    it('should filter out executions without any issue identifier', () => {
      const rawState = {
        activeIssue: null,
        currentPhase: null,
        status: 'idle',
        completedPhases: [],
        lastActivity: null,
        activeExecutions: [
          {
            id: 'exec-valid',
            issue: 42,
            status: 'executing',
            completedPhases: []
          },
          {
            id: 'exec-invalid',
            status: 'pending',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions).toHaveLength(1)
      expect(result?.executions?.[0]?.issueNumber).toBe(42)
    })

    it('should map auto-fix fields correctly', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 2,
        status: 'auto_fixing',
        completedPhases: [1],
        lastActivity: null,
        autoFixAttempt: 2,
        maxAutoFixAttempts: 3,
        activeExecutions: [
          {
            id: 'exec-1',
            issue: 42,
            status: 'auto_fixing',
            autoFixAttempt: 2,
            autoFixMaxAttempts: 3,
            completedPhases: [1]
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.autoFixAttempt).toBe(2)
      expect(result?.maxAutoFixAttempts).toBe(3)
      expect(result?.executions?.[0]?.autoFixAttempt).toBe(2)
      expect(result?.executions?.[0]?.maxAutoFixAttempts).toBe(3)
    })

    it('should map hook name and error message', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 2,
        status: 'running_hook',
        completedPhases: [1],
        lastActivity: null,
        hookName: 'pre-ship',
        errorMessage: null,
        activeExecutions: [
          {
            id: 'exec-1',
            issue: 42,
            status: 'running_hook',
            activeHook: 'pre-ship',
            errorMessage: null,
            completedPhases: [1]
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.hookName).toBe('pre-ship')
      expect(result?.errorMessage).toBeNull()
      expect(result?.executions?.[0]?.hookName).toBe('pre-ship')
      expect(result?.executions?.[0]?.errorMessage).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should return null for null input', () => {
      const result = mapRawStateToTikiState(null)

      expect(result).toBeNull()
    })

    it('should return null for undefined input', () => {
      const result = mapRawStateToTikiState(undefined)

      expect(result).toBeNull()
    })

    it('should return null for non-object input', () => {
      expect(mapRawStateToTikiState('string')).toBeNull()
      expect(mapRawStateToTikiState(123)).toBeNull()
      expect(mapRawStateToTikiState(true)).toBeNull()
    })

    it('should handle empty object and provide defaults', () => {
      const result = mapRawStateToTikiState({})

      expect(result).not.toBeNull()
      expect(result?.activeIssue).toBeUndefined()
      expect(result?.currentPhase).toBeUndefined()
      expect(result?.status).toBe('idle')
      expect(result?.completedPhases).toEqual([])
      expect(result?.lastActivity).toBeUndefined()
      expect(result?.executions).toBeUndefined()
    })

    it('should handle missing completedPhases (defaults to empty array)', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 1,
        status: 'executing'
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.completedPhases).toEqual([])
    })

    it('should handle missing status (defaults to idle)', () => {
      const rawState = {
        activeIssue: 42,
        currentPhase: 1
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.status).toBe('idle')
    })

    it('should handle activeExecutions as empty array', () => {
      const rawState = {
        activeIssue: null,
        status: 'idle',
        completedPhases: [],
        activeExecutions: []
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions).toEqual([])
    })

    it('should handle activeExecutions as undefined', () => {
      const rawState = {
        activeIssue: 42,
        status: 'executing',
        completedPhases: []
        // no activeExecutions field
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions).toBeUndefined()
    })

    it('should prioritize issue over issueNumber over currentIssue when mapping executions', () => {
      const rawState = {
        activeExecutions: [
          {
            id: 'exec-all-fields',
            issue: 10,
            issueNumber: 20,
            currentIssue: 30,
            status: 'executing',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      // Should use 'issue' field first (10)
      expect(result?.executions?.[0]?.issueNumber).toBe(10)
    })

    it('should use issueNumber when issue is undefined', () => {
      const rawState = {
        activeExecutions: [
          {
            id: 'exec-no-issue',
            issueNumber: 20,
            currentIssue: 30,
            status: 'executing',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions?.[0]?.issueNumber).toBe(20)
    })

    it('should use currentIssue when both issue and issueNumber are undefined', () => {
      const rawState = {
        activeExecutions: [
          {
            id: 'exec-only-current',
            currentIssue: 30,
            status: 'executing',
            completedPhases: []
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions?.[0]?.issueNumber).toBe(30)
    })

    it('should handle execution with null/undefined phase values', () => {
      const rawState = {
        activeExecutions: [
          {
            id: 'exec-1',
            issue: 42,
            status: 'pending',
            currentPhase: null,
            totalPhases: null
            // no completedPhases
          }
        ]
      }

      const result = mapRawStateToTikiState(rawState)

      expect(result?.executions?.[0]).toMatchObject({
        issueNumber: 42,
        currentPhase: null,
        totalPhases: null,
        completedPhases: []
      })
    })
  })
})

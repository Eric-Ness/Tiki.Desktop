import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTikiSync, getPlanExecutionStatus, mapRawStateToTikiState } from '../useTikiSync'
import type { Project, ExecutionPlan, TikiState } from '../../stores/tiki-store'

// Create mocks that we can track
const setTikiStateMock = vi.fn()
const setYoloStateMock = vi.fn()
const setReleasesMock = vi.fn()
const setQueueMock = vi.fn()
const setPlanMock = vi.fn()
const setCurrentPlanMock = vi.fn()
const updateReleaseMock = vi.fn()

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

const mockTikiDesktop = {
  tiki: {
    onStateChange: mockOnStateChange,
    onYoloChange: mockOnYoloChange,
    onPlanChange: mockOnPlanChange,
    onQueueChange: mockOnQueueChange,
    onReleaseChange: mockOnReleaseChange,
    getState: mockGetState,
    getYoloState: mockGetYoloState,
    getReleases: mockGetReleases,
    getQueue: mockGetQueue,
    getPlan: mockGetPlan
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

  describe('Phase 1: derive execution state from plan files', () => {
    const mockProject: Project = {
      id: '1',
      name: 'Test Project',
      path: '/test/path'
    }

    it('should set currentPlan when plan has an in_progress phase (even without activeIssue in state)', () => {
      // tikiState has no activeIssue (stale state)
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

      // The plan has an in_progress phase, so it should be set as currentPlan
      // This test will FAIL until the feature is implemented
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
    })

    it('should derive currentPhase from the in_progress phase in the plan', () => {
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
          { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] },
          { number: 3, title: 'Phase 3', status: 'in_progress', files: [], verification: [] },
          { number: 4, title: 'Phase 4', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // setTikiState should be called with derived state including currentPhase: 3
      // This test will FAIL until the feature is implemented
      expect(setTikiStateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          activeIssue: 42,
          currentPhase: 3,
          status: 'executing'
        })
      )
    })

    it('should derive completedPhases count from plan phases with status completed', () => {
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
          { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] },
          { number: 3, title: 'Phase 3', status: 'in_progress', files: [], verification: [] },
          { number: 4, title: 'Phase 4', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // setTikiState should be called with completedPhases [1, 2]
      // This test will FAIL until the feature is implemented
      expect(setTikiStateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          completedPhases: [1, 2]
        })
      )
    })

    it('should NOT derive execution state when plan has no in_progress phases (all pending)', () => {
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
        status: 'pending',
        phases: [
          { number: 1, title: 'Phase 1', status: 'pending', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // With all phases pending, this is just a planned issue, not an active execution
      // setCurrentPlan should NOT be called
      expect(setCurrentPlanMock).not.toHaveBeenCalled()
      // setTikiState should NOT be called to derive execution state
      // (unless it was called for other reasons during setup)
      const derivedStateCalls = setTikiStateMock.mock.calls.filter(
        (call) => call[0]?.activeIssue === 42
      )
      expect(derivedStateCalls).toHaveLength(0)
    })

    it('should NOT derive execution state when all phases are completed', () => {
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
        status: 'completed',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // With all phases completed, execution is done - no active execution
      // setCurrentPlan should NOT be called
      expect(setCurrentPlanMock).not.toHaveBeenCalled()
    })

    it('should handle plan with failed phase and set status to failed', () => {
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
        status: 'failed',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          {
            number: 2,
            title: 'Phase 2',
            status: 'failed',
            files: [],
            verification: [],
            error: 'Build failed'
          },
          { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
        ]
      }

      act(() => {
        onPlanChangeCallback?.({ plan: mockPlan })
      })

      // A failed phase indicates an active (but failing) execution
      // setCurrentPlan SHOULD be called
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
      // setTikiState should indicate failed status
      // This test will FAIL until the feature is implemented
      expect(setTikiStateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          activeIssue: 42,
          status: 'failed',
          currentPhase: 2,
          errorMessage: 'Build failed'
        })
      )
    })

    it('should prefer tikiState.activeIssue when it matches plan issue number', () => {
      // tikiState already has the correct activeIssue
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

      // When tikiState already has the correct activeIssue, use existing logic
      expect(setCurrentPlanMock).toHaveBeenCalledWith(mockPlan)
    })

    it('should update state when plan shows more completed phases than tikiState', () => {
      // tikiState shows phase 1 completed, but plan shows phases 1 and 2 completed
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

      // The plan shows more progress - state should be updated
      // This test will FAIL until the feature is implemented
      expect(setTikiStateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          completedPhases: [1, 2],
          currentPhase: 3
        })
      )
    })
  })
})

describe('getPlanExecutionStatus', () => {
  it('should return idle when no phases have in_progress or failed status', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'pending',
      phases: [
        { number: 1, title: 'Phase 1', status: 'pending', files: [], verification: [] },
        { number: 2, title: 'Phase 2', status: 'pending', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(false)
    expect(result.status).toBe('idle')
    expect(result.currentPhase).toBeNull()
    expect(result.errorMessage).toBeNull()
    expect(result.completedPhases).toEqual([])
  })

  it('should return executing with currentPhase when a phase is in_progress', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'in_progress',
      phases: [
        { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
        { number: 2, title: 'Phase 2', status: 'in_progress', files: [], verification: [] },
        { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(true)
    expect(result.status).toBe('executing')
    expect(result.currentPhase).toBe(2)
    expect(result.errorMessage).toBeNull()
    expect(result.completedPhases).toEqual([1])
  })

  it('should return failed with currentPhase and errorMessage when a phase is failed', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'failed',
      phases: [
        { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
        {
          number: 2,
          title: 'Phase 2',
          status: 'failed',
          files: [],
          verification: [],
          error: 'Build failed due to type errors'
        },
        { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(true)
    expect(result.status).toBe('failed')
    expect(result.currentPhase).toBe(2)
    expect(result.errorMessage).toBe('Build failed due to type errors')
    expect(result.completedPhases).toEqual([1])
  })

  it('should return correct completedPhases array from plan phases', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'in_progress',
      phases: [
        { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
        { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] },
        { number: 3, title: 'Phase 3', status: 'completed', files: [], verification: [] },
        { number: 4, title: 'Phase 4', status: 'in_progress', files: [], verification: [] },
        { number: 5, title: 'Phase 5', status: 'pending', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.completedPhases).toEqual([1, 2, 3])
    expect(result.completedPhases).toHaveLength(3)
  })

  it('should handle empty phases array gracefully', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'pending',
      phases: []
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(false)
    expect(result.status).toBe('idle')
    expect(result.currentPhase).toBeNull()
    expect(result.errorMessage).toBeNull()
    expect(result.completedPhases).toEqual([])
  })

  it('should handle plan with undefined phases gracefully', () => {
    // Test edge case where phases might be undefined
    const plan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'pending'
    } as ExecutionPlan

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(false)
    expect(result.status).toBe('idle')
    expect(result.currentPhase).toBeNull()
    expect(result.completedPhases).toEqual([])
  })

  it('should prioritize in_progress over failed when both exist (finds first in_progress)', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'in_progress',
      phases: [
        { number: 1, title: 'Phase 1', status: 'in_progress', files: [], verification: [] },
        {
          number: 2,
          title: 'Phase 2',
          status: 'failed',
          files: [],
          verification: [],
          error: 'Some error'
        }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    // Should find in_progress first
    expect(result.status).toBe('executing')
    expect(result.currentPhase).toBe(1)
    expect(result.errorMessage).toBeNull()
  })

  it('should return idle when all phases are completed', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'completed',
      phases: [
        { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
        { number: 2, title: 'Phase 2', status: 'completed', files: [], verification: [] },
        { number: 3, title: 'Phase 3', status: 'completed', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(false)
    expect(result.status).toBe('idle')
    expect(result.currentPhase).toBeNull()
    expect(result.completedPhases).toEqual([1, 2, 3])
  })

  it('should handle failed phase without error message', () => {
    const plan: ExecutionPlan = {
      issue: { number: 1, title: 'Test Issue' },
      status: 'failed',
      phases: [
        { number: 1, title: 'Phase 1', status: 'failed', files: [], verification: [] }
      ]
    }

    const result = getPlanExecutionStatus(plan)

    expect(result.isActive).toBe(true)
    expect(result.status).toBe('failed')
    expect(result.currentPhase).toBe(1)
    expect(result.errorMessage).toBeNull()
  })
})

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

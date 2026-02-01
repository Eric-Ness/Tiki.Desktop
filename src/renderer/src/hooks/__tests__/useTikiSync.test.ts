import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTikiSync } from '../useTikiSync'
import type { Project, ExecutionPlan, TikiState } from '../../stores/tiki-store'

// Create mocks that we can track
const setTikiStateMock = vi.fn()
const setReleasesMock = vi.fn()
const setQueueMock = vi.fn()
const setPlanMock = vi.fn()
const setCurrentPlanMock = vi.fn()
const updateReleaseMock = vi.fn()

// Track the tikiState value for the mock
let mockTikiState: TikiState | null = null

// Mock the tiki store - must define inline to work with vi.mock hoisting
vi.mock('../../stores/tiki-store', async () => {
  // Create a mock store with getState method
  const createMockState = () => ({
    setTikiState: setTikiStateMock,
    setPlan: setPlanMock,
    setCurrentPlan: setCurrentPlanMock,
    setQueue: setQueueMock,
    setReleases: setReleasesMock,
    updateRelease: updateReleaseMock,
    tikiState: mockTikiState
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
const mockGetQueue = vi.fn(() => Promise.resolve([]))
const mockOnStateChange = vi.fn(() => vi.fn())
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
    onPlanChange: mockOnPlanChange,
    onQueueChange: mockOnQueueChange,
    onReleaseChange: mockOnReleaseChange,
    getState: mockGetState,
    getReleases: mockGetReleases,
    getQueue: mockGetQueue
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

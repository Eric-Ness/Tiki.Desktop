import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTikiSync } from '../useTikiSync'
import type { Project } from '../../stores/tiki-store'

// Create mocks that we can track
const setTikiStateMock = vi.fn()
const setReleasesMock = vi.fn()
const setQueueMock = vi.fn()

// Mock the tiki store
vi.mock('../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      setTikiState: setTikiStateMock,
      setPlan: vi.fn(),
      setCurrentPlan: vi.fn(),
      setQueue: setQueueMock,
      setReleases: setReleasesMock,
      updateRelease: vi.fn(),
      tikiState: null
    }
    return selector(state)
  })
}))

// Mock window.tikiDesktop
const mockGetReleases = vi.fn(() => Promise.resolve([]))
const mockGetState = vi.fn(() => Promise.resolve(null))
const mockGetQueue = vi.fn(() => Promise.resolve([]))
const mockOnStateChange = vi.fn(() => vi.fn())
const mockOnPlanChange = vi.fn(() => vi.fn())
const mockOnQueueChange = vi.fn(() => vi.fn())
const mockOnReleaseChange = vi.fn(() => vi.fn())

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
})

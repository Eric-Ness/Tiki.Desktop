import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
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
const mockOnStateChange = vi.fn(() => vi.fn())
const mockOnPlanChange = vi.fn(() => vi.fn())
const mockOnQueueChange = vi.fn(() => vi.fn())
const mockOnReleaseChange = vi.fn(() => vi.fn())

const mockTikiDesktop = {
  tiki: {
    onStateChange: mockOnStateChange,
    onPlanChange: mockOnPlanChange,
    onQueueChange: mockOnQueueChange,
    onReleaseChange: mockOnReleaseChange,
    getState: mockGetState,
    getReleases: mockGetReleases
  }
}

describe('useTikiSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('should load releases when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      expect(mockGetReleases).toHaveBeenCalled()
    })

    it('should load state when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useTikiSync(mockProject))

      expect(mockGetState).toHaveBeenCalled()
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
    })

    it('should not set up event listeners when activeProject is null', () => {
      renderHook(() => useTikiSync(null))

      expect(mockOnStateChange).not.toHaveBeenCalled()
      expect(mockOnPlanChange).not.toHaveBeenCalled()
      expect(mockOnQueueChange).not.toHaveBeenCalled()
      expect(mockOnReleaseChange).not.toHaveBeenCalled()
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
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGitHubSync } from '../useGitHubSync'
import type { Project } from '../../stores/tiki-store'

// Create mocks that we can track
const setIssuesMock = vi.fn()
const setGithubLoadingMock = vi.fn()
const setGithubErrorMock = vi.fn()

// Mock the tiki store
vi.mock('../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      setIssues: setIssuesMock,
      setGithubLoading: setGithubLoadingMock,
      setGithubError: setGithubErrorMock
    }
    return selector(state)
  })
}))

// Mock window.tikiDesktop.github
const mockCheckCli = vi.fn(() => Promise.resolve({ available: true, authenticated: true }))
const mockGetIssues = vi.fn(() => Promise.resolve([]))
const mockOnIssuesUpdated = vi.fn(() => vi.fn())
const mockOnError = vi.fn(() => vi.fn())

const mockTikiDesktop = {
  github: {
    checkCli: mockCheckCli,
    getIssues: mockGetIssues,
    onIssuesUpdated: mockOnIssuesUpdated,
    onError: mockOnError
  }
}

describe('useGitHubSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error - mocking window.tikiDesktop
    window.tikiDesktop = mockTikiDesktop
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('activeProject guard', () => {
    it('should not load issues when activeProject is null', () => {
      renderHook(() => useGitHubSync('/some/path', null))

      expect(mockGetIssues).not.toHaveBeenCalled()
      expect(mockCheckCli).not.toHaveBeenCalled()
    })

    it('should not load issues when cwd is empty', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useGitHubSync('', mockProject))

      expect(mockGetIssues).not.toHaveBeenCalled()
      expect(mockCheckCli).not.toHaveBeenCalled()
    })

    it('should clear issues when activeProject is null', () => {
      renderHook(() => useGitHubSync('/some/path', null))

      expect(setIssuesMock).toHaveBeenCalledWith([])
    })

    it('should load issues when both cwd and activeProject are provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useGitHubSync('/test/path', mockProject))

      expect(mockCheckCli).toHaveBeenCalled()
    })

    it('should set up event listeners when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useGitHubSync('/test/path', mockProject))

      expect(mockOnIssuesUpdated).toHaveBeenCalled()
      expect(mockOnError).toHaveBeenCalled()
    })

    it('should not set up event listeners when activeProject is null', () => {
      renderHook(() => useGitHubSync('/some/path', null))

      expect(mockOnIssuesUpdated).not.toHaveBeenCalled()
      expect(mockOnError).not.toHaveBeenCalled()
    })

    it('should clear issues when activeProject becomes null', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      const { rerender } = renderHook(
        ({ cwd, project }) => useGitHubSync(cwd, project),
        { initialProps: { cwd: '/test/path', project: mockProject as Project | null } }
      )

      // Clear mocks from initial render
      vi.clearAllMocks()

      // Change activeProject to null
      rerender({ cwd: '/test/path', project: null })

      // The hook should clear issues when project becomes null
      expect(setIssuesMock).toHaveBeenCalledWith([])
    })
  })
})

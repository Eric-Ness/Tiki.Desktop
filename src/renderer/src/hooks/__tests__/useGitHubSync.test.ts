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
      renderHook(() => useGitHubSync(null))

      expect(mockGetIssues).not.toHaveBeenCalled()
      expect(mockCheckCli).not.toHaveBeenCalled()
    })

    it('should clear issues when activeProject is null', () => {
      renderHook(() => useGitHubSync(null))

      expect(setIssuesMock).toHaveBeenCalledWith([])
    })

    it('should load issues when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useGitHubSync(mockProject))

      expect(mockCheckCli).toHaveBeenCalled()
    })

    it('should set up event listeners when activeProject is provided', () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        path: '/test/path'
      }

      renderHook(() => useGitHubSync(mockProject))

      expect(mockOnIssuesUpdated).toHaveBeenCalled()
      expect(mockOnError).toHaveBeenCalled()
    })

    it('should not set up event listeners when activeProject is null', () => {
      renderHook(() => useGitHubSync(null))

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
        ({ project }) => useGitHubSync(project),
        { initialProps: { project: mockProject as Project | null } }
      )

      // Clear mocks from initial render
      vi.clearAllMocks()

      // Change activeProject to null
      rerender({ project: null })

      // The hook should clear issues when project becomes null
      expect(setIssuesMock).toHaveBeenCalledWith([])
    })

    it('should reload issues with correct path when switching projects', async () => {
      const project1: Project = {
        id: '1',
        name: 'Project 1',
        path: '/project1/path'
      }

      const project2: Project = {
        id: '2',
        name: 'Project 2',
        path: '/project2/path'
      }

      const { rerender } = renderHook(
        ({ project }) => useGitHubSync(project),
        { initialProps: { project: project1 as Project | null } }
      )

      // Wait for initial load
      await vi.waitFor(() => {
        expect(mockGetIssues).toHaveBeenCalledWith('all', '/project1/path')
      })

      // Clear mocks from initial render
      vi.clearAllMocks()

      // Switch to project 2
      rerender({ project: project2 })

      // The hook should load issues with the NEW project's path
      await vi.waitFor(() => {
        expect(mockGetIssues).toHaveBeenCalledWith('all', '/project2/path')
      })
    })
  })
})

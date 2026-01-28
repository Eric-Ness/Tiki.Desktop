import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../components/layout/Sidebar'
import { useTikiStore } from '../stores/tiki-store'

// Mock zustand store selectors
vi.mock('../stores/tiki-store', () => ({
  useTikiStore: vi.fn()
}))

const mockUseTikiStore = vi.mocked(useTikiStore)

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    mockUseTikiStore.mockImplementation((selector) => {
      const state = {
        tikiState: null,
        currentPlan: null
      }
      return selector ? selector(state as never) : state
    })
  })

  describe('Projects Section', () => {
    it('should render project name when cwd is provided', () => {
      render(<Sidebar cwd="C:\\Users\\test\\MyProject" />)

      expect(screen.getByText('MyProject')).toBeInTheDocument()
    })

    it('should render "No project" when cwd is empty', () => {
      render(<Sidebar cwd="" />)

      expect(screen.getByText('No project')).toBeInTheDocument()
    })

    it('should handle Unix-style paths', () => {
      render(<Sidebar cwd="/home/user/my-project" />)

      expect(screen.getByText('my-project')).toBeInTheDocument()
    })
  })

  describe('State Section', () => {
    it('should show Idle status when tikiState is null', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Idle')).toBeInTheDocument()
    })

    it('should show "No active execution" when no active issue', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('No active execution')).toBeInTheDocument()
    })

    it('should show Executing status with active issue', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = {
          tikiState: {
            activeIssue: 42,
            currentPhase: 1,
            status: 'executing',
            completedPhases: [],
            lastActivity: null
          },
          currentPlan: {
            issue: { number: 42, title: 'Test Issue' },
            status: 'executing',
            phases: [
              { number: 1, title: 'Phase 1', status: 'in_progress', files: [], verification: [] },
              { number: 2, title: 'Phase 2', status: 'pending', files: [], verification: [] }
            ]
          }
        }
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Executing')).toBeInTheDocument()
      expect(screen.getByText('Issue #42')).toBeInTheDocument()
      expect(screen.getByText('Test Issue')).toBeInTheDocument()
    })

    it('should show Paused status', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = {
          tikiState: {
            activeIssue: 10,
            currentPhase: 1,
            status: 'paused',
            completedPhases: [],
            lastActivity: null
          },
          currentPlan: null
        }
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('should show Failed status', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = {
          tikiState: {
            activeIssue: 10,
            currentPhase: 1,
            status: 'failed',
            completedPhases: [],
            lastActivity: null
          },
          currentPlan: null
        }
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should show progress when phases exist', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = {
          tikiState: {
            activeIssue: 42,
            currentPhase: 2,
            status: 'executing',
            completedPhases: [1],
            lastActivity: null
          },
          currentPlan: {
            issue: { number: 42, title: 'Test Issue' },
            status: 'executing',
            phases: [
              { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
              { number: 2, title: 'Phase 2', status: 'in_progress', files: [], verification: [] },
              { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
            ]
          }
        }
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" />)

      // Should show progress text
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show "Connect GitHub to view issues" in Issues section', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Connect GitHub to view issues')).toBeInTheDocument()
    })

    it('should show "No releases" in Releases section', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('No releases')).toBeInTheDocument()
    })

    it('should show "No knowledge entries" in Knowledge section', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('No knowledge entries')).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('should render "Start Claude Code" button', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByRole('button', { name: 'Start Claude Code' })).toBeInTheDocument()
    })
  })
})

describe('SidebarSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTikiStore.mockImplementation((selector) => {
      const state = {
        tikiState: null,
        currentPlan: null
      }
      return selector ? selector(state as never) : state
    })
  })

  describe('Collapse/Expand behavior', () => {
    it('should start expanded when defaultOpen is true', () => {
      render(<Sidebar cwd="/test" />)

      // Projects section has defaultOpen=true, so its content should be visible
      expect(screen.getByText('test')).toBeInTheDocument()
    })

    it('should collapse section when header is clicked', () => {
      render(<Sidebar cwd="/test" />)

      // Find Projects section header button
      const projectsHeader = screen.getByRole('button', { name: /projects/i })

      // Initially content should be visible (defaultOpen=true)
      expect(screen.getByText('test')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(projectsHeader)

      // Content should still be in DOM but collapsed via CSS grid
      // We can check the grid-template-rows style
      const projectsSection = projectsHeader.parentElement
      const gridContainer = projectsSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '0fr' })
    })

    it('should expand section when collapsed header is clicked', () => {
      render(<Sidebar cwd="/test" />)

      // Find Issues section header (defaultOpen=false)
      const issuesHeader = screen.getByRole('button', { name: /issues/i })

      // Initially should be collapsed
      const issuesSection = issuesHeader.parentElement
      let gridContainer = issuesSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '0fr' })

      // Click to expand
      fireEvent.click(issuesHeader)

      // Should now be expanded
      gridContainer = issuesSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '1fr' })
    })

    it('should toggle arrow rotation on expand/collapse', () => {
      render(<Sidebar cwd="/test" />)

      const projectsHeader = screen.getByRole('button', { name: /projects/i })
      const arrow = projectsHeader.querySelector('svg')

      // When expanded, arrow should have rotate-180 class
      expect(arrow).toHaveClass('rotate-180')

      // Click to collapse
      fireEvent.click(projectsHeader)

      // Arrow should no longer have rotate-180 class
      expect(arrow).not.toHaveClass('rotate-180')
    })

    it('should preserve independent collapse state per section', () => {
      render(<Sidebar cwd="/test" />)

      const projectsHeader = screen.getByRole('button', { name: /projects/i })
      const stateHeader = screen.getByRole('button', { name: /state/i })

      // Both sections start expanded (defaultOpen=true)
      let projectsGrid = projectsHeader.parentElement?.querySelector('.grid')
      let stateGrid = stateHeader.parentElement?.querySelector('.grid')

      expect(projectsGrid).toHaveStyle({ gridTemplateRows: '1fr' })
      expect(stateGrid).toHaveStyle({ gridTemplateRows: '1fr' })

      // Collapse only Projects
      fireEvent.click(projectsHeader)

      projectsGrid = projectsHeader.parentElement?.querySelector('.grid')
      stateGrid = stateHeader.parentElement?.querySelector('.grid')

      // Projects should be collapsed, State should still be expanded
      expect(projectsGrid).toHaveStyle({ gridTemplateRows: '0fr' })
      expect(stateGrid).toHaveStyle({ gridTemplateRows: '1fr' })
    })
  })

  describe('Section titles', () => {
    it('should render all section titles', () => {
      render(<Sidebar cwd="/test" />)

      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('State')).toBeInTheDocument()
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Releases')).toBeInTheDocument()
      expect(screen.getByText('Knowledge')).toBeInTheDocument()
    })
  })

  describe('Content rendering', () => {
    it('should render correct content in each section', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = {
          tikiState: {
            activeIssue: 5,
            currentPhase: 1,
            status: 'executing',
            completedPhases: [],
            lastActivity: null
          },
          currentPlan: {
            issue: { number: 5, title: 'Feature request' },
            status: 'executing',
            phases: [
              { number: 1, title: 'Setup', status: 'in_progress', files: [], verification: [] }
            ]
          }
        }
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/home/user/awesome-project" />)

      // Projects section content
      expect(screen.getByText('awesome-project')).toBeInTheDocument()

      // State section content
      expect(screen.getByText('Executing')).toBeInTheDocument()
      expect(screen.getByText('Issue #5')).toBeInTheDocument()
      expect(screen.getByText('Feature request')).toBeInTheDocument()

      // Empty sections content
      expect(screen.getByText('Connect GitHub to view issues')).toBeInTheDocument()
      expect(screen.getByText('No releases')).toBeInTheDocument()
      expect(screen.getByText('No knowledge entries')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../components/layout/Sidebar'
import { useTikiStore } from '../stores/tiki-store'

// Mock zustand store selectors
vi.mock('../stores/tiki-store', () => ({
  useTikiStore: vi.fn()
}))

const mockUseTikiStore = vi.mocked(useTikiStore)

// Default mock project switch handler
const mockOnProjectSwitch = vi.fn()

// Helper to create default mock state with project-related fields
const createDefaultMockState = (overrides = {}) => ({
  tikiState: null,
  currentPlan: null,
  issues: [],
  githubLoading: false,
  githubError: null,
  selectedIssue: null,
  setSelectedIssue: vi.fn(),
  setSelectedNode: vi.fn(),
  setGithubLoading: vi.fn(),
  setGithubError: vi.fn(),
  setIssues: vi.fn(),
  releases: [],
  selectedRelease: null,
  setSelectedRelease: vi.fn(),
  // Project-related state
  projects: [],
  activeProject: null,
  addProject: vi.fn(),
  removeProject: vi.fn(),
  ...overrides
})

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    mockUseTikiStore.mockImplementation((selector) => {
      const state = createDefaultMockState()
      return selector ? selector(state as never) : state
    })
  })

  describe('Projects Section', () => {
    it('should render project name when project is active', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
          projects: [{ id: '1', name: 'MyProject', path: 'C:\\Users\\test\\MyProject' }],
          activeProject: { id: '1', name: 'MyProject', path: 'C:\\Users\\test\\MyProject' }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="C:\\Users\\test\\MyProject" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('MyProject')).toBeInTheDocument()
    })

    it('should render "No projects added" when no projects exist', () => {
      render(<Sidebar cwd="" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('No projects added')).toBeInTheDocument()
    })

    it('should render Add Project button', () => {
      render(<Sidebar cwd="" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument()
    })
  })

  describe('State Section', () => {
    it('should show Idle status when tikiState is null', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('Idle')).toBeInTheDocument()
    })

    it('should show "No active execution" when no active issue', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('No active execution')).toBeInTheDocument()
    })

    it('should show Executing status with active issue', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
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
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('Executing')).toBeInTheDocument()
      expect(screen.getByText('Issue #42')).toBeInTheDocument()
      expect(screen.getByText('Test Issue')).toBeInTheDocument()
    })

    it('should show Paused status', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
          tikiState: {
            activeIssue: 10,
            currentPhase: 1,
            status: 'paused',
            completedPhases: [],
            lastActivity: null
          }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('should show Failed status', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
          tikiState: {
            activeIssue: 10,
            currentPhase: 1,
            status: 'failed',
            completedPhases: [],
            lastActivity: null
          }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should show progress when phases exist', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
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
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      // Should show progress text
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show "No open issues" in Issues section when no issues', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('No open issues')).toBeInTheDocument()
    })

    it('should show "No releases" in Releases section', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('No releases')).toBeInTheDocument()
    })

    it('should show "No knowledge entries" in Knowledge section', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByText('No knowledge entries')).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('should render "Start Claude Code" button', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      expect(screen.getByRole('button', { name: 'Start Claude Code' })).toBeInTheDocument()
    })
  })
})

describe('SidebarSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTikiStore.mockImplementation((selector) => {
      const state = createDefaultMockState()
      return selector ? selector(state as never) : state
    })
  })

  describe('Collapse/Expand behavior', () => {
    it('should start expanded when defaultOpen is true', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
          projects: [{ id: '1', name: 'TestProject', path: '/test' }],
          activeProject: { id: '1', name: 'TestProject', path: '/test' }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      // Projects section has defaultOpen=true, so its content should be visible
      expect(screen.getByText('TestProject')).toBeInTheDocument()
    })

    it('should collapse section when header is clicked', () => {
      mockUseTikiStore.mockImplementation((selector) => {
        const state = createDefaultMockState({
          projects: [{ id: '1', name: 'TestProject', path: '/test' }],
          activeProject: { id: '1', name: 'TestProject', path: '/test' }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      // Find Projects section header button
      const projectsHeader = screen.getByRole('button', { name: /projects/i })

      // Initially content should be visible (defaultOpen=true)
      expect(screen.getByText('TestProject')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(projectsHeader)

      // Content should still be in DOM but collapsed via CSS grid
      // We can check the grid-template-rows style
      const projectsSection = projectsHeader.parentElement
      const gridContainer = projectsSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '0fr' })
    })

    it('should expand section when collapsed header is clicked', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

      // Find Knowledge section header (defaultOpen=false)
      const knowledgeHeader = screen.getByRole('button', { name: /knowledge/i })

      // Initially should be collapsed
      const knowledgeSection = knowledgeHeader.parentElement
      let gridContainer = knowledgeSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '0fr' })

      // Click to expand
      fireEvent.click(knowledgeHeader)

      // Should now be expanded
      gridContainer = knowledgeSection?.querySelector('.grid')
      expect(gridContainer).toHaveStyle({ gridTemplateRows: '1fr' })
    })

    it('should toggle arrow rotation on expand/collapse', () => {
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

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
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

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
      render(<Sidebar cwd="/test" onProjectSwitch={mockOnProjectSwitch} />)

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
        const state = createDefaultMockState({
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
          },
          projects: [{ id: '1', name: 'awesome-project', path: '/home/user/awesome-project' }],
          activeProject: { id: '1', name: 'awesome-project', path: '/home/user/awesome-project' }
        })
        return selector ? selector(state as never) : state
      })

      render(<Sidebar cwd="/home/user/awesome-project" onProjectSwitch={mockOnProjectSwitch} />)

      // Projects section content
      expect(screen.getByText('awesome-project')).toBeInTheDocument()

      // State section content
      expect(screen.getByText('Executing')).toBeInTheDocument()
      expect(screen.getByText('Issue #5')).toBeInTheDocument()
      expect(screen.getByText('Feature request')).toBeInTheDocument()

      // Empty sections content
      expect(screen.getByText('No open issues')).toBeInTheDocument()
      expect(screen.getByText('No releases')).toBeInTheDocument()
      expect(screen.getByText('No knowledge entries')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb, useBreadcrumbItems, truncateText } from '../Breadcrumb'
import type { BreadcrumbItem } from '../Breadcrumb'

// Mock the tiki store
const mockActiveProject = { id: '1', name: 'My Project', path: '/path/to/project' }
const mockSetSelectedIssue = vi.fn()
const mockSetSelectedNode = vi.fn()

// Store state that can be modified per test
let mockStoreState: {
  activeProject: { id: string; name: string; path: string } | null
  selectedNode: string | null
  currentPlan: { issue: { number: number; title: string }; phases: Array<{ number: number; title: string; status: string }> } | null
  selectedIssue: number | null
  setSelectedIssue: typeof mockSetSelectedIssue
  setSelectedNode: typeof mockSetSelectedNode
} = {
  activeProject: mockActiveProject,
  selectedNode: null,
  currentPlan: null,
  selectedIssue: null,
  setSelectedIssue: mockSetSelectedIssue,
  setSelectedNode: mockSetSelectedNode
}

vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => selector(mockStoreState))
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn
}))

describe('truncateText', () => {
  it('should return original text if shorter than maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello')
  })

  it('should truncate text and add ellipsis if longer than maxLength', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })

  it('should handle exact length', () => {
    expect(truncateText('Hello', 5)).toBe('Hello')
  })
})

describe('Breadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render breadcrumb items with separators', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick: vi.fn(), isCurrent: false },
        { label: 'Products', fullLabel: 'Products', onClick: vi.fn(), isCurrent: false },
        { label: 'Details', fullLabel: 'Details', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
      // Check for separators (there should be 2 separators for 3 items)
      expect(screen.getAllByText('>')).toHaveLength(2)
    })

    it('should render clickable buttons for non-current items', () => {
      const onClickHome = vi.fn()
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick: onClickHome, isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const homeButton = screen.getByRole('button', { name: 'Home' })
      expect(homeButton).toBeInTheDocument()
      expect(homeButton).not.toBeDisabled()
    })

    it('should render current item as span (not clickable)', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick: vi.fn(), isCurrent: false },
        { label: 'Current Page', fullLabel: 'Current Page', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      // Current item should be a span, not a button
      expect(screen.queryByRole('button', { name: 'Current Page' })).not.toBeInTheDocument()
      expect(screen.getByText('Current Page')).toBeInTheDocument()
    })

    it('should apply correct styling to current item', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick: vi.fn(), isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const currentItem = screen.getByText('Current')
      expect(currentItem).toHaveClass('font-medium')
    })

    it('should render empty when no items provided', () => {
      const { container } = render(<Breadcrumb items={[]} />)

      // Container should exist but be empty of breadcrumb content
      expect(container.querySelector('[data-testid="breadcrumb-container"]')).toBeInTheDocument()
    })
  })

  describe('click handlers', () => {
    it('should call onClick when clicking non-current item', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick, isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      await user.click(screen.getByRole('button', { name: 'Home' }))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick for item without onClick handler', async () => {
      const items: BreadcrumbItem[] = [
        { label: 'Static', fullLabel: 'Static', isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      // Static item without onClick should still render but as non-interactive
      expect(screen.getByText('Static')).toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('should show tooltip on hover when fullLabel differs from label', async () => {
      const user = userEvent.setup()
      const items: BreadcrumbItem[] = [
        { label: 'Very Long...', fullLabel: 'Very Long Issue Title That Was Truncated', onClick: vi.fn(), isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const truncatedItem = screen.getByRole('button', { name: 'Very Long...' })
      await user.hover(truncatedItem)

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-tooltip')).toBeInTheDocument()
        expect(screen.getByText('Very Long Issue Title That Was Truncated')).toBeInTheDocument()
      })
    })

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup()
      const items: BreadcrumbItem[] = [
        { label: 'Short...', fullLabel: 'Short Full Label', onClick: vi.fn(), isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const truncatedItem = screen.getByRole('button', { name: 'Short...' })

      await user.hover(truncatedItem)
      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-tooltip')).toBeInTheDocument()
      })

      await user.unhover(truncatedItem)
      await waitFor(() => {
        expect(screen.queryByTestId('breadcrumb-tooltip')).not.toBeInTheDocument()
      })
    })

    it('should not show tooltip when fullLabel equals label', async () => {
      const user = userEvent.setup()
      const items: BreadcrumbItem[] = [
        { label: 'Same', fullLabel: 'Same', onClick: vi.fn(), isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const item = screen.getByRole('button', { name: 'Same' })
      await user.hover(item)

      // Give time for tooltip to potentially appear
      await new Promise(r => setTimeout(r, 100))

      expect(screen.queryByTestId('breadcrumb-tooltip')).not.toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('should make clickable items focusable with tabIndex', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick: vi.fn(), isCurrent: false },
        { label: 'Products', fullLabel: 'Products', onClick: vi.fn(), isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0')
      })
    })

    it('should activate onClick with Enter key', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick, isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const homeButton = screen.getByRole('button', { name: 'Home' })
      homeButton.focus()
      await user.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should activate onClick with Space key', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      const items: BreadcrumbItem[] = [
        { label: 'Home', fullLabel: 'Home', onClick, isCurrent: false },
        { label: 'Current', fullLabel: 'Current', isCurrent: true }
      ]

      render(<Breadcrumb items={items} />)

      const homeButton = screen.getByRole('button', { name: 'Home' })
      homeButton.focus()
      await user.keyboard(' ')

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useBreadcrumbItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    mockStoreState = {
      activeProject: mockActiveProject,
      selectedNode: null,
      currentPlan: null,
      selectedIssue: null,
      setSelectedIssue: mockSetSelectedIssue,
      setSelectedNode: mockSetSelectedNode
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Test component to use the hook
  function TestHookComponent() {
    const { items, navigateToProject, navigateToIssue } = useBreadcrumbItems()
    return (
      <div>
        <div data-testid="items-count">{items.length}</div>
        {items.map((item, index) => (
          <div key={index} data-testid={`item-${index}`}>
            {item.label} | {item.fullLabel} | {item.isCurrent ? 'current' : 'not-current'}
          </div>
        ))}
        <button data-testid="nav-project" onClick={navigateToProject}>Nav Project</button>
        <button data-testid="nav-issue" onClick={navigateToIssue}>Nav Issue</button>
      </div>
    )
  }

  it('should return project-only breadcrumb when only project is active', () => {
    render(<TestHookComponent />)

    expect(screen.getByTestId('items-count')).toHaveTextContent('1')
    expect(screen.getByTestId('item-0')).toHaveTextContent('My Project')
    expect(screen.getByTestId('item-0')).toHaveTextContent('current')
  })

  it('should return project + issue when issue is selected', () => {
    mockStoreState.selectedIssue = 42
    mockStoreState.currentPlan = {
      issue: { number: 42, title: 'Fix authentication bug' },
      phases: []
    }

    render(<TestHookComponent />)

    expect(screen.getByTestId('items-count')).toHaveTextContent('2')
    expect(screen.getByTestId('item-0')).toHaveTextContent('My Project')
    expect(screen.getByTestId('item-0')).toHaveTextContent('not-current')
    expect(screen.getByTestId('item-1')).toHaveTextContent('#42')
    expect(screen.getByTestId('item-1')).toHaveTextContent('current')
  })

  it('should return project + issue + phase when phase is selected', () => {
    mockStoreState.selectedIssue = 42
    mockStoreState.currentPlan = {
      issue: { number: 42, title: 'Fix authentication bug' },
      phases: [
        { number: 1, title: 'Setup environment', status: 'completed' },
        { number: 2, title: 'Implement feature', status: 'in_progress' }
      ]
    }
    mockStoreState.selectedNode = 'phase-2'

    render(<TestHookComponent />)

    expect(screen.getByTestId('items-count')).toHaveTextContent('3')
    expect(screen.getByTestId('item-0')).toHaveTextContent('My Project')
    expect(screen.getByTestId('item-1')).toHaveTextContent('#42')
    expect(screen.getByTestId('item-2')).toHaveTextContent('Phase 2')
    expect(screen.getByTestId('item-2')).toHaveTextContent('current')
  })

  it('should truncate long issue titles in label but keep full in fullLabel', () => {
    mockStoreState.selectedIssue = 42
    mockStoreState.currentPlan = {
      issue: { number: 42, title: 'This is a very long issue title that should be truncated for display' },
      phases: []
    }

    render(<TestHookComponent />)

    // Check that item-1 contains a truncated label (with ellipsis) and full title
    const item1 = screen.getByTestId('item-1')
    expect(item1.textContent).toContain('...')
    expect(item1.textContent).toContain('This is a very long issue title that should be truncated for display')
  })

  it('should call setSelectedIssue and setSelectedNode when navigating to project', async () => {
    const user = userEvent.setup()
    mockStoreState.selectedIssue = 42
    mockStoreState.currentPlan = {
      issue: { number: 42, title: 'Some issue' },
      phases: []
    }

    render(<TestHookComponent />)

    await user.click(screen.getByTestId('nav-project'))

    expect(mockSetSelectedIssue).toHaveBeenCalledWith(null)
    expect(mockSetSelectedNode).toHaveBeenCalledWith(null)
  })

  it('should call setSelectedNode when navigating to issue', async () => {
    const user = userEvent.setup()
    mockStoreState.selectedIssue = 42
    mockStoreState.selectedNode = 'phase-1'
    mockStoreState.currentPlan = {
      issue: { number: 42, title: 'Some issue' },
      phases: [{ number: 1, title: 'Phase 1', status: 'completed' }]
    }

    render(<TestHookComponent />)

    await user.click(screen.getByTestId('nav-issue'))

    expect(mockSetSelectedNode).toHaveBeenCalledWith(null)
  })

  it('should handle missing project gracefully', () => {
    mockStoreState.activeProject = null

    render(<TestHookComponent />)

    // Should return empty items when no project
    expect(screen.getByTestId('items-count')).toHaveTextContent('0')
  })
})

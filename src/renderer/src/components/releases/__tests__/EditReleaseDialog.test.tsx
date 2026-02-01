/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditReleaseDialog } from '../EditReleaseDialog'
import type { Release } from '../../../stores/tiki-store'

// Mock issues for testing
const mockOpenIssue = {
  number: 1,
  title: 'Open Issue',
  state: 'OPEN',
  labels: [],
  url: 'https://github.com/test/1',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
}

const mockClosedIssue = {
  number: 2,
  title: 'Closed Issue',
  state: 'CLOSED',
  labels: [],
  url: 'https://github.com/test/2',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
}

// Mock the tiki store
vi.mock('../../../stores/tiki-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../stores/tiki-store')>()
  return {
    ...actual,
    useTikiStore: vi.fn((selector) => {
      const state = {
        updateRelease: vi.fn(),
        issues: [mockOpenIssue, mockClosedIssue],
        activeProject: { path: '/test' },
        setSelectedIssue: vi.fn()
      }
      return selector(state)
    })
  }
})

// Mock the window.tikiDesktop API
const mockUpdateRelease = vi.fn()
const mockDeleteRelease = vi.fn()
const mockGetRequirements = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateRelease.mockResolvedValue({ success: true })
  mockDeleteRelease.mockResolvedValue({ success: true })
  mockGetRequirements.mockResolvedValue([])

  // @ts-expect-error - mocking window API
  window.tikiDesktop = {
    tiki: {
      updateRelease: mockUpdateRelease,
      deleteRelease: mockDeleteRelease,
      getRequirements: mockGetRequirements
    }
  }
})

describe('EditReleaseDialog', () => {
  const mockRelease: Release = {
    version: 'v1.0.0',
    status: 'active',
    requirementsEnabled: false,
    issues: []
  }

  it('should detect status change in hasChanges', async () => {
    const onClose = vi.fn()
    render(
      <EditReleaseDialog
        isOpen={true}
        release={mockRelease}
        onClose={onClose}
      />
    )

    // Find the status select
    const statusSelect = screen.getByRole('combobox')
    expect(statusSelect).toHaveValue('active')

    // Change status to shipped
    fireEvent.change(statusSelect, { target: { value: 'shipped' } })
    expect(statusSelect).toHaveValue('shipped')

    // The save button should now be enabled (hasChanges should be true)
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).not.toBeDisabled()
  })

  it('should send status update to backend', async () => {
    const onClose = vi.fn()
    render(
      <EditReleaseDialog
        isOpen={true}
        release={mockRelease}
        onClose={onClose}
      />
    )

    // Change status
    const statusSelect = screen.getByRole('combobox')
    fireEvent.change(statusSelect, { target: { value: 'completed' } })

    // Click save
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    // Verify backend was called with correct status
    await waitFor(() => {
      expect(mockUpdateRelease).toHaveBeenCalledWith({
        currentVersion: 'v1.0.0',
        updates: expect.objectContaining({
          status: 'completed'
        })
      })
    })
  })

  it('should show Requirements tab when requirementsEnabled is true', async () => {
    const releaseWithRequirements: Release = {
      ...mockRelease,
      requirementsEnabled: true
    }

    render(
      <EditReleaseDialog
        isOpen={true}
        release={releaseWithRequirements}
        onClose={vi.fn()}
      />
    )

    // Wait for requirements to load
    await waitFor(() => {
      expect(mockGetRequirements).toHaveBeenCalled()
    })

    // Requirements tab should be visible
    const requirementsTab = screen.getByRole('button', { name: /requirements/i })
    expect(requirementsTab).toBeInTheDocument()
  })

  it('should not show Requirements tab when requirementsEnabled is false and no requirements exist', async () => {
    render(
      <EditReleaseDialog
        isOpen={true}
        release={mockRelease}
        onClose={vi.fn()}
      />
    )

    // Wait for async state updates
    await waitFor(() => {
      expect(mockGetRequirements).toHaveBeenCalled()
    })

    // Requirements tab should not be visible
    const requirementsTab = screen.queryByRole('button', { name: /requirements/i })
    expect(requirementsTab).not.toBeInTheDocument()
  })

  it('should show Requirements tab when requirements exist even if not enabled', async () => {
    mockGetRequirements.mockResolvedValue([
      { id: 'REQ-001', title: 'Test Requirement' }
    ])

    render(
      <EditReleaseDialog
        isOpen={true}
        release={mockRelease}
        onClose={vi.fn()}
      />
    )

    // Wait for requirements to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /requirements/i })).toBeInTheDocument()
    })
  })

  it('should load requirements on dialog open', async () => {
    render(
      <EditReleaseDialog
        isOpen={true}
        release={mockRelease}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(mockGetRequirements).toHaveBeenCalled()
    })
  })

  it('should switch to Requirements tab and show coverage matrix', async () => {
    mockGetRequirements.mockResolvedValue([
      { id: 'REQ-001', title: 'Test Requirement', priority: 'high' }
    ])

    const releaseWithIssues: Release = {
      ...mockRelease,
      requirementsEnabled: true,
      issues: [
        {
          number: 1,
          title: 'Test Issue',
          status: 'in_progress',
          requirements: ['REQ-001'],
          currentPhase: 1,
          totalPhases: 3,
          completedAt: null
        }
      ]
    }

    render(
      <EditReleaseDialog
        isOpen={true}
        release={releaseWithIssues}
        onClose={vi.fn()}
      />
    )

    // Wait for requirements tab to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /requirements/i })).toBeInTheDocument()
    })

    // Click on Requirements tab
    fireEvent.click(screen.getByRole('button', { name: /requirements/i }))

    // Should show the coverage matrix
    await waitFor(() => {
      expect(screen.getByTestId('coverage-matrix')).toBeInTheDocument()
    })
  })

  describe('issue filtering', () => {
    it('should only show open issues in the Add Issues section', async () => {
      render(
        <EditReleaseDialog
          isOpen={true}
          release={mockRelease}
          onClose={vi.fn()}
        />
      )

      // Switch to Issues tab
      fireEvent.click(screen.getByRole('button', { name: /issues/i }))

      // Wait for issues to render
      await waitFor(() => {
        // Should show the open issue
        expect(screen.getByText('Open Issue')).toBeInTheDocument()
        // Should NOT show the closed issue
        expect(screen.queryByText('Closed Issue')).not.toBeInTheDocument()
      })
    })
  })
})

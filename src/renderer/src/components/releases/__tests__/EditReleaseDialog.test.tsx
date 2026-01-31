/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditReleaseDialog } from '../EditReleaseDialog'
import type { Release } from '../../../stores/tiki-store'

// Mock the tiki store
vi.mock('../../../stores/tiki-store', () => ({
  useTikiStore: vi.fn((selector) => {
    const state = {
      updateRelease: vi.fn(),
      issues: [],
      activeProject: { path: '/test' }
    }
    return selector(state)
  })
}))

// Mock the window.tikiDesktop API
const mockUpdateRelease = vi.fn()
const mockDeleteRelease = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateRelease.mockResolvedValue({ success: true })
  mockDeleteRelease.mockResolvedValue({ success: true })

  // @ts-expect-error - mocking window API
  window.tikiDesktop = {
    tiki: {
      updateRelease: mockUpdateRelease,
      deleteRelease: mockDeleteRelease
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
})

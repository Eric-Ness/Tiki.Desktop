import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DependencyFilters } from '../DependencyFilters'
import type { Release } from '../../../stores/tiki-store'

describe('DependencyFilters', () => {
  const mockReleases: Release[] = [
    {
      version: 'v1.0.0',
      status: 'active',
      issues: [
        { number: 1, title: 'Issue 1', status: 'open', currentPhase: null, totalPhases: null, completedAt: null },
        { number: 2, title: 'Issue 2', status: 'open', currentPhase: null, totalPhases: null, completedAt: null }
      ]
    },
    {
      version: 'v0.9.0',
      status: 'shipped',
      issues: [
        { number: 3, title: 'Issue 3', status: 'closed', currentPhase: null, totalPhases: null, completedAt: null }
      ]
    }
  ]

  const defaultProps = {
    releases: mockReleases,
    selectedRelease: null as string | null,
    onReleaseChange: vi.fn(),
    showOrphans: true,
    onShowOrphansChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render release filter dropdown', () => {
    render(<DependencyFilters {...defaultProps} />)

    expect(screen.getByRole('combobox', { name: /filter by release/i })).toBeInTheDocument()
  })

  it('should show "All Issues" option by default', () => {
    render(<DependencyFilters {...defaultProps} />)

    expect(screen.getByRole('combobox', { name: /filter by release/i })).toHaveValue('')
  })

  it('should list all releases in dropdown', () => {
    render(<DependencyFilters {...defaultProps} />)

    expect(screen.getByRole('combobox', { name: /filter by release/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /all issues/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /v1\.0\.0/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /v0\.9\.0/i })).toBeInTheDocument()
  })

  it('should call onReleaseChange when release is selected', () => {
    render(<DependencyFilters {...defaultProps} />)

    const dropdown = screen.getByRole('combobox', { name: /filter by release/i })
    fireEvent.change(dropdown, { target: { value: 'v1.0.0' } })

    expect(defaultProps.onReleaseChange).toHaveBeenCalledWith('v1.0.0')
  })

  it('should call onReleaseChange with null when "All Issues" is selected', () => {
    const props = { ...defaultProps, selectedRelease: 'v1.0.0' }
    render(<DependencyFilters {...props} />)

    const dropdown = screen.getByRole('combobox', { name: /filter by release/i })
    fireEvent.change(dropdown, { target: { value: '' } })

    expect(defaultProps.onReleaseChange).toHaveBeenCalledWith(null)
  })

  it('should render show orphans checkbox', () => {
    render(<DependencyFilters {...defaultProps} />)

    expect(screen.getByRole('checkbox', { name: /show orphan issues/i })).toBeInTheDocument()
  })

  it('should have show orphans checked by default', () => {
    render(<DependencyFilters {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /show orphan issues/i })
    expect(checkbox).toBeChecked()
  })

  it('should call onShowOrphansChange when checkbox is toggled', () => {
    render(<DependencyFilters {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /show orphan issues/i })
    fireEvent.click(checkbox)

    expect(defaultProps.onShowOrphansChange).toHaveBeenCalledWith(false)
  })

  it('should show issue count for selected release', () => {
    const props = { ...defaultProps, selectedRelease: 'v1.0.0' }
    render(<DependencyFilters {...props} />)

    // The issue count indicator at the end (not in dropdown)
    const issueCountElement = screen.getByText((content, element) => {
      return element?.tagName === 'SPAN' && content.includes('2') && content.includes('issues')
    })
    expect(issueCountElement).toBeInTheDocument()
  })

  it('should show total issue count when no release selected', () => {
    render(<DependencyFilters {...defaultProps} totalIssueCount={10} />)

    expect(screen.getByText(/10 issues/i)).toBeInTheDocument()
  })

  it('should handle empty releases array', () => {
    const props = { ...defaultProps, releases: [] }
    render(<DependencyFilters {...props} />)

    const dropdown = screen.getByRole('combobox', { name: /filter by release/i })
    // Should only have "All Issues" option
    expect(dropdown.querySelectorAll('option')).toHaveLength(1)
  })
})

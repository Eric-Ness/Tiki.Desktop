/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RequirementCoverageMatrix } from '../RequirementCoverageMatrix'
import type { Release, Requirement, ReleaseIssue } from '../../../stores/tiki-store'

describe('RequirementCoverageMatrix', () => {
  // Test data helpers
  const createRequirement = (overrides: Partial<Requirement> = {}): Requirement => ({
    id: 'REQ-001',
    title: 'Test Requirement',
    ...overrides
  })

  const createIssue = (overrides: Partial<ReleaseIssue> = {}): ReleaseIssue => ({
    number: 1,
    title: 'Test Issue',
    status: 'open',
    currentPhase: null,
    totalPhases: null,
    completedAt: null,
    ...overrides
  })

  const createRelease = (overrides: Partial<Release> = {}): Release => ({
    version: 'v1.0.0',
    status: 'active',
    issues: [],
    ...overrides
  })

  describe('Empty states', () => {
    it('displays empty state when no requirements', () => {
      const release = createRelease({
        issues: [createIssue()]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={[]}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('empty-requirements')).toBeInTheDocument()
      expect(screen.getByText('No requirements defined for this release')).toBeInTheDocument()
    })

    it('displays empty state when no issues', () => {
      const release = createRelease({
        issues: []
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={[createRequirement()]}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('empty-issues')).toBeInTheDocument()
      expect(screen.getByText('No issues in this release')).toBeInTheDocument()
    })
  })

  describe('Rendering requirements as rows', () => {
    it('renders each requirement as a row', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'First Requirement' }),
        createRequirement({ id: 'REQ-002', title: 'Second Requirement' }),
        createRequirement({ id: 'REQ-003', title: 'Third Requirement' })
      ]
      const release = createRelease({
        issues: [createIssue()]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('requirement-row-REQ-001')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-REQ-002')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-REQ-003')).toBeInTheDocument()
    })

    it('displays requirement ID and title', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'User authentication' })
      ]
      const release = createRelease({
        issues: [createIssue()]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByText('REQ-001')).toBeInTheDocument()
      expect(screen.getByText('User authentication')).toBeInTheDocument()
    })

    it('displays priority badges for requirements', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'High Priority', priority: 'high' }),
        createRequirement({ id: 'REQ-002', title: 'Medium Priority', priority: 'medium' }),
        createRequirement({ id: 'REQ-003', title: 'Low Priority', priority: 'low' })
      ]
      const release = createRelease({
        issues: [createIssue()]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('priority-badge-REQ-001')).toHaveTextContent('H')
      expect(screen.getByTestId('priority-badge-REQ-002')).toHaveTextContent('M')
      expect(screen.getByTestId('priority-badge-REQ-003')).toHaveTextContent('L')
    })
  })

  describe('Rendering issues as columns', () => {
    it('renders each issue as a column header', () => {
      const requirements = [createRequirement()]
      const release = createRelease({
        issues: [
          createIssue({ number: 10, title: 'Issue Ten' }),
          createIssue({ number: 20, title: 'Issue Twenty' }),
          createIssue({ number: 30, title: 'Issue Thirty' })
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('issue-header-10')).toBeInTheDocument()
      expect(screen.getByTestId('issue-header-20')).toBeInTheDocument()
      expect(screen.getByTestId('issue-header-30')).toBeInTheDocument()
    })

    it('displays issue number and truncated title in headers', () => {
      const requirements = [createRequirement()]
      const release = createRelease({
        issues: [
          createIssue({ number: 42, title: 'Short' }),
          createIssue({ number: 43, title: 'A very long issue title that should be truncated' })
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByText('#42')).toBeInTheDocument()
      expect(screen.getByText('#43')).toBeInTheDocument()
    })
  })

  describe('Coverage cells', () => {
    it('shows checkmark for covered requirements', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('check-REQ-001-1')).toBeInTheDocument()
    })

    it('does not show checkmark for uncovered requirements', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: []
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.queryByTestId('check-REQ-001-1')).not.toBeInTheDocument()
      // But the cell should exist
      expect(screen.getByTestId('cell-REQ-001-1')).toBeInTheDocument()
    })

    it('handles multiple issues addressing same requirement', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [
          createIssue({ number: 1 }),
          createIssue({ number: 2 }),
          createIssue({ number: 3 })
        ],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1, 3] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // Issues 1 and 3 should have checkmarks
      expect(screen.getByTestId('check-REQ-001-1')).toBeInTheDocument()
      expect(screen.getByTestId('check-REQ-001-3')).toBeInTheDocument()
      // Issue 2 should not have a checkmark
      expect(screen.queryByTestId('check-REQ-001-2')).not.toBeInTheDocument()
    })
  })

  describe('Coverage percentage in summary column', () => {
    it('shows 100% coverage when all issues address requirement', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [
          createIssue({ number: 1 }),
          createIssue({ number: 2 })
        ],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1, 2] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('100%')
      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('2 issues')
    })

    it('shows 0% coverage when no issues address requirement', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [
          createIssue({ number: 1 }),
          createIssue({ number: 2 })
        ],
        requirementMappings: []
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('0%')
      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('0 issues')
    })

    it('shows partial coverage percentage', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [
          createIssue({ number: 1 }),
          createIssue({ number: 2 }),
          createIssue({ number: 3 }),
          createIssue({ number: 4 })
        ],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1, 2] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('50%')
      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('2 issues')
    })

    it('shows singular issue text for 1 issue', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('1 issue')
      expect(screen.getByTestId('coverage-REQ-001')).not.toHaveTextContent('1 issues')
    })
  })

  describe('Gap highlighting', () => {
    it('highlights rows with 0% coverage as gaps', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'Covered' }),
        createRequirement({ id: 'REQ-002', title: 'Not Covered' })
      ]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1] }
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // REQ-002 should have the gap class (bg-red-500/10)
      const gapRow = screen.getByTestId('requirement-row-REQ-002')
      expect(gapRow).toHaveClass('bg-red-500/10')

      // REQ-001 should not have the gap class
      const coveredRow = screen.getByTestId('requirement-row-REQ-001')
      expect(coveredRow).not.toHaveClass('bg-red-500/10')
    })
  })

  describe('Issue click callback', () => {
    it('calls onIssueClick when clicking issue header', () => {
      const onIssueClick = vi.fn()
      const requirements = [createRequirement()]
      const release = createRelease({
        issues: [
          createIssue({ number: 42, title: 'Clickable Issue' })
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={onIssueClick}
        />
      )

      const issueHeader = screen.getByTestId('issue-header-42')
      fireEvent.click(issueHeader)

      expect(onIssueClick).toHaveBeenCalledTimes(1)
      expect(onIssueClick).toHaveBeenCalledWith(42)
    })

    it('does not call onIssueClick for other interactions', () => {
      const onIssueClick = vi.fn()
      const requirements = [createRequirement()]
      const release = createRelease({
        issues: [createIssue({ number: 1 })]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={onIssueClick}
        />
      )

      // Click on a coverage cell
      const cell = screen.getByTestId('cell-REQ-001-1')
      fireEvent.click(cell)

      expect(onIssueClick).not.toHaveBeenCalled()
    })
  })

  describe('Handles missing or undefined data gracefully', () => {
    it('handles release with no requirementMappings', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })]
        // No requirementMappings property
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // Should render without errors
      expect(screen.getByTestId('coverage-matrix')).toBeInTheDocument()
      // Coverage should be 0%
      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('0%')
    })

    it('handles requirements without priority', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'No Priority', priority: undefined })
      ]
      const release = createRelease({
        issues: [createIssue({ number: 1 })]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // Should render without priority badge
      expect(screen.queryByTestId('priority-badge-REQ-001')).not.toBeInTheDocument()
      expect(screen.getByText('No Priority')).toBeInTheDocument()
    })

    it('handles mappings for requirements not in the list', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1] },
          { id: 'REQ-UNKNOWN', addressedBy: [1] } // This requirement doesn't exist
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // Should render without errors
      expect(screen.getByTestId('coverage-matrix')).toBeInTheDocument()
      // Only REQ-001 should be displayed
      expect(screen.getByTestId('requirement-row-REQ-001')).toBeInTheDocument()
    })

    it('handles mappings referencing issues not in the release', () => {
      const requirements = [createRequirement({ id: 'REQ-001' })]
      const release = createRelease({
        issues: [createIssue({ number: 1 })],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [1, 999] } // Issue 999 doesn't exist in release
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // Should render without errors
      expect(screen.getByTestId('coverage-matrix')).toBeInTheDocument()
      // Issue 1 should show as covered
      expect(screen.getByTestId('check-REQ-001-1')).toBeInTheDocument()
    })
  })

  describe('Complex matrix scenarios', () => {
    it('renders a full matrix with multiple requirements and issues', () => {
      const requirements = [
        createRequirement({ id: 'REQ-001', title: 'Authentication', priority: 'high' }),
        createRequirement({ id: 'REQ-002', title: 'Authorization', priority: 'high' }),
        createRequirement({ id: 'REQ-003', title: 'Logging', priority: 'medium' }),
        createRequirement({ id: 'REQ-004', title: 'Caching', priority: 'low' })
      ]
      const release = createRelease({
        issues: [
          createIssue({ number: 10, title: 'Auth system' }),
          createIssue({ number: 20, title: 'Role management' }),
          createIssue({ number: 30, title: 'Logging service' }),
          createIssue({ number: 40, title: 'Performance' })
        ],
        requirementMappings: [
          { id: 'REQ-001', addressedBy: [10] },           // 25% coverage
          { id: 'REQ-002', addressedBy: [10, 20] },       // 50% coverage
          { id: 'REQ-003', addressedBy: [30] },           // 25% coverage
          // REQ-004 has no issues - 0% coverage (gap)
        ]
      })

      render(
        <RequirementCoverageMatrix
          release={release}
          requirements={requirements}
          onIssueClick={vi.fn()}
        />
      )

      // All rows rendered
      expect(screen.getByTestId('requirement-row-REQ-001')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-REQ-002')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-REQ-003')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-REQ-004')).toBeInTheDocument()

      // All columns rendered
      expect(screen.getByTestId('issue-header-10')).toBeInTheDocument()
      expect(screen.getByTestId('issue-header-20')).toBeInTheDocument()
      expect(screen.getByTestId('issue-header-30')).toBeInTheDocument()
      expect(screen.getByTestId('issue-header-40')).toBeInTheDocument()

      // Check coverage percentages
      expect(screen.getByTestId('coverage-REQ-001')).toHaveTextContent('25%')
      expect(screen.getByTestId('coverage-REQ-002')).toHaveTextContent('50%')
      expect(screen.getByTestId('coverage-REQ-003')).toHaveTextContent('25%')
      expect(screen.getByTestId('coverage-REQ-004')).toHaveTextContent('0%')

      // REQ-004 should be highlighted as a gap
      expect(screen.getByTestId('requirement-row-REQ-004')).toHaveClass('bg-red-500/10')
    })
  })
})

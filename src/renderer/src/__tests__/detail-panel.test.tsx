import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DetailPanel } from '../components/layout/DetailPanel'
import { useTikiStore } from '../stores/tiki-store'
import type { ExecutionPlan } from '../stores/tiki-store'
import { LearningProvider } from '../contexts/LearningContext'

// Wrapper function to provide LearningProvider context
function renderWithProviders(ui: React.ReactElement) {
  return render(<LearningProvider>{ui}</LearningProvider>)
}

// Helper to create a mock execution plan
function createMockPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    issue: {
      number: 42,
      title: 'Test Issue Title'
    },
    status: 'executing',
    phases: [
      {
        number: 1,
        title: 'Phase One',
        status: 'completed',
        files: ['src/file1.ts'],
        verification: ['Tests pass'],
        summary: 'Phase completed successfully'
      },
      {
        number: 2,
        title: 'Phase Two',
        status: 'in_progress',
        files: ['src/file2.ts', 'src/file3.ts'],
        verification: ['Linting passes', 'Build succeeds']
      },
      {
        number: 3,
        title: 'Phase Three',
        status: 'pending',
        files: [],
        verification: []
      }
    ],
    ...overrides
  }
}

describe('DetailPanel Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state before each test
    useTikiStore.setState({
      selectedNode: null,
      currentPlan: null
    })
    // Mock learning API with learning mode disabled by default for tests
    vi.mocked(window.tikiDesktop.learning.getProgress).mockResolvedValue({
      learningModeEnabled: false,
      expertModeEnabled: false,
      conceptsSeen: [],
      totalExecutions: 0
    })
  })

  describe('Empty state', () => {
    it('shows empty state when no selection', () => {
      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
      expect(
        screen.getByText(/Select a phase node in the workflow/)
      ).toBeInTheDocument()
    })

    it('shows empty state when selectedNode is null even with currentPlan', () => {
      useTikiStore.setState({
        selectedNode: null,
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })

    it('shows empty state for unrecognized node id', () => {
      useTikiStore.setState({
        selectedNode: 'unknown-node',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })
  })

  describe('Phase selection', () => {
    it('shows PhaseDetail when phase node is selected', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByTestId('phase-detail-number')).toHaveTextContent('1')
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Phase One')
      expect(screen.getByTestId('status-badge')).toHaveTextContent('completed')
    })

    it('shows correct phase data for phase-2', () => {
      useTikiStore.setState({
        selectedNode: 'phase-2',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByTestId('phase-detail-number')).toHaveTextContent('2')
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Phase Two')
      expect(screen.getByTestId('status-badge')).toHaveTextContent('in_progress')
      expect(screen.getByText('src/file2.ts')).toBeInTheDocument()
      expect(screen.getByText('src/file3.ts')).toBeInTheDocument()
    })

    it('shows empty state when phase not found in plan', () => {
      useTikiStore.setState({
        selectedNode: 'phase-99',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })

    it('shows empty state when phase selected but no currentPlan', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: null
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })
  })

  describe('Issue selection', () => {
    it('shows IssueDetail when issue-node is selected', () => {
      useTikiStore.setState({
        selectedNode: 'issue-node',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByTestId('issue-number')).toHaveTextContent('#42')
      expect(screen.getByTestId('issue-title')).toHaveTextContent('Test Issue Title')
      expect(screen.getByTestId('state-badge')).toHaveTextContent('open')
    })

    it('shows empty state when issue-node selected but no currentPlan', () => {
      useTikiStore.setState({
        selectedNode: 'issue-node',
        currentPlan: null
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })
  })

  describe('Ship selection', () => {
    it('shows ShipDetail with incomplete status when phases not all complete', () => {
      useTikiStore.setState({
        selectedNode: 'ship-node',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByTestId('ship-status')).toHaveTextContent('Phases in progress...')
      expect(screen.getByTestId('status-text')).toHaveTextContent('In Progress')
    })

    it('shows ShipDetail with complete status when all phases complete', () => {
      const completePlan = createMockPlan({
        phases: [
          {
            number: 1,
            title: 'Phase One',
            status: 'completed',
            files: [],
            verification: []
          },
          {
            number: 2,
            title: 'Phase Two',
            status: 'completed',
            files: [],
            verification: []
          }
        ]
      })

      useTikiStore.setState({
        selectedNode: 'ship-node',
        currentPlan: completePlan
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByTestId('ship-status')).toHaveTextContent('All phases complete - ready to ship!')
      expect(screen.getByTestId('status-text')).toHaveTextContent('Complete')
    })

    it('shows empty state when ship-node selected but no currentPlan', () => {
      useTikiStore.setState({
        selectedNode: 'ship-node',
        currentPlan: null
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('No Selection')).toBeInTheDocument()
    })
  })

  describe('Selection changes', () => {
    it('updates view when selection changes from phase to issue', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: createMockPlan()
      })

      const { rerender } = renderWithProviders(<DetailPanel />)

      // Initially shows phase
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Phase One')

      // Change selection to issue
      act(() => {
        useTikiStore.setState({ selectedNode: 'issue-node' })
      })
      rerender(<LearningProvider><DetailPanel /></LearningProvider>)

      // Now shows issue
      expect(screen.getByTestId('issue-number')).toHaveTextContent('#42')
      expect(screen.queryByTestId('phase-detail-title')).not.toBeInTheDocument()
    })

    it('updates view when selection changes from issue to ship', () => {
      useTikiStore.setState({
        selectedNode: 'issue-node',
        currentPlan: createMockPlan()
      })

      const { rerender } = renderWithProviders(<DetailPanel />)

      // Initially shows issue
      expect(screen.getByTestId('issue-number')).toBeInTheDocument()

      // Change selection to ship
      act(() => {
        useTikiStore.setState({ selectedNode: 'ship-node' })
      })
      rerender(<LearningProvider><DetailPanel /></LearningProvider>)

      // Now shows ship
      expect(screen.getByTestId('ship-status')).toBeInTheDocument()
      expect(screen.queryByTestId('issue-number')).not.toBeInTheDocument()
    })

    it('updates view when selection changes to empty', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: createMockPlan()
      })

      const { rerender } = renderWithProviders(<DetailPanel />)

      // Initially shows phase
      expect(screen.getByTestId('phase-detail-title')).toBeInTheDocument()

      // Clear selection
      act(() => {
        useTikiStore.setState({ selectedNode: null })
      })
      rerender(<LearningProvider><DetailPanel /></LearningProvider>)

      // Now shows empty state
      expect(screen.getByText('No Selection')).toBeInTheDocument()
      expect(screen.queryByTestId('phase-detail-title')).not.toBeInTheDocument()
    })

    it('updates view when switching between phases', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: createMockPlan()
      })

      const { rerender } = renderWithProviders(<DetailPanel />)

      // Initially shows phase 1
      expect(screen.getByTestId('phase-detail-number')).toHaveTextContent('1')
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Phase One')

      // Change to phase 2
      act(() => {
        useTikiStore.setState({ selectedNode: 'phase-2' })
      })
      rerender(<LearningProvider><DetailPanel /></LearningProvider>)

      // Now shows phase 2
      expect(screen.getByTestId('phase-detail-number')).toHaveTextContent('2')
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Phase Two')
    })
  })

  describe('Header', () => {
    it('always shows Details header', () => {
      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('Details')).toBeInTheDocument()
    })

    it('shows Details header with phase selected', () => {
      useTikiStore.setState({
        selectedNode: 'phase-1',
        currentPlan: createMockPlan()
      })

      renderWithProviders(<DetailPanel />)

      expect(screen.getByText('Details')).toBeInTheDocument()
    })
  })
})

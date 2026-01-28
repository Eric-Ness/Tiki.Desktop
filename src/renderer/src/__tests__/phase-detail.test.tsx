import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhaseDetail, type PhaseData } from '../components/detail/PhaseDetail'

// Helper to render PhaseDetail with default props
function renderPhaseDetail(overrides: Partial<PhaseData> = {}) {
  const defaultPhase: PhaseData = {
    number: 1,
    title: 'Test Phase',
    status: 'pending',
    files: [],
    verification: []
  }

  return render(<PhaseDetail phase={{ ...defaultPhase, ...overrides }} />)
}

describe('PhaseDetail', () => {
  describe('Basic rendering', () => {
    it('renders phase number and title', () => {
      renderPhaseDetail({ number: 3, title: 'Setup environment' })

      expect(screen.getByTestId('phase-detail-number')).toHaveTextContent('3')
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Setup environment')
    })
  })

  describe('Status badge', () => {
    it('shows status badge with correct color for pending', () => {
      renderPhaseDetail({ status: 'pending' })

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('pending')
      expect(badge).toHaveClass('bg-slate-600')
      expect(badge).toHaveClass('text-slate-200')
    })

    it('shows status badge with correct color for in_progress', () => {
      renderPhaseDetail({ status: 'in_progress' })

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('in_progress')
      expect(badge).toHaveClass('bg-amber-600')
      expect(badge).toHaveClass('text-amber-100')
    })

    it('shows status badge with correct color for completed', () => {
      renderPhaseDetail({ status: 'completed' })

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('completed')
      expect(badge).toHaveClass('bg-green-600')
      expect(badge).toHaveClass('text-green-100')
    })

    it('shows status badge with correct color for failed', () => {
      renderPhaseDetail({ status: 'failed' })

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('failed')
      expect(badge).toHaveClass('bg-red-600')
      expect(badge).toHaveClass('text-red-100')
    })

    it('shows status badge with correct color for skipped', () => {
      renderPhaseDetail({ status: 'skipped' })

      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent('skipped')
      expect(badge).toHaveClass('bg-slate-500')
      expect(badge).toHaveClass('text-slate-200')
    })
  })

  describe('Files section', () => {
    it('displays file list when files present', () => {
      renderPhaseDetail({
        files: ['src/app.ts', 'src/utils.ts', 'package.json']
      })

      expect(screen.getByText('Files')).toBeInTheDocument()
      expect(screen.getByText('src/app.ts')).toBeInTheDocument()
      expect(screen.getByText('src/utils.ts')).toBeInTheDocument()
      expect(screen.getByText('package.json')).toBeInTheDocument()
    })

    it('shows "No files" message when files array empty', () => {
      renderPhaseDetail({ files: [] })

      expect(screen.getByText('Files')).toBeInTheDocument()
      expect(screen.getByText('No files')).toBeInTheDocument()
    })

    it('displays files with monospace font', () => {
      renderPhaseDetail({ files: ['src/app.ts'] })

      const fileElement = screen.getByText('src/app.ts')
      expect(fileElement).toHaveClass('font-mono')
    })
  })

  describe('Verification section', () => {
    it('shows verification checklist with disabled checkboxes', () => {
      renderPhaseDetail({
        verification: ['Unit tests pass', 'Integration tests pass', 'Code review approved']
      })

      expect(screen.getByText('Verification')).toBeInTheDocument()

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(3)
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled()
      })

      expect(screen.getByText('Unit tests pass')).toBeInTheDocument()
      expect(screen.getByText('Integration tests pass')).toBeInTheDocument()
      expect(screen.getByText('Code review approved')).toBeInTheDocument()
    })

    it('shows verification items checked when phase completed', () => {
      renderPhaseDetail({
        status: 'completed',
        verification: ['Unit tests pass', 'Integration tests pass']
      })

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked()
      })
    })

    it('shows verification items unchecked when phase not completed', () => {
      renderPhaseDetail({
        status: 'in_progress',
        verification: ['Unit tests pass']
      })

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('shows "No verification items" when verification array empty', () => {
      renderPhaseDetail({ verification: [] })

      expect(screen.getByText('Verification')).toBeInTheDocument()
      expect(screen.getByText('No verification items')).toBeInTheDocument()
    })
  })

  describe('Summary section', () => {
    it('shows summary section when phase completed and summary exists', () => {
      renderPhaseDetail({
        status: 'completed',
        summary: 'Phase completed successfully with all tests passing.'
      })

      expect(screen.getByText('Summary')).toBeInTheDocument()
      expect(
        screen.getByText('Phase completed successfully with all tests passing.')
      ).toBeInTheDocument()
    })

    it('does not show summary section when phase not completed', () => {
      renderPhaseDetail({
        status: 'in_progress',
        summary: 'This should not be shown'
      })

      expect(screen.queryByText('Summary')).not.toBeInTheDocument()
    })

    it('does not show summary section when summary is undefined', () => {
      renderPhaseDetail({
        status: 'completed',
        summary: undefined
      })

      expect(screen.queryByText('Summary')).not.toBeInTheDocument()
    })

    it('does not show summary section when summary is empty string', () => {
      renderPhaseDetail({
        status: 'completed',
        summary: ''
      })

      expect(screen.queryByText('Summary')).not.toBeInTheDocument()
    })
  })

  describe('Error section', () => {
    it('shows error section with red styling when phase failed and error exists', () => {
      renderPhaseDetail({
        status: 'failed',
        error: 'Test failed: expected true but got false'
      })

      expect(screen.getByText('Error')).toBeInTheDocument()
      const errorMessage = screen.getByText('Test failed: expected true but got false')
      expect(errorMessage).toBeInTheDocument()

      const errorSection = screen.getByTestId('error-section')
      expect(errorSection).toHaveClass('bg-red-900/30')
      expect(errorSection).toHaveClass('border-red-700')
    })

    it('does not show error section when phase not failed', () => {
      renderPhaseDetail({
        status: 'completed',
        error: 'This should not be shown'
      })

      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })

    it('does not show error section when error is undefined', () => {
      renderPhaseDetail({
        status: 'failed',
        error: undefined
      })

      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })

    it('does not show error section when error is empty string', () => {
      renderPhaseDetail({
        status: 'failed',
        error: ''
      })

      expect(screen.queryByText('Error')).not.toBeInTheDocument()
    })
  })

  describe('Missing optional fields', () => {
    it('handles missing summary gracefully', () => {
      const phase: PhaseData = {
        number: 1,
        title: 'Test Phase',
        status: 'completed',
        files: ['src/app.ts'],
        verification: ['Tests pass']
      }

      expect(() => render(<PhaseDetail phase={phase} />)).not.toThrow()
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Test Phase')
    })

    it('handles missing error gracefully', () => {
      const phase: PhaseData = {
        number: 1,
        title: 'Test Phase',
        status: 'failed',
        files: [],
        verification: []
      }

      expect(() => render(<PhaseDetail phase={phase} />)).not.toThrow()
      expect(screen.getByTestId('phase-detail-title')).toHaveTextContent('Test Phase')
    })
  })

  describe('Phase number styling', () => {
    it('displays phase number in a colored circle matching PhaseNode colors', () => {
      renderPhaseDetail({ number: 2, status: 'completed' })

      const numberCircle = screen.getByTestId('phase-detail-number')
      expect(numberCircle).toHaveTextContent('2')
      expect(numberCircle).toHaveClass('rounded-full')
      expect(numberCircle).toHaveClass('bg-green-500')
    })

    it('applies pending status color to phase number circle', () => {
      renderPhaseDetail({ status: 'pending' })

      const numberCircle = screen.getByTestId('phase-detail-number')
      expect(numberCircle).toHaveClass('bg-slate-500')
    })

    it('applies in_progress status color to phase number circle', () => {
      renderPhaseDetail({ status: 'in_progress' })

      const numberCircle = screen.getByTestId('phase-detail-number')
      expect(numberCircle).toHaveClass('bg-amber-500')
    })

    it('applies failed status color to phase number circle', () => {
      renderPhaseDetail({ status: 'failed' })

      const numberCircle = screen.getByTestId('phase-detail-number')
      expect(numberCircle).toHaveClass('bg-red-500')
    })

    it('applies skipped status color to phase number circle', () => {
      renderPhaseDetail({ status: 'skipped' })

      const numberCircle = screen.getByTestId('phase-detail-number')
      expect(numberCircle).toHaveClass('bg-slate-400')
    })
  })
})

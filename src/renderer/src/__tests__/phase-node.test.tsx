import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { PhaseNode, type PhaseNodeData } from '../components/workflow/nodes/PhaseNode'

// Mock @xyflow/react internals that PhaseNode depends on
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    Handle: ({ type, position }: { type: string; position: string }) => (
      <div data-testid={`handle-${type}`} data-position={position} />
    )
  }
})

// Helper type for test data (without index signature)
type TestPhaseData = {
  number?: number
  title?: string
  status?: PhaseNodeData['status']
  files?: string[]
  verification?: string[]
}

// Helper to render PhaseNode with required props
function renderPhaseNode(data: TestPhaseData = {}) {
  const defaultData: PhaseNodeData = {
    number: 1,
    title: 'Test Phase',
    status: 'pending',
    files: [],
    verification: []
  }

  const nodeProps = {
    data: { ...defaultData, ...data }
  }

  return render(
    <ReactFlowProvider>
      <PhaseNode {...nodeProps} />
    </ReactFlowProvider>
  )
}

describe('PhaseNode', () => {
  describe('Basic rendering', () => {
    it('renders phase number and title', () => {
      renderPhaseNode({ number: 3, title: 'Setup environment' })

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Setup environment')).toBeInTheDocument()
    })

    it('renders source and target handles', () => {
      renderPhaseNode()

      expect(screen.getByTestId('handle-target')).toBeInTheDocument()
      expect(screen.getByTestId('handle-source')).toBeInTheDocument()
      expect(screen.getByTestId('handle-target')).toHaveAttribute('data-position', 'top')
      expect(screen.getByTestId('handle-source')).toHaveAttribute('data-position', 'bottom')
    })
  })

  describe('Status: pending', () => {
    it('shows pending state with gray styling and dashed border', () => {
      const { container } = renderPhaseNode({ status: 'pending' })

      const node = container.querySelector('[data-status="pending"]')
      expect(node).toBeInTheDocument()
      expect(node).toHaveClass('border-slate-500')
      expect(node).toHaveClass('border-dashed')
      expect(node).toHaveClass('bg-slate-800/50')
    })
  })

  describe('Status: in_progress', () => {
    it('shows in_progress state with amber styling and node-running class', () => {
      const { container } = renderPhaseNode({ status: 'in_progress' })

      const node = container.querySelector('[data-status="in_progress"]')
      expect(node).toBeInTheDocument()
      expect(node).toHaveClass('border-amber-500')
      expect(node).toHaveClass('bg-amber-900/20')
      expect(node).toHaveClass('node-running')
    })
  })

  describe('Status: completed', () => {
    it('shows completed state with green styling and solid border', () => {
      const { container } = renderPhaseNode({ status: 'completed' })

      const node = container.querySelector('[data-status="completed"]')
      expect(node).toBeInTheDocument()
      expect(node).toHaveClass('border-green-500')
      expect(node).toHaveClass('bg-green-900/20')
      expect(node).toHaveClass('border-solid')
    })
  })

  describe('Status: failed', () => {
    it('shows failed state with red styling and solid border', () => {
      const { container } = renderPhaseNode({ status: 'failed' })

      const node = container.querySelector('[data-status="failed"]')
      expect(node).toBeInTheDocument()
      expect(node).toHaveClass('border-red-500')
      expect(node).toHaveClass('bg-red-900/20')
      expect(node).toHaveClass('border-solid')
    })
  })

  describe('Status: skipped', () => {
    it('shows skipped state with gray styling and dotted border', () => {
      const { container } = renderPhaseNode({ status: 'skipped' })

      const node = container.querySelector('[data-status="skipped"]')
      expect(node).toBeInTheDocument()
      expect(node).toHaveClass('border-slate-400')
      expect(node).toHaveClass('border-dotted')
      expect(node).toHaveClass('bg-slate-800/30')
    })
  })

  describe('File count badge', () => {
    it('displays file count badge when files are present', () => {
      renderPhaseNode({
        files: ['src/app.ts', 'src/utils.ts', 'package.json']
      })

      expect(screen.getByText('3')).toBeInTheDocument() // phase number
      expect(screen.getByTestId('file-count-badge')).toBeInTheDocument()
      expect(screen.getByTestId('file-count-badge')).toHaveTextContent('3')
    })

    it('does not display file count badge when no files', () => {
      renderPhaseNode({ files: [] })

      expect(screen.queryByTestId('file-count-badge')).not.toBeInTheDocument()
    })
  })

  describe('Node dimensions', () => {
    it('has correct node dimensions', () => {
      const { container } = renderPhaseNode()

      const node = container.querySelector('[data-status]')
      expect(node).toHaveClass('w-[180px]')
      expect(node).toHaveClass('min-h-[80px]')
    })
  })

  describe('Phase number styling', () => {
    it('displays phase number in a styled circle', () => {
      renderPhaseNode({ number: 2, status: 'completed' })

      const numberCircle = screen.getByTestId('phase-number')
      expect(numberCircle).toHaveTextContent('2')
      expect(numberCircle).toHaveClass('rounded-full')
    })

    it('applies status-specific color to phase number circle', () => {
      const { container } = renderPhaseNode({ number: 1, status: 'completed' })

      const numberCircle = container.querySelector('[data-testid="phase-number"]')
      expect(numberCircle).toHaveClass('bg-green-500')
    })
  })

  describe('Title truncation', () => {
    it('truncates long titles with ellipsis', () => {
      const { container } = renderPhaseNode({
        title: 'This is a very long phase title that should be truncated with ellipsis'
      })

      const titleElement = container.querySelector('[data-testid="phase-title"]')
      expect(titleElement).toHaveClass('truncate')
    })
  })
})

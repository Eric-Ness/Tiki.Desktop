import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas'
import { useTikiStore } from '../stores/tiki-store'
import type { ExecutionPlan } from '../stores/tiki-store'

// Node type for our mock
interface MockNode {
  id: string
  data: unknown
}

// Extended node type for our mock
interface MockNodeWithType extends MockNode {
  type?: string
}

// Mock @xyflow/react - we need to intercept onNodeClick
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    ReactFlow: ({
      nodes,
      onNodeClick,
      nodeTypes,
      children
    }: {
      nodes: MockNodeWithType[]
      onNodeClick?: (event: React.MouseEvent, node: MockNodeWithType) => void
      nodeTypes?: Record<string, React.ComponentType<{ data: unknown }>>
      children?: React.ReactNode
    }) => {
      return (
        <div data-testid="react-flow-mock">
          {nodes.map((node: MockNodeWithType) => {
            // Get the appropriate component based on node type
            const NodeComponent = node.type && nodeTypes?.[node.type]
            return (
              <div
                key={node.id}
                data-testid={`node-${node.id}`}
                onClick={(e) => onNodeClick?.(e, node)}
              >
                {NodeComponent && <NodeComponent data={node.data} />}
              </div>
            )
          })}
          {children}
        </div>
      )
    },
    useReactFlow: () => ({
      fitView: vi.fn()
    }),
    Handle: ({ type, position }: { type: string; position: string }) => (
      <div data-testid={`handle-${type}`} data-position={position} />
    )
  }
})

// Helper to create a test plan
function createTestPlan(phases: number): ExecutionPlan {
  return {
    issue: { number: 1, title: 'Test Issue' },
    status: 'executing',
    phases: Array.from({ length: phases }, (_, i) => ({
      number: i + 1,
      title: `Phase ${i + 1}`,
      status: i === 0 ? 'in_progress' : 'pending',
      files: [`file${i + 1}.ts`],
      verification: [`verify ${i + 1}`]
    }))
  }
}

// Helper to create a test plan with assumptions
function createTestPlanWithAssumptions(
  phases: number,
  assumptions: Array<{ id: string; confidence: 'high' | 'medium' | 'low'; description: string; affectsPhases?: number[] }>
): ExecutionPlan {
  return {
    ...createTestPlan(phases),
    assumptions
  }
}

describe('WorkflowCanvas', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTikiStore.setState({
      currentPlan: null,
      selectedNode: null
    })
  })

  describe('Node Selection', () => {
    it('should call setSelectedNode when clicking a phase node', async () => {
      // Setup: Set a plan with phases
      const testPlan = createTestPlan(3)
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // Find and click the first phase node
      const node1 = screen.getByTestId('node-phase-1')
      fireEvent.click(node1)

      // Verify setSelectedNode was called with the node id
      await waitFor(() => {
        expect(useTikiStore.getState().selectedNode).toBe('phase-1')
      })
    })

    it('should change selection when clicking a different node', async () => {
      const testPlan = createTestPlan(3)
      useTikiStore.setState({ currentPlan: testPlan, selectedNode: 'phase-1' })

      render(<WorkflowCanvas />)

      // Click a different node
      const node2 = screen.getByTestId('node-phase-2')
      fireEvent.click(node2)

      // Verify selection changed
      await waitFor(() => {
        expect(useTikiStore.getState().selectedNode).toBe('phase-2')
      })
    })

    it('should pass selected state to nodes via data', async () => {
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan, selectedNode: 'phase-1' })

      const { container } = render(<WorkflowCanvas />)

      // The selected node should have the selected styling (ring-amber-500)
      await waitFor(() => {
        const selectedNode = container.querySelector('[data-selected="true"]')
        expect(selectedNode).toBeInTheDocument()
      })
    })
  })

  describe('Selected Node Styling', () => {
    it('should apply ring styling to selected node', async () => {
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan, selectedNode: 'phase-1' })

      const { container } = render(<WorkflowCanvas />)

      // Check for ring styling on selected node
      await waitFor(() => {
        const selectedNode = container.querySelector('[data-selected="true"]')
        expect(selectedNode).toHaveClass('ring-2')
        expect(selectedNode).toHaveClass('ring-amber-500')
      })
    })

    it('should not apply ring styling to unselected nodes', async () => {
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan, selectedNode: 'phase-1' })

      const { container } = render(<WorkflowCanvas />)

      // Check that unselected node does not have ring styling
      await waitFor(() => {
        const unselectedNode = container.querySelector('[data-selected="false"]')
        expect(unselectedNode).not.toHaveClass('ring-2')
      })
    })
  })

  describe('Store Integration', () => {
    it('should subscribe to currentPlan from store', async () => {
      // Initially no plan
      render(<WorkflowCanvas />)

      // Should show empty state
      expect(screen.getByText('No workflow phases')).toBeInTheDocument()

      // Update store with a plan
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan })

      // Should now show nodes
      await waitFor(() => {
        expect(screen.getByTestId('node-phase-1')).toBeInTheDocument()
        expect(screen.getByTestId('node-phase-2')).toBeInTheDocument()
      })
    })

    it('should subscribe to selectedNode from store', async () => {
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan, selectedNode: null })

      const { container } = render(<WorkflowCanvas />)

      // Initially no selection
      expect(container.querySelector('[data-selected="true"]')).not.toBeInTheDocument()

      // Update store with selection
      useTikiStore.setState({ selectedNode: 'phase-2' })

      // Should now have selected node
      await waitFor(() => {
        const selectedNode = container.querySelector('[data-selected="true"]')
        expect(selectedNode).toBeInTheDocument()
      })
    })
  })

  describe('Risk Indicator Integration', () => {
    it('should pass hasRisk=true to phases with low-confidence assumptions', async () => {
      const testPlan = createTestPlanWithAssumptions(3, [
        { id: 'A1', confidence: 'low', description: 'Low confidence assumption', affectsPhases: [1, 2] }
      ])
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // Phases 1 and 2 should have risk indicator
      await waitFor(() => {
        const phase1 = screen.getByTestId('node-phase-1')
        expect(phase1.querySelector('[data-testid="risk-indicator"]')).toBeInTheDocument()

        const phase2 = screen.getByTestId('node-phase-2')
        expect(phase2.querySelector('[data-testid="risk-indicator"]')).toBeInTheDocument()
      })

      // Phase 3 should not have risk indicator
      const phase3 = screen.getByTestId('node-phase-3')
      expect(phase3.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()
    })

    it('should not pass hasRisk for high-confidence assumptions', async () => {
      const testPlan = createTestPlanWithAssumptions(2, [
        { id: 'A1', confidence: 'high', description: 'High confidence assumption', affectsPhases: [1, 2] }
      ])
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // Neither phase should have risk indicator
      await waitFor(() => {
        const phase1 = screen.getByTestId('node-phase-1')
        expect(phase1.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()

        const phase2 = screen.getByTestId('node-phase-2')
        expect(phase2.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()
      })
    })

    it('should not pass hasRisk for medium-confidence assumptions', async () => {
      const testPlan = createTestPlanWithAssumptions(2, [
        { id: 'A1', confidence: 'medium', description: 'Medium confidence assumption', affectsPhases: [1] }
      ])
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // Phase should not have risk indicator
      await waitFor(() => {
        const phase1 = screen.getByTestId('node-phase-1')
        expect(phase1.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()
      })
    })

    it('should handle plan without assumptions', async () => {
      const testPlan = createTestPlan(2)
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // No phases should have risk indicator
      await waitFor(() => {
        const phase1 = screen.getByTestId('node-phase-1')
        expect(phase1.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()

        const phase2 = screen.getByTestId('node-phase-2')
        expect(phase2.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()
      })
    })

    it('should handle assumptions without affectsPhases', async () => {
      const testPlan = createTestPlanWithAssumptions(2, [
        { id: 'A1', confidence: 'low', description: 'Low confidence without phases' }
      ])
      useTikiStore.setState({ currentPlan: testPlan })

      render(<WorkflowCanvas />)

      // No phases should have risk indicator
      await waitFor(() => {
        const phase1 = screen.getByTestId('node-phase-1')
        expect(phase1.querySelector('[data-testid="risk-indicator"]')).not.toBeInTheDocument()
      })
    })
  })
})

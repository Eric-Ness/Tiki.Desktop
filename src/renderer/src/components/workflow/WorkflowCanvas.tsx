/**
 * WorkflowCanvas.tsx
 *
 * React Flow canvas for visualizing Tiki execution plan phases as a connected
 * workflow diagram. Renders the current plan as a vertical graph with automatic
 * dagre layout positioning.
 *
 * @description
 * This component serves as the main workflow visualization, displaying execution
 * plans as interactive node graphs. It converts plan data from the tiki-store
 * into React Flow nodes and edges, applies automatic layout, and handles user
 * interactions like node selection and phase navigation.
 *
 * @dependencies
 * - @xyflow/react: ReactFlow, Controls, MiniMap, Background, ReactFlowProvider
 * - dagre (via workflow-layout): Automatic graph layout algorithm
 *
 * @nodeTypes
 * - phase: PhaseNode - Execution phase with status, title, file count, risk indicator
 * - issue: IssueNode - GitHub issue at the top of the workflow
 * - ship: ShipNode - Final ship node indicating completion readiness
 *
 * @edgeTypes
 * - dependency: DependencyEdge - Animated/solid connector based on target status
 *
 * @storeConnections
 * - useTikiStore.currentPlan: Source data for nodes/edges (via planToNodes, planToEdges)
 * - useTikiStore.tikiState: Current execution state (activeIssue, currentPhase, status)
 * - useTikiStore.selectedNode: Currently selected node ID for highlighting
 * - useTikiStore.setSelectedNode: Updates selection on node click
 *
 * @hooks
 * - usePhaseControls: Provides pause, resume, skipPhase, redoPhase actions
 *   that send Tiki commands to the terminal
 *
 * @keyFunctions
 * - getLayoutedElements: Applies dagre top-to-bottom layout to nodes/edges
 * - planToNodes: Converts ExecutionPlan to React Flow nodes (issue, phases, ship)
 * - planToEdges: Creates sequential edges connecting all nodes
 * - getPhasesWithRisk: Identifies phases affected by low-confidence assumptions
 *
 * @keyBehaviors
 * - Auto-fit: Fits view to content when plan changes (with padding)
 * - Auto-focus: Centers view on currently executing phase when currentPhase changes
 * - Auto-select: Automatically selects the active phase node during execution
 * - Risk indicators: Shows warning badge on phases with low-confidence assumptions
 * - Empty state: Displays placeholder when no workflow phases exist
 *
 * @childComponents
 * - PhaseControls: Toolbar with pause/resume/skip/redo buttons
 * - Controls: React Flow zoom controls (bottom-left)
 * - MiniMap: Overview minimap (bottom-right)
 * - Background: Dot pattern background
 */
import { useMemo, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getLayoutedElements, planToNodes, planToEdges } from '../../lib/workflow-layout'
import { PhaseNode } from './nodes/PhaseNode'
import { IssueNode } from './nodes/IssueNode'
import { ShipNode } from './nodes/ShipNode'
import { DependencyEdge } from './edges/DependencyEdge'
import { PhaseControls } from './PhaseControls'
import { useTikiStore, getPhasesWithRisk } from '../../stores/tiki-store'
import { usePhaseControls } from '../../hooks/usePhaseControls'

// Register custom node types
const nodeTypes: NodeTypes = {
  phase: PhaseNode,
  issue: IssueNode,
  ship: ShipNode
}

// Register custom edge types
const edgeTypes: EdgeTypes = {
  dependency: DependencyEdge
}

interface WorkflowCanvasProps {
  nodes?: Node[]
  edges?: Edge[]
}

function WorkflowCanvasInner({ nodes: propNodes, edges: propEdges }: WorkflowCanvasProps) {
  const { fitView, setCenter, getNode } = useReactFlow()
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const tikiState = useTikiStore((state) => state.tikiState)
  const selectedNode = useTikiStore((state) => state.selectedNode)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const { pause, resume, skipPhase, redoPhase } = usePhaseControls()

  // Convert plan to nodes/edges, or use props if provided
  const { nodes, edges } = useMemo(() => {
    // If nodes are passed as props, use them (for testing or manual control)
    if (propNodes && propNodes.length > 0) {
      return { nodes: propNodes, edges: propEdges || [] }
    }

    // Otherwise, derive from currentPlan
    const planNodes = planToNodes(currentPlan)
    const planEdges = planToEdges(currentPlan)
    return { nodes: planNodes, edges: planEdges }
  }, [currentPlan, propNodes, propEdges])

  // Apply auto-layout to nodes
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(nodes, edges),
    [nodes, edges]
  )

  // Calculate phases with risk (low-confidence assumptions)
  const riskyPhases = useMemo(() => getPhasesWithRisk(currentPlan), [currentPlan])

  // Add selected state and risk indicator to nodes
  const nodesWithSelection = useMemo(
    () =>
      layoutedNodes.map((node) => {
        // Extract phase number from node id (e.g., 'phase-1' -> 1)
        const phaseMatch = node.id.match(/^phase-(\d+)$/)
        const phaseNumber = phaseMatch ? parseInt(phaseMatch[1], 10) : null
        const hasRisk = phaseNumber !== null && riskyPhases.has(phaseNumber)

        return {
          ...node,
          data: {
            ...node.data,
            selected: node.id === selectedNode,
            hasRisk
          }
        }
      }),
    [layoutedNodes, selectedNode, riskyPhases]
  )

  // Handle node click - update selected node in store
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  // Fit view when plan changes
  const handleFitView = useCallback(() => {
    if (layoutedNodes.length > 0) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
  }, [fitView, layoutedNodes.length])

  useEffect(() => {
    handleFitView()
  }, [handleFitView])

  // Auto-focus to currently executing phase when it changes
  useEffect(() => {
    if (tikiState?.currentPhase) {
      const nodeId = `phase-${tikiState.currentPhase}`

      // Auto-select the current phase
      setSelectedNode(nodeId)

      // Center view on the active node after a short delay for rendering
      setTimeout(() => {
        const node = getNode(nodeId)
        if (node) {
          setCenter(
            node.position.x + 90, // Center on node (half of typical node width)
            node.position.y + 40, // Center on node (half of typical node height)
            { duration: 300, zoom: 1 }
          )
        }
      }, 100)
    }
  }, [tikiState?.currentPhase, setSelectedNode, setCenter, getNode])

  const hasNodes = nodesWithSelection.length > 0

  return (
    <div className="w-full h-full relative">
      {/* Phase Controls Toolbar */}
      <PhaseControls
        onPause={pause}
        onResume={resume}
        onSkip={skipPhase}
        onRedo={redoPhase}
      />

      <ReactFlow
        nodes={nodesWithSelection}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        className="bg-background-primary"
        defaultEdgeOptions={{
          type: 'dependency'
        }}
      >
        {/* Dark theme background with dots pattern */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
          className="bg-background-primary"
        />

        {/* Zoom controls positioned bottom-left */}
        <Controls
          position="bottom-left"
          className="[&>button]:bg-background-secondary [&>button]:border-border [&>button]:text-slate-400 [&>button:hover]:bg-background-tertiary"
        />

        {/* MiniMap positioned bottom-right with dark styling */}
        <MiniMap
          position="bottom-right"
          className="bg-background-secondary border border-border rounded"
          nodeColor="#64748b"
          maskColor="rgba(0, 0, 0, 0.6)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Empty state overlay when no nodes */}
      {!hasNodes && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-slate-600 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 17V7m0 10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2m6 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v10z" />
            </svg>
            <p className="text-slate-500 text-sm">No workflow phases</p>
            <p className="text-slate-600 text-xs mt-1">
              Execute a Tiki plan to see phases here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * WorkflowCanvas component wrapped with ReactFlowProvider.
 * Subscribes to currentPlan from tiki store and renders phases as connected nodes.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

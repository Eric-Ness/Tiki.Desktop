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
import { useTikiStore } from '../../stores/tiki-store'

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
  const { fitView } = useReactFlow()
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const selectedNode = useTikiStore((state) => state.selectedNode)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)

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

  // Add selected state to nodes
  const nodesWithSelection = useMemo(
    () =>
      layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedNode
        }
      })),
    [layoutedNodes, selectedNode]
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

  const hasNodes = nodesWithSelection.length > 0

  return (
    <div className="w-full h-full relative">
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

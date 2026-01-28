import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'
import type { ExecutionPlan } from '../stores/tiki-store'

export const NODE_WIDTH = 180
export const NODE_HEIGHT = 80
export const ISSUE_NODE_WIDTH = 160
export const ISSUE_NODE_HEIGHT = 60
export const SHIP_NODE_WIDTH = 100
export const SHIP_NODE_HEIGHT = 60

interface LayoutedElements {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Applies dagre layout to nodes and edges for a top-to-bottom workflow diagram.
 * Returns new arrays with updated positions - does not mutate inputs.
 */
export function getLayoutedElements(nodes: Node[], edges: Edge[]): LayoutedElements {
  // Handle empty case
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Configure for top-to-bottom layout
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 50,
    ranksep: 80
  })

  // Add nodes to dagre graph with type-specific dimensions
  nodes.forEach((node) => {
    let width = NODE_WIDTH
    let height = NODE_HEIGHT

    if (node.type === 'issue') {
      width = ISSUE_NODE_WIDTH
      height = ISSUE_NODE_HEIGHT
    } else if (node.type === 'ship') {
      width = SHIP_NODE_WIDTH
      height = SHIP_NODE_HEIGHT
    }

    dagreGraph.setNode(node.id, { width, height })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run dagre layout algorithm
  dagre.layout(dagreGraph)

  // Map nodes with new positions from dagre
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)

    // Use type-specific dimensions for position calculation
    let width = NODE_WIDTH
    let height = NODE_HEIGHT

    if (node.type === 'issue') {
      width = ISSUE_NODE_WIDTH
      height = ISSUE_NODE_HEIGHT
    } else if (node.type === 'ship') {
      width = SHIP_NODE_WIDTH
      height = SHIP_NODE_HEIGHT
    }

    return {
      ...node,
      position: {
        // Dagre positions are center-based, adjust to top-left for React Flow
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2
      }
    }
  })

  return {
    nodes: layoutedNodes,
    edges: [...edges]
  }
}

/**
 * Converts an ExecutionPlan to React Flow nodes.
 * Creates: issue node at top, phase nodes in middle, ship node at bottom.
 * Returns empty array for null/undefined plan or empty phases.
 */
export function planToNodes(plan: ExecutionPlan | null | undefined): Node[] {
  if (!plan || !plan.phases || plan.phases.length === 0) {
    return []
  }

  const nodes: Node[] = []

  // Add issue node at top
  nodes.push({
    id: 'issue-node',
    type: 'issue',
    position: { x: 0, y: 0 },
    data: {
      number: plan.issue.number,
      title: plan.issue.title
    }
  })

  // Add phase nodes
  plan.phases.forEach((phase) => {
    nodes.push({
      id: `phase-${phase.number}`,
      type: 'phase',
      position: { x: 0, y: 0 },
      data: {
        number: phase.number,
        title: phase.title,
        status: phase.status,
        files: phase.files,
        verification: phase.verification
      }
    })
  })

  // Add ship node at bottom
  // Ship is complete when all phases are completed
  const allPhasesComplete = plan.phases.every((phase) => phase.status === 'completed')
  nodes.push({
    id: 'ship-node',
    type: 'ship',
    position: { x: 0, y: 0 },
    data: {
      complete: allPhasesComplete
    }
  })

  return nodes
}

/**
 * Creates sequential edges connecting the workflow:
 * issue -> phase-1 -> phase-2 -> ... -> phase-N -> ship
 * Returns empty array for null/undefined plan or empty phases.
 */
export function planToEdges(plan: ExecutionPlan | null | undefined): Edge[] {
  if (!plan || !plan.phases || plan.phases.length === 0) {
    return []
  }

  const edges: Edge[] = []
  const firstPhase = plan.phases[0]
  const lastPhase = plan.phases[plan.phases.length - 1]

  // Edge from issue to first phase
  edges.push({
    id: 'edge-issue-phase-1',
    source: 'issue-node',
    target: `phase-${firstPhase.number}`,
    type: 'dependency',
    data: {
      targetStatus: firstPhase.status
    }
  })

  // Edges between phases
  for (let i = 0; i < plan.phases.length - 1; i++) {
    const currentPhase = plan.phases[i]
    const nextPhase = plan.phases[i + 1]

    edges.push({
      id: `edge-${currentPhase.number}-${nextPhase.number}`,
      source: `phase-${currentPhase.number}`,
      target: `phase-${nextPhase.number}`,
      type: 'dependency',
      data: {
        targetStatus: nextPhase.status
      }
    })
  }

  // Edge from last phase to ship
  const allPhasesComplete = plan.phases.every((phase) => phase.status === 'completed')
  edges.push({
    id: 'edge-phase-ship',
    source: `phase-${lastPhase.number}`,
    target: 'ship-node',
    type: 'dependency',
    data: {
      targetStatus: allPhasesComplete ? 'completed' : 'pending'
    }
  })

  return edges
}

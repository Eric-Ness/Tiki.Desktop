import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { DependencyIssueNode, type DependencyIssueNodeData } from './DependencyIssueNode'
import { DependencyEdge } from './DependencyEdge'
import {
  parseDependencies,
  filterDependencies,
  getIssuesInCycles
} from '../../lib/dependency-parser'
import type { GitHubIssue } from '../../stores/tiki-store'

// Register custom node types
const nodeTypes: NodeTypes = {
  dependencyIssue: DependencyIssueNode
}

// Register custom edge types
const edgeTypes = {
  dependency: DependencyEdge
}

// Layout constants
const NODE_WIDTH = 200
const NODE_HEIGHT = 60

interface DependencyGraphProps {
  issues: GitHubIssue[]
  onIssueSelect?: (issueNumber: number) => void
  releaseFilter?: string
  issueNumbers?: Set<number>
}

/**
 * Apply dagre layout algorithm to position nodes.
 */
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: 'TB', // Top to bottom
    nodesep: 50,
    ranksep: 80
  })

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run layout
  dagre.layout(dagreGraph)

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2
      }
    }
  })

  return { nodes: layoutedNodes, edges }
}

function DependencyGraphInner({
  issues,
  onIssueSelect,
  releaseFilter,
  issueNumbers
}: DependencyGraphProps) {
  // Filter issues based on props
  const filteredIssues = useMemo(() => {
    let result = issues

    // Filter by release label
    if (releaseFilter) {
      result = result.filter((issue) =>
        issue.labels.some((label) => label.name === `release:${releaseFilter}`)
      )
    }

    // Filter by specific issue numbers
    if (issueNumbers) {
      result = result.filter((issue) => issueNumbers.has(issue.number))
    }

    return result
  }, [issues, releaseFilter, issueNumbers])

  // Parse dependencies from filtered issues
  const { dependencies, circularDependencies } = useMemo(
    () => parseDependencies(filteredIssues),
    [filteredIssues]
  )

  // Get issues that are part of circular dependencies
  const issuesInCycles = useMemo(
    () => getIssuesInCycles(circularDependencies),
    [circularDependencies]
  )

  // Filter dependencies to only include edges between filtered issues
  const filteredDependencies = useMemo(() => {
    const issueNumberSet = new Set(filteredIssues.map((i) => i.number))
    return filterDependencies(dependencies, issueNumberSet)
  }, [dependencies, filteredIssues])

  // Convert issues to React Flow nodes
  const nodes: Node<DependencyIssueNodeData>[] = useMemo(
    () =>
      filteredIssues.map((issue) => ({
        id: `issue-${issue.number}`,
        type: 'dependencyIssue',
        position: { x: 0, y: 0 },
        data: {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          hasCircularDep: issuesInCycles.has(issue.number)
        }
      })),
    [filteredIssues, issuesInCycles]
  )

  // Convert dependencies to React Flow edges
  const edges: Edge[] = useMemo(
    () =>
      filteredDependencies.map((dep, index) => ({
        id: `dep-${index}`,
        // Edge goes FROM the dependency TO the dependent
        // (issue that is depended on -> issue that depends)
        source: `issue-${dep.to}`,
        target: `issue-${dep.from}`,
        type: 'dependency',
        data: {
          type: dep.type,
          isCircular:
            issuesInCycles.has(dep.from) && issuesInCycles.has(dep.to)
        }
      })),
    [filteredDependencies, issuesInCycles]
  )

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(nodes, edges),
    [nodes, edges]
  )

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const issueNumber = parseInt(node.id.replace('issue-', ''), 10)
      onIssueSelect?.(issueNumber)
    },
    [onIssueSelect]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={layoutedNodes}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
          className="bg-background-primary"
        />

        <Controls
          position="bottom-left"
          className="[&>button]:bg-background-secondary [&>button]:border-border [&>button]:text-slate-400 [&>button:hover]:bg-background-tertiary"
        />

        <MiniMap
          position="bottom-right"
          className="bg-background-secondary border border-border rounded"
          nodeColor={(node) => {
            const data = node.data as DependencyIssueNodeData
            if (data.hasCircularDep) return '#f97316' // orange
            return data.state === 'OPEN' ? '#22c55e' : '#64748b' // green or slate
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Empty state */}
      {filteredIssues.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-slate-600 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            <p className="text-slate-500 text-sm">No issues to display</p>
            <p className="text-slate-600 text-xs mt-1">
              Select issues or adjust filters
            </p>
          </div>
        </div>
      )}

      {/* Circular dependency warning */}
      {circularDependencies.length > 0 && (
        <div className="absolute top-4 left-4 bg-orange-900/80 border border-orange-500 rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-orange-300">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              {circularDependencies.length} circular{' '}
              {circularDependencies.length === 1 ? 'dependency' : 'dependencies'}{' '}
              detected
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * DependencyGraph component wrapped with ReactFlowProvider.
 * Displays GitHub issues as nodes with dependency relationships as edges.
 */
export function DependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  )
}

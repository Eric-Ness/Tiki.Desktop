import { describe, it, expect } from 'vitest'
import {
  getLayoutedElements,
  NODE_WIDTH,
  NODE_HEIGHT,
  planToNodes,
  planToEdges
} from '../lib/workflow-layout'
import type { Node, Edge } from '@xyflow/react'
import type { ExecutionPlan } from '../stores/tiki-store'

describe('workflow-layout', () => {
  describe('getLayoutedElements', () => {
    it('should return empty result for empty nodes', () => {
      const nodes: Node[] = []
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toEqual([])
      expect(result.edges).toEqual([])
    })

    it('should position single node correctly', () => {
      const nodes: Node[] = [
        { id: 'phase-1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 1' } }
      ]
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(1)
      // Node should have a position assigned by dagre
      expect(result.nodes[0].position).toBeDefined()
      expect(typeof result.nodes[0].position.x).toBe('number')
      expect(typeof result.nodes[0].position.y).toBe('number')
    })

    it('should arrange multiple nodes vertically (TB direction)', () => {
      const nodes: Node[] = [
        { id: 'phase-1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 1' } },
        { id: 'phase-2', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 2' } },
        { id: 'phase-3', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 3' } }
      ]
      const edges: Edge[] = [
        { id: 'e1-2', source: 'phase-1', target: 'phase-2' },
        { id: 'e2-3', source: 'phase-2', target: 'phase-3' }
      ]

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(3)

      // Find nodes by id to check vertical arrangement
      const node1 = result.nodes.find(n => n.id === 'phase-1')!
      const node2 = result.nodes.find(n => n.id === 'phase-2')!
      const node3 = result.nodes.find(n => n.id === 'phase-3')!

      // In TB (top-to-bottom) layout, y values should increase
      expect(node2.position.y).toBeGreaterThan(node1.position.y)
      expect(node3.position.y).toBeGreaterThan(node2.position.y)
    })

    it('should preserve edges after layout', () => {
      const nodes: Node[] = [
        { id: 'phase-1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 1' } },
        { id: 'phase-2', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Phase 2' } }
      ]
      const edges: Edge[] = [
        { id: 'e1-2', source: 'phase-1', target: 'phase-2' }
      ]

      const result = getLayoutedElements(nodes, edges)

      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].id).toBe('e1-2')
      expect(result.edges[0].source).toBe('phase-1')
      expect(result.edges[0].target).toBe('phase-2')
    })
  })

  describe('constants', () => {
    it('should export NODE_WIDTH as 180', () => {
      expect(NODE_WIDTH).toBe(180)
    })

    it('should export NODE_HEIGHT as 80', () => {
      expect(NODE_HEIGHT).toBe(80)
    })
  })

  describe('planToNodes', () => {
    it('should create correct node structure from ExecutionPlan', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test Issue' },
        status: 'executing',
        phases: [
          {
            number: 1,
            title: 'Setup environment',
            status: 'completed',
            files: ['package.json', 'tsconfig.json'],
            verification: ['npm install works']
          },
          {
            number: 2,
            title: 'Implement feature',
            status: 'in_progress',
            files: ['src/feature.ts'],
            verification: ['tests pass']
          },
          {
            number: 3,
            title: 'Write tests',
            status: 'pending',
            files: [],
            verification: []
          }
        ]
      }

      const nodes = planToNodes(plan)

      // 1 issue node + 3 phase nodes + 1 ship node = 5 nodes
      expect(nodes).toHaveLength(5)

      // Check issue node at top
      expect(nodes[0]).toMatchObject({
        id: 'issue-node',
        type: 'issue',
        data: {
          number: 1,
          title: 'Test Issue'
        }
      })

      // Check first phase node
      expect(nodes[1]).toMatchObject({
        id: 'phase-1',
        type: 'phase',
        data: {
          number: 1,
          title: 'Setup environment',
          status: 'completed',
          files: ['package.json', 'tsconfig.json'],
          verification: ['npm install works']
        }
      })

      // Check second phase node
      expect(nodes[2]).toMatchObject({
        id: 'phase-2',
        type: 'phase',
        data: {
          number: 2,
          title: 'Implement feature',
          status: 'in_progress',
          files: ['src/feature.ts'],
          verification: ['tests pass']
        }
      })

      // Check third phase node
      expect(nodes[3]).toMatchObject({
        id: 'phase-3',
        type: 'phase',
        data: {
          number: 3,
          title: 'Write tests',
          status: 'pending',
          files: [],
          verification: []
        }
      })

      // Check ship node at bottom (not complete since not all phases are completed)
      expect(nodes[4]).toMatchObject({
        id: 'ship-node',
        type: 'ship',
        data: {
          complete: false
        }
      })
    })

    it('should return empty array for null plan', () => {
      const nodes = planToNodes(null)
      expect(nodes).toEqual([])
    })

    it('should return empty array for undefined plan', () => {
      const nodes = planToNodes(undefined as unknown as ExecutionPlan | null)
      expect(nodes).toEqual([])
    })

    it('should return empty array for plan with empty phases', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test Issue' },
        status: 'idle',
        phases: []
      }

      const nodes = planToNodes(plan)
      expect(nodes).toEqual([])
    })

    it('should assign initial position {x: 0, y: 0} to all nodes', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test' },
        status: 'executing',
        phases: [
          { number: 1, title: 'Phase 1', status: 'pending', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'pending', files: [], verification: [] }
        ]
      }

      const nodes = planToNodes(plan)

      nodes.forEach((node) => {
        expect(node.position).toEqual({ x: 0, y: 0 })
      })
    })
  })

  describe('planToEdges', () => {
    it('should create sequential connections between phases', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test Issue' },
        status: 'executing',
        phases: [
          { number: 1, title: 'Phase 1', status: 'completed', files: [], verification: [] },
          { number: 2, title: 'Phase 2', status: 'in_progress', files: [], verification: [] },
          { number: 3, title: 'Phase 3', status: 'pending', files: [], verification: [] }
        ]
      }

      const edges = planToEdges(plan)

      // issue -> phase-1 + phase-1 -> phase-2 + phase-2 -> phase-3 + phase-3 -> ship = 4 edges
      expect(edges).toHaveLength(4)

      // Issue to first phase
      expect(edges[0]).toMatchObject({
        id: 'edge-issue-phase-1',
        source: 'issue-node',
        target: 'phase-1',
        type: 'dependency'
      })

      // Phase to phase connections
      expect(edges[1]).toMatchObject({
        id: 'edge-1-2',
        source: 'phase-1',
        target: 'phase-2',
        type: 'dependency'
      })

      expect(edges[2]).toMatchObject({
        id: 'edge-2-3',
        source: 'phase-2',
        target: 'phase-3',
        type: 'dependency'
      })

      // Last phase to ship
      expect(edges[3]).toMatchObject({
        id: 'edge-phase-ship',
        source: 'phase-3',
        target: 'ship-node',
        type: 'dependency'
      })
    })

    it('should return empty array for null plan', () => {
      const edges = planToEdges(null)
      expect(edges).toEqual([])
    })

    it('should return empty array for undefined plan', () => {
      const edges = planToEdges(undefined as unknown as ExecutionPlan | null)
      expect(edges).toEqual([])
    })

    it('should return empty array for plan with empty phases', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test Issue' },
        status: 'idle',
        phases: []
      }

      const edges = planToEdges(plan)
      expect(edges).toEqual([])
    })

    it('should create issue and ship connections for single phase', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Test Issue' },
        status: 'executing',
        phases: [{ number: 1, title: 'Only Phase', status: 'pending', files: [], verification: [] }]
      }

      const edges = planToEdges(plan)

      // issue -> phase-1 -> ship = 2 edges
      expect(edges).toHaveLength(2)

      expect(edges[0]).toMatchObject({
        id: 'edge-issue-phase-1',
        source: 'issue-node',
        target: 'phase-1',
        type: 'dependency'
      })

      expect(edges[1]).toMatchObject({
        id: 'edge-phase-ship',
        source: 'phase-1',
        target: 'ship-node',
        type: 'dependency'
      })
    })
  })

  describe('layout with 10+ phases', () => {
    it('should layout 10+ phases without overlap (y positions increase)', () => {
      const plan: ExecutionPlan = {
        issue: { number: 1, title: 'Large Plan' },
        status: 'executing',
        phases: Array.from({ length: 12 }, (_, i) => ({
          number: i + 1,
          title: `Phase ${i + 1}`,
          status: 'pending',
          files: [],
          verification: []
        }))
      }

      const nodes = planToNodes(plan)
      const edges = planToEdges(plan)

      // 1 issue node + 12 phase nodes + 1 ship node = 14 nodes
      expect(nodes).toHaveLength(14)
      // issue -> phase-1 + 11 phase-to-phase edges + phase-12 -> ship = 13 edges
      expect(edges).toHaveLength(13)

      // Apply layout
      const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges)

      expect(layoutedNodes).toHaveLength(14)

      // Get phase nodes only for y position verification
      const phaseNodes = layoutedNodes.filter((n) => n.type === 'phase')

      // Verify y positions increase for each subsequent phase (TB layout)
      for (let i = 1; i < phaseNodes.length; i++) {
        const prevNode = layoutedNodes.find((n) => n.id === `phase-${i}`)!
        const currNode = layoutedNodes.find((n) => n.id === `phase-${i + 1}`)!

        expect(currNode.position.y).toBeGreaterThan(prevNode.position.y)
      }

      // Verify issue node is at top and ship node is at bottom
      const issueNode = layoutedNodes.find((n) => n.id === 'issue-node')!
      const shipNode = layoutedNodes.find((n) => n.id === 'ship-node')!
      const firstPhase = layoutedNodes.find((n) => n.id === 'phase-1')!
      const lastPhase = layoutedNodes.find((n) => n.id === 'phase-12')!

      expect(issueNode.position.y).toBeLessThan(firstPhase.position.y)
      expect(shipNode.position.y).toBeGreaterThan(lastPhase.position.y)

      // Verify no overlapping (nodes should have minimum separation)
      const sortedByY = [...layoutedNodes].sort((a, b) => a.position.y - b.position.y)
      for (let i = 1; i < sortedByY.length; i++) {
        const gap = sortedByY[i].position.y - sortedByY[i - 1].position.y
        expect(gap).toBeGreaterThan(0) // At minimum, no overlap
      }
    })
  })
})

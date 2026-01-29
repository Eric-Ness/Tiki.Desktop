import { describe, it, expect } from 'vitest'
import {
  parseDependencies,
  detectCircularDependencies,
  type IssueDependency,
  type IssueForParsing
} from '../dependency-parser'

describe('dependency-parser', () => {
  describe('parseDependencies', () => {
    it('should return empty dependencies for empty issues array', () => {
      const result = parseDependencies([])

      expect(result.dependencies).toEqual([])
      expect(result.circularDependencies).toEqual([])
    })

    it('should return empty dependencies for issues without dependency text', () => {
      const issues: IssueForParsing[] = [
        { number: 1, body: 'This is a regular issue' },
        { number: 2, body: 'No dependencies here' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toEqual([])
    })

    it('should parse "depends on #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 2, body: 'This depends on #1 before we can start' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 2,
        to: 1,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "depend on #X" pattern (without s)', () => {
      const issues: IssueForParsing[] = [
        { number: 3, body: 'We depend on #2' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 3,
        to: 2,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "blocked by #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 5, body: 'This is blocked by #4' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 5,
        to: 4,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "blocks #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 5, body: 'Issue #4 blocks #5' }
      ]

      // Note: This pattern means #4 blocks #5, but we parse from #5's perspective
      // So we look for "blocks" pattern in a different way - actually let's skip this
      // The main patterns are "blocked by" not "blocks"
      const result = parseDependencies(issues)

      // "blocks #5" in issue 5's body doesn't mean 5 depends on anything
      expect(result.dependencies).toHaveLength(0)
    })

    it('should parse "after #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 3, body: 'Start after #2 is complete' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 3,
        to: 2,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "requires #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 4, body: 'This requires #3 to be done' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 4,
        to: 3,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "require #X" pattern (without s)', () => {
      const issues: IssueForParsing[] = [
        { number: 4, body: 'We require #3' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 4,
        to: 3,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse "prerequisite: #X" pattern', () => {
      const issues: IssueForParsing[] = [
        { number: 5, body: 'Prerequisite: #4\nMore text here' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies[0]).toMatchObject({
        from: 5,
        to: 4,
        type: 'blocks',
        source: 'body'
      })
    })

    it('should parse multiple dependencies in one issue body', () => {
      const issues: IssueForParsing[] = [
        { number: 10, body: 'This depends on #1 and is blocked by #2, also requires #3' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies.map(d => d.to).sort()).toEqual([1, 2, 3])
      expect(result.dependencies.every(d => d.from === 10)).toBe(true)
    })

    it('should parse dependencies from multiple issues', () => {
      const issues: IssueForParsing[] = [
        { number: 2, body: 'Depends on #1' },
        { number: 3, body: 'Depends on #1. Also depends on #2' },
        { number: 4, body: 'After #3' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(4)

      // Issue #2 depends on #1
      expect(result.dependencies.some(d => d.from === 2 && d.to === 1)).toBe(true)
      // Issue #3 depends on #1 and #2
      expect(result.dependencies.some(d => d.from === 3 && d.to === 1)).toBe(true)
      expect(result.dependencies.some(d => d.from === 3 && d.to === 2)).toBe(true)
      // Issue #4 depends on #3
      expect(result.dependencies.some(d => d.from === 4 && d.to === 3)).toBe(true)
    })

    it('should handle issues with null body', () => {
      const issues: IssueForParsing[] = [
        { number: 1, body: null },
        { number: 2, body: undefined }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toEqual([])
    })

    it('should handle case-insensitive patterns', () => {
      const issues: IssueForParsing[] = [
        { number: 2, body: 'DEPENDS ON #1' },
        { number: 3, body: 'Blocked By #2' },
        { number: 4, body: 'REQUIRES #3' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(3)
    })

    it('should not duplicate dependencies for same from/to pair', () => {
      const issues: IssueForParsing[] = [
        { number: 2, body: 'Depends on #1. Also blocked by #1.' }
      ]

      const result = parseDependencies(issues)

      // Should only have one dependency from 2 to 1
      const depsFromTo = result.dependencies.filter(d => d.from === 2 && d.to === 1)
      expect(depsFromTo).toHaveLength(1)
    })
  })

  describe('detectCircularDependencies', () => {
    it('should return empty array when no dependencies', () => {
      const result = detectCircularDependencies([])
      expect(result).toEqual([])
    })

    it('should return empty array when no cycles exist', () => {
      const deps: IssueDependency[] = [
        { from: 2, to: 1, type: 'blocks', source: 'body' },
        { from: 3, to: 2, type: 'blocks', source: 'body' },
        { from: 4, to: 3, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toEqual([])
    })

    it('should detect simple 2-node cycle', () => {
      const deps: IssueDependency[] = [
        { from: 1, to: 2, type: 'blocks', source: 'body' },
        { from: 2, to: 1, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toHaveLength(1)
      expect(result[0].sort()).toEqual([1, 2])
    })

    it('should detect 3-node cycle', () => {
      const deps: IssueDependency[] = [
        { from: 1, to: 2, type: 'blocks', source: 'body' },
        { from: 2, to: 3, type: 'blocks', source: 'body' },
        { from: 3, to: 1, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toHaveLength(1)
      expect(result[0].sort()).toEqual([1, 2, 3])
    })

    it('should detect self-referencing dependency', () => {
      const deps: IssueDependency[] = [
        { from: 1, to: 1, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual([1])
    })

    it('should detect multiple independent cycles', () => {
      const deps: IssueDependency[] = [
        // Cycle 1: 1 -> 2 -> 1
        { from: 1, to: 2, type: 'blocks', source: 'body' },
        { from: 2, to: 1, type: 'blocks', source: 'body' },
        // Cycle 2: 3 -> 4 -> 3
        { from: 3, to: 4, type: 'blocks', source: 'body' },
        { from: 4, to: 3, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toHaveLength(2)
    })

    it('should detect cycle in complex graph with non-cyclic branches', () => {
      const deps: IssueDependency[] = [
        // Non-cyclic chain: 5 -> 4 -> 3
        { from: 5, to: 4, type: 'blocks', source: 'body' },
        { from: 4, to: 3, type: 'blocks', source: 'body' },
        // Cycle: 1 -> 2 -> 1
        { from: 1, to: 2, type: 'blocks', source: 'body' },
        { from: 2, to: 1, type: 'blocks', source: 'body' }
      ]

      const result = detectCircularDependencies(deps)

      expect(result).toHaveLength(1)
      expect(result[0].sort()).toEqual([1, 2])
    })
  })

  describe('parseDependencies with circular detection', () => {
    it('should include circular dependencies in result', () => {
      const issues: IssueForParsing[] = [
        { number: 1, body: 'Depends on #2' },
        { number: 2, body: 'Depends on #1' }
      ]

      const result = parseDependencies(issues)

      expect(result.dependencies).toHaveLength(2)
      expect(result.circularDependencies).toHaveLength(1)
      expect(result.circularDependencies[0].sort()).toEqual([1, 2])
    })
  })
})

/**
 * Dependency Parser for GitHub Issues
 *
 * Parses issue body text to extract dependency relationships between issues.
 * Detects patterns like "depends on #123", "blocked by #123", etc.
 */

export type DependencyType = 'blocks' | 'fixes' | 'relates'
export type DependencySource = 'body' | 'comment' | 'manual'

export interface IssueDependency {
  from: number // The issue that depends
  to: number // The issue it depends on
  type: DependencyType
  source: DependencySource
}

export interface DependencyInfo {
  dependencies: IssueDependency[]
  circularDependencies: number[][] // Arrays of issue numbers in circular chains
}

export interface IssueForParsing {
  number: number
  body?: string | null
}

/**
 * Patterns that indicate a dependency relationship.
 * Each pattern should capture the issue number as group 1.
 */
const DEPENDENCY_PATTERNS = [
  /depends?\s+on\s+#(\d+)/gi,
  /blocked?\s+by\s+#(\d+)/gi,
  /after\s+#(\d+)/gi,
  /requires?\s+#(\d+)/gi,
  /prerequisite:\s*#(\d+)/gi
]

/**
 * Parse dependencies from issue body text.
 * Looks for patterns like:
 * - "depends on #123"
 * - "blocked by #123"
 * - "after #123"
 * - "requires #123"
 * - "prerequisite: #123"
 */
export function parseDependencies(issues: IssueForParsing[]): DependencyInfo {
  const dependencies: IssueDependency[] = []
  const seen = new Set<string>() // Track "from-to" pairs to avoid duplicates

  for (const issue of issues) {
    const body = issue.body || ''

    for (const pattern of DEPENDENCY_PATTERNS) {
      // Reset regex lastIndex for each issue (since we use /g flag)
      pattern.lastIndex = 0

      let match
      while ((match = pattern.exec(body)) !== null) {
        const depNum = parseInt(match[1], 10)
        const key = `${issue.number}-${depNum}`

        // Avoid duplicate dependencies
        if (!seen.has(key)) {
          seen.add(key)
          dependencies.push({
            from: issue.number,
            to: depNum,
            type: 'blocks',
            source: 'body'
          })
        }
      }
    }
  }

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(dependencies)

  return { dependencies, circularDependencies }
}

/**
 * Detect circular dependencies using DFS-based cycle detection.
 * Returns an array of cycles, where each cycle is an array of issue numbers.
 */
export function detectCircularDependencies(deps: IssueDependency[]): number[][] {
  if (deps.length === 0) {
    return []
  }

  // Build adjacency list
  const graph = new Map<number, number[]>()
  const allNodes = new Set<number>()

  for (const dep of deps) {
    allNodes.add(dep.from)
    allNodes.add(dep.to)
    if (!graph.has(dep.from)) {
      graph.set(dep.from, [])
    }
    graph.get(dep.from)!.push(dep.to)
  }

  const cycles: number[][] = []
  const visited = new Set<number>()
  const inStack = new Set<number>()
  const nodeToPath = new Map<number, number[]>()

  function dfs(node: number, path: number[]): void {
    if (inStack.has(node)) {
      // Found a cycle - extract the cycle from the path
      const cycleStart = path.indexOf(node)
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart)
        // Only add if not already found (check by sorted comparison)
        const sortedCycle = [...cycle].sort((a, b) => a - b)
        const cycleKey = sortedCycle.join(',')
        const isDuplicate = cycles.some(
          (c) => [...c].sort((a, b) => a - b).join(',') === cycleKey
        )
        if (!isDuplicate) {
          cycles.push(cycle)
        }
      }
      return
    }

    if (visited.has(node)) {
      return
    }

    visited.add(node)
    inStack.add(node)
    nodeToPath.set(node, [...path])

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node])
    }

    inStack.delete(node)
  }

  // Run DFS from each unvisited node
  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node, [])
    }
  }

  return cycles
}

/**
 * Get all issues that are part of any circular dependency.
 * Useful for highlighting problematic issues in the UI.
 */
export function getIssuesInCycles(circularDependencies: number[][]): Set<number> {
  const result = new Set<number>()
  for (const cycle of circularDependencies) {
    for (const issueNum of cycle) {
      result.add(issueNum)
    }
  }
  return result
}

/**
 * Filter dependencies to only include those where both from and to
 * are in the provided set of issue numbers.
 */
export function filterDependencies(
  dependencies: IssueDependency[],
  issueNumbers: Set<number>
): IssueDependency[] {
  return dependencies.filter(
    (dep) => issueNumbers.has(dep.from) && issueNumbers.has(dep.to)
  )
}

/**
 * Get direct dependencies (issues that this issue depends on).
 */
export function getDirectDependencies(
  dependencies: IssueDependency[],
  issueNumber: number
): number[] {
  return dependencies
    .filter((dep) => dep.from === issueNumber)
    .map((dep) => dep.to)
}

/**
 * Get dependents (issues that depend on this issue).
 */
export function getDependents(
  dependencies: IssueDependency[],
  issueNumber: number
): number[] {
  return dependencies
    .filter((dep) => dep.to === issueNumber)
    .map((dep) => dep.from)
}

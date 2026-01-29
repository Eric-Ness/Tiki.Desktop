import { useState, useMemo } from 'react'
import { DependencyGraph } from './DependencyGraph'
import { DependencyFilters } from './DependencyFilters'
import type { GitHubIssue, Release } from '../../stores/tiki-store'
import { parseDependencies } from '../../lib/dependency-parser'

interface DependencyViewProps {
  issues: GitHubIssue[]
  releases: Release[]
  onIssueSelect?: (issueNumber: number) => void
}

/**
 * Complete dependency visualization view with filters.
 * Combines DependencyGraph with filter controls.
 */
export function DependencyView({
  issues,
  releases,
  onIssueSelect
}: DependencyViewProps) {
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null)
  const [showOrphans, setShowOrphans] = useState(true)

  // Get issues in the selected release
  const releaseIssueNumbers = useMemo(() => {
    if (!selectedRelease) return null
    const release = releases.find((r) => r.version === selectedRelease)
    if (!release) return null
    return new Set(release.issues.map((i) => i.number))
  }, [selectedRelease, releases])

  // Filter issues based on selected release
  const filteredByRelease = useMemo(() => {
    if (!releaseIssueNumbers) return issues
    return issues.filter((issue) => releaseIssueNumbers.has(issue.number))
  }, [issues, releaseIssueNumbers])

  // Get dependency information
  const { dependencies } = useMemo(
    () => parseDependencies(filteredByRelease),
    [filteredByRelease]
  )

  // Filter out orphan issues if needed
  const filteredIssues = useMemo(() => {
    if (showOrphans) return filteredByRelease

    // Get issues that have at least one dependency connection
    const issuesWithConnections = new Set<number>()
    for (const dep of dependencies) {
      issuesWithConnections.add(dep.from)
      issuesWithConnections.add(dep.to)
    }

    return filteredByRelease.filter((issue) =>
      issuesWithConnections.has(issue.number)
    )
  }, [filteredByRelease, dependencies, showOrphans])

  return (
    <div className="h-full flex flex-col">
      {/* Filters toolbar */}
      <DependencyFilters
        releases={releases}
        selectedRelease={selectedRelease}
        onReleaseChange={setSelectedRelease}
        showOrphans={showOrphans}
        onShowOrphansChange={setShowOrphans}
        totalIssueCount={filteredIssues.length}
      />

      {/* Graph */}
      <div className="flex-1">
        <DependencyGraph
          issues={filteredIssues}
          onIssueSelect={onIssueSelect}
          releaseFilter={selectedRelease ?? undefined}
        />
      </div>
    </div>
  )
}

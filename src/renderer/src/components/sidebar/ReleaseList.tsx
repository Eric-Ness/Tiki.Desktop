import { useTikiStore, Release } from '../../stores/tiki-store'

/**
 * Parse semver version string into numeric components for proper sorting
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0
  }
}

/**
 * Compare two semantic versions (descending order - newest first)
 */
function compareVersionsDesc(a: string, b: string): number {
  const aVer = parseVersion(a)
  const bVer = parseVersion(b)

  // If either can't be parsed, fall back to string comparison
  if (!aVer || !bVer) return b.localeCompare(a)

  // Compare major.minor.patch (descending)
  if (aVer.major !== bVer.major) return bVer.major - aVer.major
  if (aVer.minor !== bVer.minor) return bVer.minor - aVer.minor
  return bVer.patch - aVer.patch
}

export function ReleaseList() {
  const releases = useTikiStore((state) => state.releases)
  const selectedRelease = useTikiStore((state) => state.selectedRelease)
  const setSelectedRelease = useTikiStore((state) => state.setSelectedRelease)
  const setSelectedNode = useTikiStore((state) => state.setSelectedNode)
  const setSelectedIssue = useTikiStore((state) => state.setSelectedIssue)
  const setSelectedKnowledge = useTikiStore((state) => state.setSelectedKnowledge)
  const setSelectedHook = useTikiStore((state) => state.setSelectedHook)
  const setSelectedCommand = useTikiStore((state) => state.setSelectedCommand)

  const handleSelectRelease = (version: string) => {
    // Clear other selections when selecting a release
    setSelectedNode(null)
    setSelectedIssue(null)
    setSelectedKnowledge(null)
    setSelectedHook(null)
    setSelectedCommand(null)
    setSelectedRelease(version)
  }

  if (releases.length === 0) {
    return (
      <div className="px-2 py-1 text-sm text-slate-500 italic">
        No releases
      </div>
    )
  }

  // Separate active/in-progress from shipped
  const activeReleases = releases.filter((r) => r.status !== 'shipped')
  // Sort shipped releases in descending order (newest first) using semantic versioning and limit to 10
  const shippedReleases = releases
    .filter((r) => r.status === 'shipped')
    .sort((a, b) => compareVersionsDesc(a.version, b.version))
    .slice(0, 10)

  return (
    <div className="space-y-2">
      {/* Active releases */}
      <div className="space-y-0.5">
        {activeReleases.map((release) => (
          <ReleaseItem
            key={release.version}
            release={release}
            isSelected={selectedRelease === release.version}
            onClick={() => handleSelectRelease(release.version)}
          />
        ))}
      </div>

      {/* Shipped releases (archive) */}
      {shippedReleases.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="px-2 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Archive
          </div>
          <div className="space-y-0.5 opacity-70">
            {shippedReleases.map((release) => (
              <ReleaseItem
                key={release.version}
                release={release}
                isSelected={selectedRelease === release.version}
                onClick={() => handleSelectRelease(release.version)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ReleaseItemProps {
  release: Release
  isSelected: boolean
  onClick: () => void
}

function ReleaseItem({ release, isSelected, onClick }: ReleaseItemProps) {
  // Calculate progress
  const completedIssues = release.issues.filter(
    (i) => i.status === 'completed' || i.status === 'shipped'
  ).length
  const totalIssues = release.issues.length
  const progress = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0

  const statusColors: Record<string, string> = {
    active: 'text-green-400',
    shipped: 'text-purple-400',
    completed: 'text-green-400',
    not_planned: 'text-slate-500'
  }

  const statusIcons: Record<string, React.ReactNode> = {
    active: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    shipped: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    completed: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    not_planned: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full px-2 py-1.5 text-left text-sm transition-colors rounded-sm mx-1 ${
        isSelected
          ? 'bg-green-500/20 text-green-200'
          : 'hover:bg-background-tertiary text-slate-300'
      } ${release.status === 'active' ? 'border-l-2 border-green-500 pl-1.5' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Status icon */}
        <span className={statusColors[release.status] || statusColors.not_planned}>
          {statusIcons[release.status] || statusIcons.not_planned}
        </span>

        {/* Version and info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{release.version}</span>
            {release.status === 'active' && (
              <span className="text-[10px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded">
                Active
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalIssues > 0 && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                <span>{completedIssues}/{totalIssues} issues</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    progress === 100 ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

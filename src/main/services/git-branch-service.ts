import { execFile as execFileCallback } from 'child_process'
import { promisify } from 'util'

const execFile = promisify(execFileCallback)

/**
 * Cache entry for a branch lookup
 */
interface BranchCacheEntry {
  branch: string
  timestamp: number
}

/**
 * Per-project cache for git branch lookups
 * Key: cwd (working directory path)
 * Value: cached branch and timestamp
 */
const branchCache = new Map<string, BranchCacheEntry>()

/**
 * Cache TTL in milliseconds (30 seconds)
 */
const CACHE_TTL_MS = 30000

/**
 * Timeout for git command in milliseconds (500ms is fast enough for rev-parse)
 */
const GIT_TIMEOUT_MS = 500

/**
 * Check if a cache entry is still valid
 */
function isCacheValid(entry: BranchCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

/**
 * Get the current git branch for a directory.
 * Uses async execFile instead of blocking execSync.
 * Results are cached per-project with a 30-second TTL.
 *
 * @param cwd - The working directory to check
 * @returns The branch name, or null if not a git repository or on error
 */
export async function getBranch(cwd: string): Promise<string | null> {
  // Check cache first
  const cached = branchCache.get(cwd)
  if (cached && isCacheValid(cached)) {
    return cached.branch
  }

  try {
    const { stdout } = await execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      timeout: GIT_TIMEOUT_MS
    })

    const branch = stdout.trim()

    // Return null for empty output
    if (!branch) {
      return null
    }

    // Cache the result
    branchCache.set(cwd, {
      branch,
      timestamp: Date.now()
    })

    return branch
  } catch {
    // Return null on any error (not a git repo, timeout, etc.)
    return null
  }
}

/**
 * Invalidate the branch cache for a specific project.
 * Useful when the branch is known to have changed (e.g., after git checkout).
 *
 * @param cwd - The working directory to invalidate
 */
export function invalidateBranchCache(cwd: string): void {
  branchCache.delete(cwd)
}

/**
 * Clear the entire branch cache.
 * Primarily used for testing.
 */
export function clearBranchCache(): void {
  branchCache.clear()
}

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
}

export interface DiffStats {
  files: FileChange[]
  totalAdditions: number
  totalDeletions: number
  totalFiles: number
}

/**
 * Get the diff for a specific file between two refs
 */
export async function getFileDiff(
  cwd: string,
  filePath: string,
  fromRef?: string,
  toRef?: string
): Promise<string> {
  const args = ['diff', '--no-color']
  if (fromRef) args.push(fromRef)
  if (toRef) args.push(toRef)
  args.push('--', filePath)

  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30000 })
    return stdout
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get diff for ${filePath}: ${message}`)
  }
}

/**
 * Get list of changed files between two refs with line count statistics
 */
export async function getChangedFiles(
  cwd: string,
  fromRef?: string,
  toRef?: string
): Promise<FileChange[]> {
  const args = ['diff', '--numstat', '--no-color']
  if (fromRef) args.push(fromRef)
  if (toRef) args.push(toRef)

  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30000 })

    if (!stdout.trim()) {
      return []
    }

    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [add, del, path] = line.split('\t')
        // Binary files show as '-' for additions/deletions
        const additions = add === '-' ? 0 : parseInt(add) || 0
        const deletions = del === '-' ? 0 : parseInt(del) || 0

        let status: FileChange['status'] = 'modified'
        if (additions > 0 && deletions === 0) {
          status = 'added'
        } else if (deletions > 0 && additions === 0) {
          status = 'deleted'
        }

        return {
          path,
          status,
          additions,
          deletions
        }
      })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get changed files: ${message}`)
  }
}

/**
 * Get aggregated diff statistics between two refs
 */
export async function getDiffStats(
  cwd: string,
  fromRef?: string,
  toRef?: string
): Promise<DiffStats> {
  const files = await getChangedFiles(cwd, fromRef, toRef)

  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0)
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0)

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length
  }
}

/**
 * Get the current HEAD commit SHA
 */
export async function getCurrentCommit(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd,
      timeout: 5000
    })
    return stdout.trim()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get current commit: ${message}`)
  }
}

/**
 * Get commits between two refs (useful for phase spans)
 */
export async function getCommitRange(
  cwd: string,
  fromRef: string,
  toRef: string
): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--format=%H', `${fromRef}..${toRef}`],
      { cwd, timeout: 10000 }
    )
    return stdout.trim().split('\n').filter(Boolean)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get commit range: ${message}`)
  }
}

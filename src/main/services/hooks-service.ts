import { execFile } from 'child_process'
import { promisify } from 'util'
import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'

const execFileAsync = promisify(execFile)

export interface Hook {
  name: string
  path: string
  type: string // pre-ship, post-ship, pre-commit, etc.
  enabled: boolean
  content?: string
}

export interface HookExecutionResult {
  hook: string
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  timestamp: string
  success: boolean
}

// In-memory execution history (last 50 runs)
const executionHistory: HookExecutionResult[] = []
const MAX_HISTORY = 50

// Hook types recognized by Tiki
const HOOK_TYPES = [
  'pre-ship',
  'post-ship',
  'pre-commit',
  'post-commit',
  'pre-execute',
  'post-execute',
  'phase-start',
  'phase-complete'
]

/**
 * Get the hooks directory for a project
 */
export function getHooksDirectory(cwd?: string): string {
  const workDir = cwd || process.cwd()
  return join(workDir, '.tiki', 'hooks')
}

/**
 * Ensure hooks directory exists
 */
export async function ensureHooksDirectory(cwd?: string): Promise<void> {
  const hooksDir = getHooksDirectory(cwd)
  if (!existsSync(hooksDir)) {
    await mkdir(hooksDir, { recursive: true })
  }
}

/**
 * Determine hook type from filename
 */
function getHookType(filename: string): string {
  const name = basename(filename).replace(/\.(sh|ps1|bash)$/, '')
  for (const type of HOOK_TYPES) {
    if (name === type || name.startsWith(`${type}-`)) {
      return type
    }
  }
  return 'custom'
}

/**
 * List all hooks in the hooks directory
 */
export async function listHooks(cwd?: string): Promise<Hook[]> {
  const hooksDir = getHooksDirectory(cwd)

  if (!existsSync(hooksDir)) {
    return []
  }

  try {
    const files = await readdir(hooksDir)
    const hooks: Hook[] = []

    for (const file of files) {
      const filePath = join(hooksDir, file)
      const fileStat = await stat(filePath)

      if (fileStat.isFile()) {
        hooks.push({
          name: file,
          path: filePath,
          type: getHookType(file),
          enabled: true // For now, all hooks are enabled
        })
      }
    }

    return hooks.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Failed to list hooks:', error)
    return []
  }
}

/**
 * Read hook content
 */
export async function readHook(name: string, cwd?: string): Promise<Hook | null> {
  const hooksDir = getHooksDirectory(cwd)
  const hookPath = join(hooksDir, name)

  if (!existsSync(hookPath)) {
    return null
  }

  try {
    const content = await readFile(hookPath, 'utf-8')
    return {
      name,
      path: hookPath,
      type: getHookType(name),
      enabled: true,
      content
    }
  } catch (error) {
    console.error(`Failed to read hook ${name}:`, error)
    return null
  }
}

/**
 * Write/update hook content
 */
export async function writeHook(name: string, content: string, cwd?: string): Promise<boolean> {
  await ensureHooksDirectory(cwd)
  const hooksDir = getHooksDirectory(cwd)
  const hookPath = join(hooksDir, name)

  try {
    await writeFile(hookPath, content, 'utf-8')
    return true
  } catch (error) {
    console.error(`Failed to write hook ${name}:`, error)
    return false
  }
}

/**
 * Delete a hook
 */
export async function deleteHook(name: string, cwd?: string): Promise<boolean> {
  const hooksDir = getHooksDirectory(cwd)
  const hookPath = join(hooksDir, name)

  if (!existsSync(hookPath)) {
    return false
  }

  try {
    await unlink(hookPath)
    return true
  } catch (error) {
    console.error(`Failed to delete hook ${name}:`, error)
    return false
  }
}

/**
 * Execute a hook manually
 */
export async function executeHook(
  name: string,
  env: Record<string, string> = {},
  cwd?: string,
  timeout = 30000
): Promise<HookExecutionResult> {
  const hooksDir = getHooksDirectory(cwd)
  const hookPath = join(hooksDir, name)
  const workDir = cwd || process.cwd()
  const startTime = Date.now()

  const result: HookExecutionResult = {
    hook: name,
    exitCode: 0,
    stdout: '',
    stderr: '',
    duration: 0,
    timestamp: new Date().toISOString(),
    success: false
  }

  if (!existsSync(hookPath)) {
    result.exitCode = 1
    result.stderr = `Hook not found: ${name}`
    result.duration = Date.now() - startTime
    addToHistory(result)
    return result
  }

  try {
    // Determine shell based on file extension and platform
    const isWindows = process.platform === 'win32'
    const isPowerShell = name.endsWith('.ps1')

    let shell: string
    let args: string[]

    if (isPowerShell && isWindows) {
      shell = 'powershell'
      args = ['-ExecutionPolicy', 'Bypass', '-File', hookPath]
    } else {
      // Use bash (Git Bash on Windows)
      shell = isWindows ? 'bash' : '/bin/bash'
      args = [hookPath]
    }

    const { stdout, stderr } = await execFileAsync(shell, args, {
      cwd: workDir,
      timeout,
      env: { ...process.env, ...env }
    })

    result.stdout = stdout
    result.stderr = stderr
    result.exitCode = 0
    result.success = true
  } catch (error: unknown) {
    const execError = error as { code?: number; stdout?: string; stderr?: string; message?: string }
    result.exitCode = execError.code || 1
    result.stdout = execError.stdout || ''
    result.stderr = execError.stderr || execError.message || 'Unknown error'
    result.success = false
  }

  result.duration = Date.now() - startTime
  addToHistory(result)
  return result
}

/**
 * Add result to execution history
 */
function addToHistory(result: HookExecutionResult): void {
  executionHistory.unshift(result)
  if (executionHistory.length > MAX_HISTORY) {
    executionHistory.pop()
  }
}

/**
 * Get execution history
 */
export function getExecutionHistory(limit = 10): HookExecutionResult[] {
  return executionHistory.slice(0, limit)
}

/**
 * Get available hook types
 */
export function getHookTypes(): string[] {
  return [...HOOK_TYPES]
}

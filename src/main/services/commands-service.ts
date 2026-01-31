import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, dirname, relative } from 'path'

export type CommandSource = 'claude' | 'tiki'

export interface Command {
  name: string // e.g., "commit" or "tiki:ship"
  path: string // Full filesystem path
  relativePath: string // e.g., ".claude/commands/tiki/ship.md"
  namespace?: string // e.g., "tiki" for namespaced commands
  source: CommandSource // Which directory the command comes from
  content?: string
}

/**
 * Get the commands directory for a project
 */
export function getCommandsDirectory(cwd?: string, source: CommandSource = 'claude'): string {
  const workDir = cwd || process.cwd()
  if (source === 'tiki') {
    return join(workDir, '.tiki', 'commands')
  }
  return join(workDir, '.claude', 'commands')
}

/**
 * Ensure commands directory exists
 */
export async function ensureCommandsDirectory(
  cwd?: string,
  source: CommandSource = 'claude'
): Promise<void> {
  const commandsDir = getCommandsDirectory(cwd, source)
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true })
  }
}

/**
 * Parse command name from path
 * .claude/commands/commit.md -> "commit"
 * .claude/commands/tiki/ship.md -> "tiki:ship"
 */
function parseCommandName(filePath: string, baseDir: string): { name: string; namespace?: string } {
  const relativePath = relative(baseDir, filePath)
  const parts = relativePath.replace(/\.md$/, '').split(/[/\\]/)

  if (parts.length === 1) {
    return { name: parts[0] }
  } else {
    const namespace = parts.slice(0, -1).join(':')
    const name = parts[parts.length - 1]
    return { name: `${namespace}:${name}`, namespace }
  }
}

/**
 * Recursively find all .md files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []

  if (!existsSync(dir)) {
    return results
  }

  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      const nested = await findMarkdownFiles(fullPath)
      results.push(...nested)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * List commands from a specific directory
 */
async function listCommandsFromDir(
  commandsDir: string,
  workDir: string,
  source: CommandSource
): Promise<Command[]> {
  if (!existsSync(commandsDir)) {
    return []
  }

  try {
    const files = await findMarkdownFiles(commandsDir)
    const commands: Command[] = []

    for (const filePath of files) {
      const { name, namespace } = parseCommandName(filePath, commandsDir)
      const relativePath = relative(workDir, filePath)

      commands.push({
        name,
        path: filePath,
        relativePath,
        namespace,
        source
      })
    }

    return commands
  } catch (error) {
    console.error(`Failed to list commands from ${source}:`, error)
    return []
  }
}

/**
 * List all commands from both .claude/commands and .tiki/commands
 */
export async function listCommands(cwd?: string): Promise<Command[]> {
  const workDir = cwd || process.cwd()
  const claudeDir = getCommandsDirectory(workDir, 'claude')
  const tikiDir = getCommandsDirectory(workDir, 'tiki')

  const [claudeCommands, tikiCommands] = await Promise.all([
    listCommandsFromDir(claudeDir, workDir, 'claude'),
    listCommandsFromDir(tikiDir, workDir, 'tiki')
  ])

  const allCommands = [...claudeCommands, ...tikiCommands]
  return allCommands.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Determine source from command name or path
 */
function determineSource(nameOrPath: string, cwd?: string): CommandSource {
  const workDir = cwd || process.cwd()

  // Check if it's a path containing .tiki
  if (nameOrPath.includes('.tiki')) {
    return 'tiki'
  }

  // Check if command exists in .tiki/commands first
  const tikiDir = getCommandsDirectory(workDir, 'tiki')
  const relativeParts = nameOrPath.split(':')
  const tikiPath = join(tikiDir, ...relativeParts) + '.md'

  if (existsSync(tikiPath)) {
    return 'tiki'
  }

  return 'claude'
}

/**
 * Read command content
 */
export async function readCommand(name: string, cwd?: string): Promise<Command | null> {
  const workDir = cwd || process.cwd()

  // Try .tiki/commands first, then .claude/commands
  for (const source of ['tiki', 'claude'] as CommandSource[]) {
    const commandsDir = getCommandsDirectory(workDir, source)
    const relativeParts = name.split(':')
    const commandPath = join(commandsDir, ...relativeParts) + '.md'

    if (existsSync(commandPath)) {
      try {
        const content = await readFile(commandPath, 'utf-8')
        const { name: parsedName, namespace } = parseCommandName(commandPath, commandsDir)

        return {
          name: parsedName,
          path: commandPath,
          relativePath: relative(workDir, commandPath),
          namespace,
          source,
          content
        }
      } catch (error) {
        console.error(`Failed to read command ${name}:`, error)
      }
    }
  }

  return null
}

/**
 * Write/update command content
 * If the command already exists, write to its current location
 * For new commands, use the specified source (defaults to 'claude')
 */
export async function writeCommand(
  name: string,
  content: string,
  cwd?: string,
  source?: CommandSource
): Promise<boolean> {
  const workDir = cwd || process.cwd()

  // If source not specified, check if command exists and use its location
  let targetSource: CommandSource = source || 'claude'
  if (!source) {
    const existing = await readCommand(name, workDir)
    if (existing) {
      targetSource = existing.source
    }
  }

  await ensureCommandsDirectory(workDir, targetSource)
  const commandsDir = getCommandsDirectory(workDir, targetSource)

  // Convert command name to path
  const relativeParts = name.split(':')
  const commandPath = join(commandsDir, ...relativeParts) + '.md'

  // Ensure parent directory exists for namespaced commands
  const parentDir = dirname(commandPath)
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true })
  }

  try {
    await writeFile(commandPath, content, 'utf-8')
    return true
  } catch (error) {
    console.error(`Failed to write command ${name}:`, error)
    return false
  }
}

/**
 * Delete a command
 */
export async function deleteCommand(name: string, cwd?: string): Promise<boolean> {
  const workDir = cwd || process.cwd()

  // Find the command first to know which directory to delete from
  for (const source of ['tiki', 'claude'] as CommandSource[]) {
    const commandsDir = getCommandsDirectory(workDir, source)
    const relativeParts = name.split(':')
    const commandPath = join(commandsDir, ...relativeParts) + '.md'

    if (existsSync(commandPath)) {
      try {
        await unlink(commandPath)
        return true
      } catch (error) {
        console.error(`Failed to delete command ${name}:`, error)
        return false
      }
    }
  }

  return false
}

/**
 * Get list of existing namespaces from both directories
 */
export async function getNamespaces(cwd?: string): Promise<string[]> {
  const workDir = cwd || process.cwd()
  const namespaces = new Set<string>()

  for (const source of ['claude', 'tiki'] as CommandSource[]) {
    const commandsDir = getCommandsDirectory(workDir, source)

    if (existsSync(commandsDir)) {
      try {
        const entries = await readdir(commandsDir, { withFileTypes: true })
        entries.filter((e) => e.isDirectory()).forEach((e) => namespaces.add(e.name))
      } catch (error) {
        console.error(`Failed to get namespaces from ${source}:`, error)
      }
    }
  }

  return Array.from(namespaces).sort()
}

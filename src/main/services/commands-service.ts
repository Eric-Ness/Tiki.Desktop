import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename, dirname, relative } from 'path'

export interface Command {
  name: string // e.g., "commit" or "tiki:ship"
  path: string // Full filesystem path
  relativePath: string // e.g., ".claude/commands/tiki/ship.md"
  namespace?: string // e.g., "tiki" for namespaced commands
  content?: string
}

/**
 * Get the commands directory for a project
 */
export function getCommandsDirectory(cwd?: string): string {
  const workDir = cwd || process.cwd()
  return join(workDir, '.claude', 'commands')
}

/**
 * Ensure commands directory exists
 */
export async function ensureCommandsDirectory(cwd?: string): Promise<void> {
  const commandsDir = getCommandsDirectory(cwd)
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
 * List all commands in the commands directory
 */
export async function listCommands(cwd?: string): Promise<Command[]> {
  const commandsDir = getCommandsDirectory(cwd)
  const workDir = cwd || process.cwd()

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
        namespace
      })
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Failed to list commands:', error)
    return []
  }
}

/**
 * Read command content
 */
export async function readCommand(name: string, cwd?: string): Promise<Command | null> {
  const commandsDir = getCommandsDirectory(cwd)
  const workDir = cwd || process.cwd()

  // Convert command name to path
  // "commit" -> "commit.md"
  // "tiki:ship" -> "tiki/ship.md"
  const relativeParts = name.split(':')
  const commandPath = join(commandsDir, ...relativeParts) + '.md'

  if (!existsSync(commandPath)) {
    return null
  }

  try {
    const content = await readFile(commandPath, 'utf-8')
    const { name: parsedName, namespace } = parseCommandName(commandPath, commandsDir)

    return {
      name: parsedName,
      path: commandPath,
      relativePath: relative(workDir, commandPath),
      namespace,
      content
    }
  } catch (error) {
    console.error(`Failed to read command ${name}:`, error)
    return null
  }
}

/**
 * Write/update command content
 */
export async function writeCommand(name: string, content: string, cwd?: string): Promise<boolean> {
  await ensureCommandsDirectory(cwd)
  const commandsDir = getCommandsDirectory(cwd)

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
  const commandsDir = getCommandsDirectory(cwd)

  // Convert command name to path
  const relativeParts = name.split(':')
  const commandPath = join(commandsDir, ...relativeParts) + '.md'

  if (!existsSync(commandPath)) {
    return false
  }

  try {
    await unlink(commandPath)
    return true
  } catch (error) {
    console.error(`Failed to delete command ${name}:`, error)
    return false
  }
}

/**
 * Get list of existing namespaces
 */
export async function getNamespaces(cwd?: string): Promise<string[]> {
  const commandsDir = getCommandsDirectory(cwd)

  if (!existsSync(commandsDir)) {
    return []
  }

  try {
    const entries = await readdir(commandsDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch (error) {
    console.error('Failed to get namespaces:', error)
    return []
  }
}

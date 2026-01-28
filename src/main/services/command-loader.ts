import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export interface TikiCommandInfo {
  name: string
  displayName: string
  description: string
  argumentHint?: string
}

/**
 * Parse YAML frontmatter from markdown to extract command metadata
 */
function parseCommandFromMarkdown(content: string): TikiCommandInfo | null {
  // Match YAML frontmatter between --- delimiters
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    return null
  }

  const frontmatter = frontmatterMatch[1]

  // Parse YAML fields (simple key: value parsing)
  const fields: Record<string, string> = {}
  const lines = frontmatter.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    fields[key] = value
  }

  // Validate required fields
  if (!fields.name) {
    return null
  }

  // Extract displayName from full name (e.g., "tiki:release-status" -> "release-status")
  const displayName = fields.name.replace('tiki:', '')

  return {
    name: fields.name,
    displayName,
    description: fields.description || '',
    argumentHint: fields['argument-hint'] || undefined
  }
}

/**
 * Load all Tiki commands from .claude/commands/tiki/*.md files
 */
export async function loadTikiCommands(cwd?: string): Promise<TikiCommandInfo[]> {
  const basePath = cwd || app.getAppPath()
  const commandsDir = join(basePath, '.claude', 'commands', 'tiki')

  try {
    const files = await readdir(commandsDir)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const commands: TikiCommandInfo[] = []

    for (const filename of mdFiles) {
      try {
        const filepath = join(commandsDir, filename)
        const content = await readFile(filepath, 'utf-8')
        const command = parseCommandFromMarkdown(content)

        if (command) {
          commands.push(command)
        }
      } catch {
        // Skip files that can't be read
        continue
      }
    }

    // Sort commands alphabetically by displayName
    commands.sort((a, b) => a.displayName.localeCompare(b.displayName))

    return commands
  } catch {
    // Directory doesn't exist or can't be read
    return []
  }
}

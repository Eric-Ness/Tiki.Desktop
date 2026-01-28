/**
 * Command Registry - Parses and manages Tiki commands from markdown files
 */

export interface TikiCommand {
  name: string
  displayName: string
  description: string
  argumentHint?: string
}

/**
 * Parse YAML frontmatter from a markdown file to extract command metadata
 */
export function parseCommandFromMarkdown(markdown: string): TikiCommand | null {
  // Match YAML frontmatter between --- delimiters
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/)
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
 * Registry for managing and searching Tiki commands
 */
export class CommandRegistry {
  private commands: Map<string, TikiCommand> = new Map()

  /**
   * Get all registered commands
   */
  getCommands(): TikiCommand[] {
    return Array.from(this.commands.values())
  }

  /**
   * Add a command to the registry (no duplicates)
   */
  addCommand(command: TikiCommand): void {
    if (!this.commands.has(command.name)) {
      this.commands.set(command.name, command)
    }
  }

  /**
   * Get a command by its full name
   */
  getByName(name: string): TikiCommand | undefined {
    return this.commands.get(name)
  }

  /**
   * Search commands by name or description (case-insensitive)
   */
  search(query: string): TikiCommand[] {
    if (!query) {
      return this.getCommands()
    }

    const lowerQuery = query.toLowerCase()
    return this.getCommands().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.displayName.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Clear all commands from the registry
   */
  clear(): void {
    this.commands.clear()
  }
}

// Singleton instance for app-wide use
export const commandRegistry = new CommandRegistry()

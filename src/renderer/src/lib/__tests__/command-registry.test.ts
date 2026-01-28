import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCommandFromMarkdown, TikiCommand, CommandRegistry } from '../command-registry'

describe('Command Registry', () => {
  describe('parseCommandFromMarkdown', () => {
    it('should parse YAML frontmatter with name, description, and argument-hint', () => {
      const markdown = `---
type: prompt
name: tiki:yolo
description: Run the full Tiki workflow
argument-hint: <issue-number>
---
# YOLO Mode

Execute the complete workflow.
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result).toEqual({
        name: 'tiki:yolo',
        displayName: 'yolo',
        description: 'Run the full Tiki workflow',
        argumentHint: '<issue-number>'
      })
    })

    it('should handle commands without argument-hint', () => {
      const markdown = `---
type: prompt
name: tiki:state
description: Show current Tiki state
---
# State
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result).toEqual({
        name: 'tiki:state',
        displayName: 'state',
        description: 'Show current Tiki state',
        argumentHint: undefined
      })
    })

    it('should handle multi-line descriptions', () => {
      const markdown = `---
type: prompt
name: tiki:add-issue
description: Create a new GitHub issue with intelligent prompting. Claude asks clarifying questions to flesh out the issue before creating it.
argument-hint: [title or description]
---
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result?.description).toBe(
        'Create a new GitHub issue with intelligent prompting. Claude asks clarifying questions to flesh out the issue before creating it.'
      )
    })

    it('should return null for invalid markdown', () => {
      const markdown = `# No frontmatter here

Just regular markdown.
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result).toBeNull()
    })

    it('should return null for missing name field', () => {
      const markdown = `---
type: prompt
description: Some description
---
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result).toBeNull()
    })

    it('should extract displayName from full name', () => {
      const markdown = `---
name: tiki:release-status
description: Show release status
---
`
      const result = parseCommandFromMarkdown(markdown)

      expect(result?.displayName).toBe('release-status')
    })
  })

  describe('CommandRegistry', () => {
    let registry: CommandRegistry

    beforeEach(() => {
      registry = new CommandRegistry()
    })

    it('should start with empty commands', () => {
      expect(registry.getCommands()).toEqual([])
    })

    it('should add a command', () => {
      const command: TikiCommand = {
        name: 'tiki:test',
        displayName: 'test',
        description: 'Test command'
      }

      registry.addCommand(command)

      expect(registry.getCommands()).toHaveLength(1)
      expect(registry.getCommands()[0]).toEqual(command)
    })

    it('should not add duplicate commands', () => {
      const command: TikiCommand = {
        name: 'tiki:test',
        displayName: 'test',
        description: 'Test command'
      }

      registry.addCommand(command)
      registry.addCommand(command)

      expect(registry.getCommands()).toHaveLength(1)
    })

    it('should search commands by name', () => {
      registry.addCommand({ name: 'tiki:yolo', displayName: 'yolo', description: 'YOLO mode' })
      registry.addCommand({ name: 'tiki:ship', displayName: 'ship', description: 'Ship issue' })
      registry.addCommand({
        name: 'tiki:release-ship',
        displayName: 'release-ship',
        description: 'Ship release'
      })

      const results = registry.search('ship')

      expect(results).toHaveLength(2)
      expect(results.map((c) => c.name)).toContain('tiki:ship')
      expect(results.map((c) => c.name)).toContain('tiki:release-ship')
    })

    it('should search commands by description', () => {
      registry.addCommand({
        name: 'tiki:get-issue',
        displayName: 'get-issue',
        description: 'Fetch GitHub issue'
      })
      registry.addCommand({ name: 'tiki:ship', displayName: 'ship', description: 'Ship to GitHub' })

      const results = registry.search('GitHub')

      expect(results).toHaveLength(2)
    })

    it('should search case-insensitively', () => {
      registry.addCommand({ name: 'tiki:YOLO', displayName: 'YOLO', description: 'Execute yolo' })

      expect(registry.search('yolo')).toHaveLength(1)
      expect(registry.search('YOLO')).toHaveLength(1)
    })

    it('should return all commands when search is empty', () => {
      registry.addCommand({ name: 'tiki:a', displayName: 'a', description: 'A' })
      registry.addCommand({ name: 'tiki:b', displayName: 'b', description: 'B' })

      expect(registry.search('')).toHaveLength(2)
    })

    it('should get command by name', () => {
      const command: TikiCommand = {
        name: 'tiki:test',
        displayName: 'test',
        description: 'Test command'
      }
      registry.addCommand(command)

      expect(registry.getByName('tiki:test')).toEqual(command)
      expect(registry.getByName('tiki:nonexistent')).toBeUndefined()
    })

    it('should clear all commands', () => {
      registry.addCommand({ name: 'tiki:a', displayName: 'a', description: 'A' })
      registry.addCommand({ name: 'tiki:b', displayName: 'b', description: 'B' })

      registry.clear()

      expect(registry.getCommands()).toEqual([])
    })

    it('should load commands from markdown content', () => {
      const markdownFiles = [
        {
          content: `---
name: tiki:yolo
description: YOLO mode
argument-hint: <N>
---`
        },
        {
          content: `---
name: tiki:ship
description: Ship it
---`
        }
      ]

      for (const file of markdownFiles) {
        const command = parseCommandFromMarkdown(file.content)
        if (command) registry.addCommand(command)
      }

      expect(registry.getCommands()).toHaveLength(2)
    })
  })
})

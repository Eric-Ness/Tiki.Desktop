import { join } from 'path'
import { readFile, writeFile, mkdir, access, constants, copyFile } from 'fs/promises'

// Tiki config schema
export interface TikiConfig {
  tdd: {
    enabled: boolean
    framework: 'vitest' | 'jest' | 'pytest' | 'mocha' | 'other'
  }
  releases: {
    requirementsEnabled: boolean
    milestoneSync: boolean
  }
  execution: {
    autoCommit: boolean
    pauseOnFailure: boolean
  }
  knowledge: {
    autoCapture: boolean
    maxEntries: number
  }
}

// Default configuration
export const defaultConfig: TikiConfig = {
  tdd: {
    enabled: true,
    framework: 'vitest'
  },
  releases: {
    requirementsEnabled: true,
    milestoneSync: true
  },
  execution: {
    autoCommit: true,
    pauseOnFailure: true
  },
  knowledge: {
    autoCapture: true,
    maxEntries: 100
  }
}

/**
 * Get the path to the config file
 */
function getConfigPath(projectPath: string): string {
  return join(projectPath, '.tiki', 'config.json')
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Read the Tiki config from a project
 */
export async function readConfig(projectPath: string): Promise<{
  config: TikiConfig
  exists: boolean
  error?: string
}> {
  const configPath = getConfigPath(projectPath)

  try {
    const exists = await fileExists(configPath)
    if (!exists) {
      return { config: { ...defaultConfig }, exists: false }
    }

    const content = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content) as Partial<TikiConfig>

    // Merge with defaults to ensure all fields exist
    const config: TikiConfig = {
      tdd: { ...defaultConfig.tdd, ...parsed.tdd },
      releases: { ...defaultConfig.releases, ...parsed.releases },
      execution: { ...defaultConfig.execution, ...parsed.execution },
      knowledge: { ...defaultConfig.knowledge, ...parsed.knowledge }
    }

    return { config, exists: true }
  } catch (err) {
    return {
      config: { ...defaultConfig },
      exists: false,
      error: `Failed to read config: ${err}`
    }
  }
}

/**
 * Write the Tiki config to a project
 */
export async function writeConfig(
  projectPath: string,
  config: TikiConfig
): Promise<{ success: boolean; error?: string }> {
  const configPath = getConfigPath(projectPath)
  const tikiDir = join(projectPath, '.tiki')

  try {
    // Ensure .tiki directory exists
    const dirExists = await fileExists(tikiDir)
    if (!dirExists) {
      await mkdir(tikiDir, { recursive: true })
    }

    // Backup existing config if it exists
    const exists = await fileExists(configPath)
    if (exists) {
      const backupPath = configPath + '.backup'
      await copyFile(configPath, backupPath)
    }

    // Write the config
    const content = JSON.stringify(config, null, 2)
    await writeFile(configPath, content, 'utf-8')

    return { success: true }
  } catch (err) {
    return { success: false, error: `Failed to write config: ${err}` }
  }
}

/**
 * Validate a config object
 */
export function validateConfig(config: unknown): {
  valid: boolean
  errors: string[]
  config?: TikiConfig
} {
  const errors: string[] = []

  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['Config must be an object'] }
  }

  const c = config as Partial<TikiConfig>

  // Validate tdd
  if (c.tdd) {
    if (typeof c.tdd.enabled !== 'boolean' && c.tdd.enabled !== undefined) {
      errors.push('tdd.enabled must be a boolean')
    }
    const validFrameworks = ['vitest', 'jest', 'pytest', 'mocha', 'other']
    if (c.tdd.framework && !validFrameworks.includes(c.tdd.framework)) {
      errors.push(`tdd.framework must be one of: ${validFrameworks.join(', ')}`)
    }
  }

  // Validate releases
  if (c.releases) {
    if (typeof c.releases.requirementsEnabled !== 'boolean' && c.releases.requirementsEnabled !== undefined) {
      errors.push('releases.requirementsEnabled must be a boolean')
    }
    if (typeof c.releases.milestoneSync !== 'boolean' && c.releases.milestoneSync !== undefined) {
      errors.push('releases.milestoneSync must be a boolean')
    }
  }

  // Validate execution
  if (c.execution) {
    if (typeof c.execution.autoCommit !== 'boolean' && c.execution.autoCommit !== undefined) {
      errors.push('execution.autoCommit must be a boolean')
    }
    if (typeof c.execution.pauseOnFailure !== 'boolean' && c.execution.pauseOnFailure !== undefined) {
      errors.push('execution.pauseOnFailure must be a boolean')
    }
  }

  // Validate knowledge
  if (c.knowledge) {
    if (typeof c.knowledge.autoCapture !== 'boolean' && c.knowledge.autoCapture !== undefined) {
      errors.push('knowledge.autoCapture must be a boolean')
    }
    if (c.knowledge.maxEntries !== undefined) {
      if (typeof c.knowledge.maxEntries !== 'number') {
        errors.push('knowledge.maxEntries must be a number')
      } else if (c.knowledge.maxEntries < 1 || c.knowledge.maxEntries > 1000) {
        errors.push('knowledge.maxEntries must be between 1 and 1000')
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Build validated config with defaults
  const validatedConfig: TikiConfig = {
    tdd: { ...defaultConfig.tdd, ...c.tdd },
    releases: { ...defaultConfig.releases, ...c.releases },
    execution: { ...defaultConfig.execution, ...c.execution },
    knowledge: { ...defaultConfig.knowledge, ...c.knowledge }
  }

  return { valid: true, errors: [], config: validatedConfig }
}

/**
 * Reset config to defaults
 */
export async function resetConfig(projectPath: string): Promise<{
  success: boolean
  config: TikiConfig
  error?: string
}> {
  const result = await writeConfig(projectPath, defaultConfig)
  if (!result.success) {
    return { success: false, config: defaultConfig, error: result.error }
  }
  return { success: true, config: defaultConfig }
}

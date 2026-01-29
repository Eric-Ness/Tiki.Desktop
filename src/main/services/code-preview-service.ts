/**
 * CodePreviewService - Read file contents for code preview functionality
 *
 * Provides file reading with language detection and large file truncation.
 */
import { readFile as fsReadFile, stat } from 'fs/promises'
import { join, extname } from 'path'

/**
 * Maximum file size to read (100KB)
 */
export const MAX_FILE_SIZE = 100 * 1024

/**
 * File content with metadata for preview display
 */
export interface FileContent {
  /** The file content (potentially truncated) */
  content: string
  /** Detected programming language for syntax highlighting */
  language: string
  /** Number of lines in the content */
  lineCount: number
  /** Whether the content was truncated due to size */
  isTruncated: boolean
  /** Original file size in bytes */
  originalSize: number
}

/**
 * Map of file extensions to language names for syntax highlighting
 */
const LANGUAGE_MAP: Record<string, string> = {
  // TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // JavaScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web
  '.json': 'json',
  '.css': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.less': 'css',
  '.html': 'html',
  '.htm': 'html',

  // Markup/Config
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.toml': 'toml',

  // Systems languages
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',

  // JVM languages
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.groovy': 'groovy',

  // Shell
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',

  // Other languages
  '.sql': 'sql',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.r': 'r',
  '.lua': 'lua',
  '.perl': 'perl',
  '.pl': 'perl'
}

/**
 * Get the programming language name from a file path
 *
 * @param filePath - Path to the file
 * @returns Language name for syntax highlighting
 */
export function getLanguageFromPath(filePath: string): string {
  // Normalize path separators and get extension
  const normalizedPath = filePath.replace(/\\/g, '/')
  const ext = extname(normalizedPath).toLowerCase()

  if (!ext) {
    return 'plaintext'
  }

  return LANGUAGE_MAP[ext] || 'plaintext'
}

/**
 * Count the number of lines in a string
 *
 * @param content - The string content
 * @returns Number of lines
 */
function countLines(content: string): number {
  if (content.length === 0) {
    return 0
  }

  // Normalize line endings and count
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Remove trailing newline before counting
  const trimmed = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized

  if (trimmed.length === 0) {
    return 0
  }

  return trimmed.split('\n').length
}

/**
 * Read file content with language detection and truncation support
 *
 * @param cwd - Working directory
 * @param filePath - Relative path to the file
 * @returns FileContent object with content and metadata
 * @throws Error if file not found or permission denied
 */
export async function readFile(cwd: string, filePath: string): Promise<FileContent> {
  const fullPath = join(cwd, filePath)

  try {
    // Get file stats to check size
    const stats = await stat(fullPath)
    const originalSize = stats.size
    const isTruncated = originalSize > MAX_FILE_SIZE

    // Read file content
    let content = await fsReadFile(fullPath, 'utf-8')

    // Truncate if necessary
    if (isTruncated) {
      content = content.slice(0, MAX_FILE_SIZE)
    }

    // Detect language from file extension
    const language = getLanguageFromPath(filePath)

    // Count lines
    const lineCount = countLines(content)

    return {
      content,
      language,
      lineCount,
      isTruncated,
      originalSize
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code === 'ENOENT') {
        throw new Error(`File not found: ${fullPath}`)
      }
      if (nodeError.code === 'EACCES') {
        throw new Error(`Permission denied: ${fullPath}`)
      }
    }
    throw error
  }
}

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process before importing the module
vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

// Mock util.promisify to return our mock
vi.mock('util', () => ({
  promisify: (fn: unknown) => fn
}))

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}))

import { execFile } from 'child_process'
import { promises as fs } from 'fs'

const mockExecFile = vi.mocked(execFile)
const mockReadFile = vi.mocked(fs.readFile)

describe('git-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getFileModificationHistory', () => {
    it('should return file modification counts sorted by frequency', async () => {
      // Mock git rev-parse to indicate it's a git repo
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        // Mock git log output
        return Promise.resolve({
          stdout: `abc123|2024-01-15 10:00:00 +0000
src/main/index.ts
src/utils/helper.ts

def456|2024-01-14 09:00:00 +0000
src/main/index.ts

ghi789|2024-01-13 08:00:00 +0000
src/main/index.ts
src/components/App.tsx
`,
          stderr: ''
        } as never)
      })

      const { getFileModificationHistory } = await import('../git-analyzer')
      const result = await getFileModificationHistory('/test/repo', '30days')

      expect(result).toHaveLength(3)
      // src/main/index.ts should be first (3 modifications)
      expect(result[0]).toEqual({
        path: 'src/main/index.ts',
        count: 3,
        lastModified: '2024-01-15 10:00:00 +0000'
      })
      // src/utils/helper.ts and src/components/App.tsx have 1 each
      expect(result.find((f) => f.path === 'src/utils/helper.ts')?.count).toBe(1)
      expect(result.find((f) => f.path === 'src/components/App.tsx')?.count).toBe(1)
    })

    it('should return empty array when not a git repo', async () => {
      mockExecFile.mockRejectedValue(new Error('not a git repository'))

      const { getFileModificationHistory } = await import('../git-analyzer')
      const result = await getFileModificationHistory('/not/a/repo', '7days')

      expect(result).toEqual([])
    })

    it('should return empty array when no commits in period', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getFileModificationHistory } = await import('../git-analyzer')
      const result = await getFileModificationHistory('/test/repo', '7days')

      expect(result).toEqual([])
    })

    it('should handle all time period (no date filter)', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        // Verify no --since flag for 'all' period
        expect(argArray).not.toContain('--since')
        return Promise.resolve({
          stdout: `abc123|2024-01-15 10:00:00 +0000
src/file.ts
`,
          stderr: ''
        } as never)
      })

      const { getFileModificationHistory } = await import('../git-analyzer')
      await getFileModificationHistory('/test/repo', 'all')
    })

    it('should use correct since filter for 7 days period', async () => {
      let capturedArgs: string[] = []
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        capturedArgs = argArray
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getFileModificationHistory } = await import('../git-analyzer')
      await getFileModificationHistory('/test/repo', '7days')

      expect(capturedArgs).toContain('--since')
      expect(capturedArgs).toContain('7 days ago')
    })

    it('should use correct since filter for 90 days period', async () => {
      let capturedArgs: string[] = []
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        capturedArgs = argArray
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getFileModificationHistory } = await import('../git-analyzer')
      await getFileModificationHistory('/test/repo', '90days')

      expect(capturedArgs).toContain('--since')
      expect(capturedArgs).toContain('90 days ago')
    })
  })

  describe('getBugRelatedCommits', () => {
    it('should find bug-related commits by keywords', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        // Return results for 'fix' pattern
        if (argArray.includes('fix')) {
          return Promise.resolve({
            stdout: `abc123|fix: resolve login issue|2024-01-15 10:00:00 +0000
src/auth/login.ts
src/utils/validation.ts

def456|fix: memory leak in worker|2024-01-14 09:00:00 +0000
src/worker/thread.ts
`,
            stderr: ''
          } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getBugRelatedCommits } = await import('../git-analyzer')
      const result = await getBugRelatedCommits('/test/repo', '30days')

      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0].hash).toBe('abc123')
      expect(result[0].message).toBe('fix: resolve login issue')
      expect(result[0].files).toContain('src/auth/login.ts')
      expect(result[0].files).toContain('src/utils/validation.ts')
    })

    it('should return empty array when not a git repo', async () => {
      mockExecFile.mockRejectedValue(new Error('not a git repository'))

      const { getBugRelatedCommits } = await import('../git-analyzer')
      const result = await getBugRelatedCommits('/not/a/repo', '7days')

      expect(result).toEqual([])
    })

    it('should deduplicate commits matching multiple patterns', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        // Same commit matches both 'fix' and 'bug' patterns
        if (argArray.includes('fix') || argArray.includes('bug')) {
          return Promise.resolve({
            stdout: `abc123|fix bug in parser|2024-01-15 10:00:00 +0000
src/parser.ts
`,
            stderr: ''
          } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getBugRelatedCommits } = await import('../git-analyzer')
      const result = await getBugRelatedCommits('/test/repo', '30days')

      // Should only have one commit, not duplicates
      const uniqueHashes = new Set(result.map((c) => c.hash))
      expect(uniqueHashes.size).toBe(result.length)
    })

    it('should sort commits by date (newest first)', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        if (argArray.includes('fix')) {
          return Promise.resolve({
            stdout: `older123|fix: old bug|2024-01-10 10:00:00 +0000
src/old.ts

newer456|fix: new bug|2024-01-15 10:00:00 +0000
src/new.ts
`,
            stderr: ''
          } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getBugRelatedCommits } = await import('../git-analyzer')
      const result = await getBugRelatedCommits('/test/repo', '30days')

      if (result.length >= 2) {
        const date1 = new Date(result[0].date).getTime()
        const date2 = new Date(result[1].date).getTime()
        expect(date1).toBeGreaterThanOrEqual(date2)
      }
    })

    it('should handle empty repository', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getBugRelatedCommits } = await import('../git-analyzer')
      const result = await getBugRelatedCommits('/test/repo', '30days')

      expect(result).toEqual([])
    })
  })

  describe('getFileLastModified', () => {
    it('should return the last modification date for a file', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        return Promise.resolve({
          stdout: '2024-01-15 10:30:00 +0000\n',
          stderr: ''
        } as never)
      })

      const { getFileLastModified } = await import('../git-analyzer')
      const result = await getFileLastModified('/test/repo', 'src/index.ts')

      expect(result).toBe('2024-01-15 10:30:00 +0000')
    })

    it('should return null for non-existent file', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { getFileLastModified } = await import('../git-analyzer')
      const result = await getFileLastModified('/test/repo', 'nonexistent.ts')

      expect(result).toBeNull()
    })

    it('should return null when not a git repo', async () => {
      mockExecFile.mockRejectedValue(new Error('not a git repository'))

      const { getFileLastModified } = await import('../git-analyzer')
      const result = await getFileLastModified('/not/a/repo', 'file.ts')

      expect(result).toBeNull()
    })

    it('should handle git command failure gracefully', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        return Promise.reject(new Error('git error'))
      })

      const { getFileLastModified } = await import('../git-analyzer')
      const result = await getFileLastModified('/test/repo', 'src/index.ts')

      expect(result).toBeNull()
    })
  })

  describe('countLinesOfCode', () => {
    it('should count non-empty lines in a file', async () => {
      mockReadFile.mockResolvedValue(`
import { foo } from 'bar'

function main() {
  console.log('hello')
}

export default main
` as never)

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/file.ts')

      // Should count: import, function, console.log, }, export = 5 non-empty lines
      expect(result).toBe(5)
    })

    it('should return 0 for empty file', async () => {
      mockReadFile.mockResolvedValue('' as never)

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/empty.ts')

      expect(result).toBe(0)
    })

    it('should return 0 for file with only whitespace', async () => {
      mockReadFile.mockResolvedValue('   \n\n   \n\t\t\n' as never)

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/whitespace.ts')

      expect(result).toBe(0)
    })

    it('should return 0 for binary files (read error)', async () => {
      mockReadFile.mockRejectedValue(new Error('encoding error'))

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/image.png')

      expect(result).toBe(0)
    })

    it('should return 0 for non-existent file', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'))

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/nonexistent.ts')

      expect(result).toBe(0)
    })

    it('should handle file with mixed content correctly', async () => {
      mockReadFile.mockResolvedValue(`// Comment
const x = 1

const y = 2
// Another comment

` as never)

      const { countLinesOfCode } = await import('../git-analyzer')
      const result = await countLinesOfCode('/test/mixed.ts')

      // 4 non-empty lines: comment, const x, const y, comment
      expect(result).toBe(4)
    })
  })

  describe('analyzeGitHistory', () => {
    it('should return complete git analysis', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        if (argArray[0] === 'log') {
          if (argArray.includes('--grep')) {
            // Bug commits query
            return Promise.resolve({
              stdout: `abc123|fix: bug|2024-01-15 10:00:00 +0000
src/bug.ts
`,
              stderr: ''
            } as never)
          }
          // File modifications query
          return Promise.resolve({
            stdout: `def456|2024-01-15 10:00:00 +0000
src/file.ts
`,
            stderr: ''
          } as never)
        }
        if (argArray[0] === 'rev-list') {
          return Promise.resolve({ stdout: '42', stderr: '' } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const { analyzeGitHistory } = await import('../git-analyzer')
      const result = await analyzeGitHistory('/test/repo', '30days')

      expect(result.period).toBe('30days')
      expect(result.analyzedAt).toBeDefined()
      expect(result.totalCommits).toBe(42)
      expect(Array.isArray(result.modifications)).toBe(true)
      expect(Array.isArray(result.bugCommits)).toBe(true)
    })

    it('should handle non-git directory gracefully', async () => {
      mockExecFile.mockRejectedValue(new Error('not a git repository'))

      const { analyzeGitHistory } = await import('../git-analyzer')
      const result = await analyzeGitHistory('/not/a/repo', '7days')

      expect(result.modifications).toEqual([])
      expect(result.bugCommits).toEqual([])
      expect(result.totalCommits).toBe(0)
      expect(result.period).toBe('7days')
    })

    it('should set analyzedAt to current timestamp', async () => {
      mockExecFile.mockImplementation((cmd: unknown, args: unknown) => {
        const argArray = args as string[]
        if (argArray[0] === 'rev-parse') {
          return Promise.resolve({ stdout: '.git', stderr: '' } as never)
        }
        if (argArray[0] === 'rev-list') {
          return Promise.resolve({ stdout: '0', stderr: '' } as never)
        }
        return Promise.resolve({ stdout: '', stderr: '' } as never)
      })

      const beforeTime = new Date().toISOString()
      const { analyzeGitHistory } = await import('../git-analyzer')
      const result = await analyzeGitHistory('/test/repo', 'all')
      const afterTime = new Date().toISOString()

      expect(result.analyzedAt >= beforeTime).toBe(true)
      expect(result.analyzedAt <= afterTime).toBe(true)
    })
  })
})

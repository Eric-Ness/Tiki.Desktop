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

import { execFile } from 'child_process'

const mockExecFile = vi.mocked(execFile)

describe('git-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getChangedFiles', () => {
    it('should parse git diff --numstat output correctly', async () => {
      const numstatOutput = '10\t5\tsrc/main/index.ts\n3\t0\tsrc/new-file.ts\n0\t20\tsrc/deleted.ts\n'

      mockExecFile.mockResolvedValue({ stdout: numstatOutput, stderr: '' } as never)

      const { getChangedFiles } = await import('../git-service')
      const result = await getChangedFiles('/test/cwd')

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        path: 'src/main/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 5
      })
      expect(result[1]).toEqual({
        path: 'src/new-file.ts',
        status: 'added',
        additions: 3,
        deletions: 0
      })
      expect(result[2]).toEqual({
        path: 'src/deleted.ts',
        status: 'deleted',
        additions: 0,
        deletions: 20
      })
    })

    it('should handle empty diff output', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { getChangedFiles } = await import('../git-service')
      const result = await getChangedFiles('/test/cwd')

      expect(result).toHaveLength(0)
    })

    it('should pass fromRef and toRef to git command', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { getChangedFiles } = await import('../git-service')
      await getChangedFiles('/test/cwd', 'HEAD~3', 'HEAD')

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['diff', '--numstat', '--no-color', 'HEAD~3', 'HEAD'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should handle git error', async () => {
      mockExecFile.mockRejectedValue(new Error('git error'))

      const { getChangedFiles } = await import('../git-service')
      await expect(getChangedFiles('/test/cwd')).rejects.toThrow('Failed to get changed files')
    })

    it('should handle binary files with - - markers', async () => {
      const numstatOutput = '-\t-\timage.png\n5\t3\tsrc/code.ts\n'

      mockExecFile.mockResolvedValue({ stdout: numstatOutput, stderr: '' } as never)

      const { getChangedFiles } = await import('../git-service')
      const result = await getChangedFiles('/test/cwd')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        path: 'image.png',
        status: 'modified',
        additions: 0,
        deletions: 0
      })
    })
  })

  describe('getFileDiff', () => {
    it('should return diff output for a file', async () => {
      const diffOutput = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,6 @@
 import { app } from 'electron'
+import { newImport } from './new'

 function main() {
   console.log('hello')
+  console.log('new line')
 }
`

      mockExecFile.mockResolvedValue({ stdout: diffOutput, stderr: '' } as never)

      const { getFileDiff } = await import('../git-service')
      const result = await getFileDiff('/test/cwd', 'src/index.ts')

      expect(result).toBe(diffOutput)
    })

    it('should pass refs to git diff command', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { getFileDiff } = await import('../git-service')
      await getFileDiff('/test/cwd', 'src/index.ts', 'abc123', 'def456')

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['diff', '--no-color', 'abc123', 'def456', '--', 'src/index.ts'],
        expect.objectContaining({ cwd: '/test/cwd' })
      )
    })

    it('should handle non-existent file', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' } as never)

      const { getFileDiff } = await import('../git-service')
      const result = await getFileDiff('/test/cwd', 'nonexistent.ts')

      expect(result).toBe('')
    })
  })

  describe('getDiffStats', () => {
    it('should return aggregated diff statistics', async () => {
      const numstatOutput = '10\t5\tsrc/main/index.ts\n3\t0\tsrc/new-file.ts\n0\t20\tsrc/deleted.ts\n'

      mockExecFile.mockResolvedValue({ stdout: numstatOutput, stderr: '' } as never)

      const { getDiffStats } = await import('../git-service')
      const result = await getDiffStats('/test/cwd')

      expect(result).toEqual({
        files: expect.any(Array),
        totalAdditions: 13,
        totalDeletions: 25,
        totalFiles: 3
      })
    })

    it('should handle refs for commit range', async () => {
      mockExecFile.mockResolvedValue({ stdout: '5\t2\tfile.ts\n', stderr: '' } as never)

      const { getDiffStats } = await import('../git-service')
      const result = await getDiffStats('/test/cwd', 'commit1', 'commit2')

      expect(result).toEqual({
        files: [{ path: 'file.ts', status: 'modified', additions: 5, deletions: 2 }],
        totalAdditions: 5,
        totalDeletions: 2,
        totalFiles: 1
      })
    })
  })
})

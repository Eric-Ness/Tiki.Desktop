/**
 * Tests for CodePreviewService
 *
 * TDD: Tests written first, then implementation
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'path'

// Mock fs/promises before importing the module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn()
}))

import { readFile, stat } from 'fs/promises'

const mockReadFile = vi.mocked(readFile)
const mockStat = vi.mocked(stat)

describe('CodePreviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('FileContent interface', () => {
    it('should have all required properties', async () => {
      const testContent = 'const x = 1;'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'src/index.ts')

      // Check all required properties
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('language')
      expect(result).toHaveProperty('lineCount')
      expect(result).toHaveProperty('isTruncated')
      expect(result).toHaveProperty('originalSize')

      // Validate types
      expect(typeof result.content).toBe('string')
      expect(typeof result.language).toBe('string')
      expect(typeof result.lineCount).toBe('number')
      expect(typeof result.isTruncated).toBe('boolean')
      expect(typeof result.originalSize).toBe('number')
    })
  })

  describe('readFile', () => {
    it('should read file content and return FileContent object', async () => {
      const testContent = 'const x = 1;\nconst y = 2;'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'src/index.ts')

      expect(result.content).toBe(testContent)
      expect(result.lineCount).toBe(2)
      expect(result.isTruncated).toBe(false)
      expect(result.originalSize).toBe(testContent.length)
    })

    it('should resolve relative paths against cwd', async () => {
      const testContent = 'export default {};'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      await readFilePreview('/test/project', 'src/utils/helper.ts')

      expect(mockReadFile).toHaveBeenCalledWith(
        join('/test/project', 'src/utils/helper.ts'),
        'utf-8'
      )
    })

    it('should detect language from file extension', async () => {
      const testContent = 'const x = 1;'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'src/index.ts')

      expect(result.language).toBe('typescript')
    })

    it('should count lines correctly', async () => {
      const testContent = 'line1\nline2\nline3\nline4'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'test.txt')

      expect(result.lineCount).toBe(4)
    })

    it('should count single line without newline', async () => {
      const testContent = 'single line'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'test.txt')

      expect(result.lineCount).toBe(1)
    })

    it('should handle empty file', async () => {
      mockStat.mockResolvedValue({ size: 0 } as never)
      mockReadFile.mockResolvedValue('')

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'empty.ts')

      expect(result.content).toBe('')
      expect(result.lineCount).toBe(0)
      expect(result.isTruncated).toBe(false)
      expect(result.originalSize).toBe(0)
    })

    it('should throw error for file not found', async () => {
      const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      mockStat.mockRejectedValue(error)

      const { readFile: readFilePreview } = await import('../code-preview-service')

      await expect(readFilePreview('/test/project', 'nonexistent.ts')).rejects.toThrow(
        'File not found'
      )
    })

    it('should throw error for permission denied', async () => {
      const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException
      error.code = 'EACCES'
      mockStat.mockRejectedValue(error)

      const { readFile: readFilePreview } = await import('../code-preview-service')

      await expect(readFilePreview('/test/project', 'secret.ts')).rejects.toThrow(
        'Permission denied'
      )
    })

    it('should re-throw unexpected errors', async () => {
      const error = new Error('Unexpected disk error')
      mockStat.mockRejectedValue(error)

      const { readFile: readFilePreview } = await import('../code-preview-service')

      await expect(readFilePreview('/test/project', 'file.ts')).rejects.toThrow(
        'Unexpected disk error'
      )
    })
  })

  describe('large file truncation', () => {
    it('should truncate files larger than 100KB', async () => {
      const largeSize = 150 * 1024 // 150KB
      const fullContent = 'x'.repeat(largeSize)

      mockStat.mockResolvedValue({ size: largeSize } as never)
      mockReadFile.mockResolvedValue(fullContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'large.ts')

      expect(result.isTruncated).toBe(true)
      expect(result.originalSize).toBe(largeSize)
      expect(result.content.length).toBeLessThanOrEqual(100 * 1024)
    })

    it('should not truncate files at exactly 100KB', async () => {
      const exactSize = 100 * 1024 // 100KB
      const content = 'x'.repeat(exactSize)

      mockStat.mockResolvedValue({ size: exactSize } as never)
      mockReadFile.mockResolvedValue(content)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'exact.ts')

      expect(result.isTruncated).toBe(false)
      expect(result.originalSize).toBe(exactSize)
    })

    it('should not truncate files smaller than 100KB', async () => {
      const smallSize = 50 * 1024 // 50KB
      const content = 'x'.repeat(smallSize)

      mockStat.mockResolvedValue({ size: smallSize } as never)
      mockReadFile.mockResolvedValue(content)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'small.ts')

      expect(result.isTruncated).toBe(false)
      expect(result.content.length).toBe(smallSize)
    })

    it('should read only first 100KB for large files', async () => {
      const largeSize = 200 * 1024 // 200KB
      const fullContent = 'x'.repeat(largeSize)

      mockStat.mockResolvedValue({ size: largeSize } as never)
      mockReadFile.mockResolvedValue(fullContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'huge.ts')

      // Should read file and truncate the content
      expect(mockReadFile).toHaveBeenCalled()
      expect(result.isTruncated).toBe(true)
      expect(result.content.length).toBeLessThanOrEqual(100 * 1024)
    })
  })

  describe('getLanguageFromPath', () => {
    let getLanguageFromPath: (path: string) => string

    beforeEach(async () => {
      const module = await import('../code-preview-service')
      getLanguageFromPath = module.getLanguageFromPath
    })

    it('should map .ts to typescript', () => {
      expect(getLanguageFromPath('src/index.ts')).toBe('typescript')
    })

    it('should map .tsx to typescript', () => {
      expect(getLanguageFromPath('src/Component.tsx')).toBe('typescript')
    })

    it('should map .js to javascript', () => {
      expect(getLanguageFromPath('src/index.js')).toBe('javascript')
    })

    it('should map .jsx to javascript', () => {
      expect(getLanguageFromPath('src/Component.jsx')).toBe('javascript')
    })

    it('should map .json to json', () => {
      expect(getLanguageFromPath('package.json')).toBe('json')
    })

    it('should map .css to css', () => {
      expect(getLanguageFromPath('styles/main.css')).toBe('css')
    })

    it('should map .scss to css', () => {
      expect(getLanguageFromPath('styles/main.scss')).toBe('css')
    })

    it('should map .html to html', () => {
      expect(getLanguageFromPath('public/index.html')).toBe('html')
    })

    it('should map .md to markdown', () => {
      expect(getLanguageFromPath('README.md')).toBe('markdown')
    })

    it('should map .py to python', () => {
      expect(getLanguageFromPath('scripts/build.py')).toBe('python')
    })

    it('should map .go to go', () => {
      expect(getLanguageFromPath('cmd/main.go')).toBe('go')
    })

    it('should map .rs to rust', () => {
      expect(getLanguageFromPath('src/main.rs')).toBe('rust')
    })

    it('should map .sh to bash', () => {
      expect(getLanguageFromPath('scripts/deploy.sh')).toBe('bash')
    })

    it('should map .bash to bash', () => {
      expect(getLanguageFromPath('scripts/setup.bash')).toBe('bash')
    })

    it('should return plaintext for unknown extensions', () => {
      expect(getLanguageFromPath('file.xyz')).toBe('plaintext')
    })

    it('should return plaintext for files without extension', () => {
      expect(getLanguageFromPath('Makefile')).toBe('plaintext')
    })

    it('should be case-insensitive for extensions', () => {
      expect(getLanguageFromPath('script.TS')).toBe('typescript')
      expect(getLanguageFromPath('script.TSX')).toBe('typescript')
      expect(getLanguageFromPath('script.JS')).toBe('javascript')
      expect(getLanguageFromPath('README.MD')).toBe('markdown')
    })

    it('should handle paths with multiple dots', () => {
      expect(getLanguageFromPath('component.test.ts')).toBe('typescript')
      expect(getLanguageFromPath('config.local.json')).toBe('json')
    })

    it('should handle paths with directories', () => {
      expect(getLanguageFromPath('/some/deep/path/to/file.ts')).toBe('typescript')
      expect(getLanguageFromPath('src/components/Button/index.tsx')).toBe('typescript')
    })
  })

  describe('additional language mappings', () => {
    let getLanguageFromPath: (path: string) => string

    beforeEach(async () => {
      const module = await import('../code-preview-service')
      getLanguageFromPath = module.getLanguageFromPath
    })

    it('should map .yaml and .yml to yaml', () => {
      expect(getLanguageFromPath('config.yaml')).toBe('yaml')
      expect(getLanguageFromPath('config.yml')).toBe('yaml')
    })

    it('should map .xml to xml', () => {
      expect(getLanguageFromPath('pom.xml')).toBe('xml')
    })

    it('should map .java to java', () => {
      expect(getLanguageFromPath('Main.java')).toBe('java')
    })

    it('should map .c and .h to c', () => {
      expect(getLanguageFromPath('main.c')).toBe('c')
      expect(getLanguageFromPath('header.h')).toBe('c')
    })

    it('should map .cpp, .cc, .hpp to cpp', () => {
      expect(getLanguageFromPath('main.cpp')).toBe('cpp')
      expect(getLanguageFromPath('main.cc')).toBe('cpp')
      expect(getLanguageFromPath('header.hpp')).toBe('cpp')
    })

    it('should map .sql to sql', () => {
      expect(getLanguageFromPath('query.sql')).toBe('sql')
    })

    it('should map .rb to ruby', () => {
      expect(getLanguageFromPath('script.rb')).toBe('ruby')
    })

    it('should map .php to php', () => {
      expect(getLanguageFromPath('index.php')).toBe('php')
    })

    it('should map .swift to swift', () => {
      expect(getLanguageFromPath('App.swift')).toBe('swift')
    })

    it('should map .kt to kotlin', () => {
      expect(getLanguageFromPath('Main.kt')).toBe('kotlin')
    })
  })

  describe('edge cases', () => {
    it('should handle Windows-style paths', async () => {
      const testContent = 'const x = 1;'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('C:\\Users\\test\\project', 'src\\index.ts')

      expect(result.language).toBe('typescript')
    })

    it('should handle absolute paths when cwd is empty', async () => {
      const testContent = 'const x = 1;'
      const absolutePath = 'C:\\Users\\test\\project\\src\\index.ts'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('', absolutePath)

      // Should use absolute path directly
      expect(mockReadFile).toHaveBeenCalledWith(absolutePath, 'utf-8')
      expect(result.content).toBe(testContent)
      expect(result.language).toBe('typescript')
    })

    it('should handle absolute POSIX paths when cwd is empty', async () => {
      const testContent = 'export default {}'
      const absolutePath = '/Users/test/project/src/index.ts'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('', absolutePath)

      // Should use absolute path directly without modification
      expect(mockReadFile).toHaveBeenCalledWith(absolutePath, 'utf-8')
      expect(result.content).toBe(testContent)
    })

    it('should use cwd when filePath is relative', async () => {
      const testContent = 'hello'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      await readFilePreview('/test/project', 'src/file.ts')

      // Should join cwd and relative path
      expect(mockReadFile).toHaveBeenCalledWith(
        join('/test/project', 'src/file.ts'),
        'utf-8'
      )
    })

    it('should handle files with CRLF line endings', async () => {
      const testContent = 'line1\r\nline2\r\nline3'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'test.ts')

      // Should count lines correctly with CRLF
      expect(result.lineCount).toBe(3)
    })

    it('should handle file with trailing newline', async () => {
      const testContent = 'line1\nline2\n'
      mockStat.mockResolvedValue({ size: testContent.length } as never)
      mockReadFile.mockResolvedValue(testContent)

      const { readFile: readFilePreview } = await import('../code-preview-service')
      const result = await readFilePreview('/test/project', 'test.ts')

      // Trailing newline should not add extra line count
      expect(result.lineCount).toBe(2)
    })
  })

  describe('exports', () => {
    it('should export MAX_FILE_SIZE constant', async () => {
      const { MAX_FILE_SIZE } = await import('../code-preview-service')
      expect(MAX_FILE_SIZE).toBe(100 * 1024) // 100KB
    })

    it('should export readFile function', async () => {
      const { readFile } = await import('../code-preview-service')
      expect(typeof readFile).toBe('function')
    })

    it('should export getLanguageFromPath function', async () => {
      const { getLanguageFromPath } = await import('../code-preview-service')
      expect(typeof getLanguageFromPath).toBe('function')
    })
  })
})

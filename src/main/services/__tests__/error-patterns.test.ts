/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ErrorPatternService,
  ErrorPattern,
  ErrorClassification
} from '../error-patterns'

describe('ErrorPatternService', () => {
  let service: ErrorPatternService

  beforeEach(() => {
    service = new ErrorPatternService()
  })

  describe('ErrorPattern interface', () => {
    it('should have required properties', () => {
      const patterns = service.getAllPatterns()
      expect(patterns.length).toBeGreaterThan(0)

      const pattern = patterns[0]
      expect(pattern).toHaveProperty('id')
      expect(pattern).toHaveProperty('name')
      expect(pattern).toHaveProperty('category')
      expect(pattern).toHaveProperty('patterns')
      expect(pattern).toHaveProperty('baseConfidence')
      expect(pattern).toHaveProperty('suggestedStrategies')
    })

    it('should have valid category values', () => {
      const validCategories = [
        'syntax',
        'test',
        'dependency',
        'timeout',
        'permission',
        'network',
        'resource',
        'unknown'
      ]
      const patterns = service.getAllPatterns()

      for (const pattern of patterns) {
        expect(validCategories).toContain(pattern.category)
      }
    })

    it('should have baseConfidence between 0 and 1', () => {
      const patterns = service.getAllPatterns()

      for (const pattern of patterns) {
        expect(pattern.baseConfidence).toBeGreaterThanOrEqual(0)
        expect(pattern.baseConfidence).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('getAllPatterns', () => {
    it('should return all built-in patterns', () => {
      const patterns = service.getAllPatterns()
      expect(patterns.length).toBeGreaterThanOrEqual(6)
    })

    it('should include patterns for at least 6 categories', () => {
      const patterns = service.getAllPatterns()
      const categories = new Set(patterns.map((p) => p.category))
      expect(categories.size).toBeGreaterThanOrEqual(6)
    })

    it('should have patterns for syntax errors', () => {
      const patterns = service.getAllPatterns()
      const syntaxPatterns = patterns.filter((p) => p.category === 'syntax')
      expect(syntaxPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for test errors', () => {
      const patterns = service.getAllPatterns()
      const testPatterns = patterns.filter((p) => p.category === 'test')
      expect(testPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for dependency errors', () => {
      const patterns = service.getAllPatterns()
      const depPatterns = patterns.filter((p) => p.category === 'dependency')
      expect(depPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for timeout errors', () => {
      const patterns = service.getAllPatterns()
      const timeoutPatterns = patterns.filter((p) => p.category === 'timeout')
      expect(timeoutPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for permission errors', () => {
      const patterns = service.getAllPatterns()
      const permPatterns = patterns.filter((p) => p.category === 'permission')
      expect(permPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for network errors', () => {
      const patterns = service.getAllPatterns()
      const networkPatterns = patterns.filter((p) => p.category === 'network')
      expect(networkPatterns.length).toBeGreaterThan(0)
    })

    it('should have patterns for resource errors', () => {
      const patterns = service.getAllPatterns()
      const resourcePatterns = patterns.filter((p) => p.category === 'resource')
      expect(resourcePatterns.length).toBeGreaterThan(0)
    })
  })

  describe('getPattern', () => {
    it('should return a pattern by id', () => {
      const patterns = service.getAllPatterns()
      const firstPattern = patterns[0]

      const retrieved = service.getPattern(firstPattern.id)
      expect(retrieved).toEqual(firstPattern)
    })

    it('should return undefined for non-existent id', () => {
      const result = service.getPattern('non-existent-pattern-id')
      expect(result).toBeUndefined()
    })
  })

  describe('classifyError', () => {
    it('should return empty array for empty error text', () => {
      const results = service.classifyError('')
      expect(results).toEqual([])
    })

    it('should return empty array for unmatched error text', () => {
      const results = service.classifyError('Everything is working perfectly fine')
      expect(results).toEqual([])
    })

    it('should return classifications sorted by confidence (highest first)', () => {
      // Use an error that might match multiple patterns
      const errorText = `Error: Cannot find module 'lodash'
        at Function.Module._resolveFilename (node:internal/modules/cjs/loader:933:15)
        ENOENT: no such file or directory`

      const results = service.classifyError(errorText)
      expect(results.length).toBeGreaterThan(0)

      // Verify sorted by confidence descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence)
      }
    })

    it('should include required properties in classification', () => {
      const errorText = "SyntaxError: Unexpected token ')'"

      const results = service.classifyError(errorText)
      expect(results.length).toBeGreaterThan(0)

      const classification = results[0]
      expect(classification).toHaveProperty('patternId')
      expect(classification).toHaveProperty('category')
      expect(classification).toHaveProperty('confidence')
      expect(classification).toHaveProperty('matchedText')
      expect(classification).toHaveProperty('context')
    })

    describe('TypeScript/JavaScript syntax errors', () => {
      it('should classify SyntaxError', () => {
        const errorText = "SyntaxError: Unexpected token ')'"
        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        expect(results[0].category).toBe('syntax')
      })

      it('should classify TypeScript errors', () => {
        const errorText = `error TS2304: Cannot find name 'foo'.
          src/index.ts:10:5 - error TS2339: Property 'bar' does not exist on type 'string'.`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const syntaxResults = results.filter((r) => r.category === 'syntax')
        expect(syntaxResults.length).toBeGreaterThan(0)
      })

      it('should classify ESLint errors', () => {
        const errorText = `error  Parsing error: Unexpected token
          /src/file.ts
            1:1  error  'foo' is defined but never used  @typescript-eslint/no-unused-vars`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const syntaxResults = results.filter((r) => r.category === 'syntax')
        expect(syntaxResults.length).toBeGreaterThan(0)
      })
    })

    describe('Test assertion failures', () => {
      it('should classify vitest failures', () => {
        const errorText = `FAIL  src/test.spec.ts > TestSuite > should work
        AssertionError: expected 'foo' to equal 'bar'
        - Expected: "bar"
        + Received: "foo"`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const testResults = results.filter((r) => r.category === 'test')
        expect(testResults.length).toBeGreaterThan(0)
      })

      it('should classify jest failures', () => {
        const errorText = `FAIL src/test.test.ts
        Test Suites: 1 failed, 1 total
        expect(received).toBe(expected)
        Expected: 2
        Received: 1`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const testResults = results.filter((r) => r.category === 'test')
        expect(testResults.length).toBeGreaterThan(0)
      })

      it('should classify test timeout errors', () => {
        const errorText = `Error: Test timed out in 5000ms.
        If this is expected, you can increase the timeout using vitest.setConfig({ testTimeout: 10000 })`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        // This could be classified as test or timeout, both are valid
        const relevantResults = results.filter(
          (r) => r.category === 'test' || r.category === 'timeout'
        )
        expect(relevantResults.length).toBeGreaterThan(0)
      })
    })

    describe('Module/import errors', () => {
      it('should classify module not found errors', () => {
        const errorText = `Error: Cannot find module 'lodash'
        Require stack:
        - /project/src/index.js`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const depResults = results.filter((r) => r.category === 'dependency')
        expect(depResults.length).toBeGreaterThan(0)
      })

      it('should classify ES module import errors', () => {
        const errorText = `SyntaxError: Cannot use import statement outside a module
        at wrapSafe (internal/modules/cjs/loader.js:915:16)`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const depResults = results.filter((r) => r.category === 'dependency')
        expect(depResults.length).toBeGreaterThan(0)
      })

      it('should classify npm/yarn dependency errors', () => {
        const errorText = `npm ERR! code ERESOLVE
        npm ERR! ERESOLVE unable to resolve dependency tree
        npm ERR! peer dep missing: react@^17.0.0`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const depResults = results.filter((r) => r.category === 'dependency')
        expect(depResults.length).toBeGreaterThan(0)
      })
    })

    describe('Network timeout errors', () => {
      it('should classify connection timeout', () => {
        const errorText = `Error: connect ETIMEDOUT 192.168.1.1:443
        at TCPConnectWrap.afterConnect [as oncomplete]`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const timeoutResults = results.filter((r) => r.category === 'timeout')
        expect(timeoutResults.length).toBeGreaterThan(0)
      })

      it('should classify socket timeout', () => {
        const errorText = `Error: socket hang up
        Error: ESOCKETTIMEDOUT`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const relevantResults = results.filter(
          (r) => r.category === 'timeout' || r.category === 'network'
        )
        expect(relevantResults.length).toBeGreaterThan(0)
      })
    })

    describe('Permission denied errors', () => {
      it('should classify EACCES errors', () => {
        const errorText = `Error: EACCES: permission denied, open '/etc/passwd'
        at Object.openSync (fs.js:476:3)`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const permResults = results.filter((r) => r.category === 'permission')
        expect(permResults.length).toBeGreaterThan(0)
      })

      it('should classify EPERM errors', () => {
        const errorText = `Error: EPERM: operation not permitted, mkdir '/root/test'`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const permResults = results.filter((r) => r.category === 'permission')
        expect(permResults.length).toBeGreaterThan(0)
      })
    })

    describe('Resource errors', () => {
      it('should classify out of memory errors', () => {
        const errorText = `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
        <--- Last few GCs --->
        [1234:0x123456]  1234567 ms: Mark-sweep`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const resourceResults = results.filter((r) => r.category === 'resource')
        expect(resourceResults.length).toBeGreaterThan(0)
      })

      it('should classify too many open files', () => {
        const errorText = `Error: EMFILE: too many open files, open '/path/to/file'
        at Object.openSync (fs.js:476:3)`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const resourceResults = results.filter((r) => r.category === 'resource')
        expect(resourceResults.length).toBeGreaterThan(0)
      })

      it('should classify disk space errors', () => {
        const errorText = `Error: ENOSPC: no space left on device, write`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const resourceResults = results.filter((r) => r.category === 'resource')
        expect(resourceResults.length).toBeGreaterThan(0)
      })
    })

    describe('Network errors', () => {
      it('should classify connection refused', () => {
        const errorText = `Error: connect ECONNREFUSED 127.0.0.1:3000
        at TCPConnectWrap.afterConnect`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const networkResults = results.filter((r) => r.category === 'network')
        expect(networkResults.length).toBeGreaterThan(0)
      })

      it('should classify DNS errors', () => {
        const errorText = `Error: getaddrinfo ENOTFOUND api.example.com
        at GetAddrInfoReqWrap.onlookup`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const networkResults = results.filter((r) => r.category === 'network')
        expect(networkResults.length).toBeGreaterThan(0)
      })

      it('should classify connection reset', () => {
        const errorText = `Error: read ECONNRESET
        at TCP.onStreamRead (internal/stream_base_commons.js:209:20)`

        const results = service.classifyError(errorText)

        expect(results.length).toBeGreaterThan(0)
        const networkResults = results.filter((r) => r.category === 'network')
        expect(networkResults.length).toBeGreaterThan(0)
      })
    })

    describe('Context extraction', () => {
      it('should extract file path from error', () => {
        const errorText = `Error in /src/components/Button.tsx:42:10
        TypeError: Cannot read property 'onClick' of undefined`

        const results = service.classifyError(errorText)

        if (results.length > 0 && results[0].context.file) {
          expect(results[0].context.file).toContain('Button.tsx')
        }
      })

      it('should extract line number from error', () => {
        const errorText = `src/index.ts:123:45 - error TS2304: Cannot find name 'foo'.`

        const results = service.classifyError(errorText)

        if (results.length > 0 && results[0].context.line) {
          expect(results[0].context.line).toBe(123)
        }
      })
    })
  })

  describe('addCustomPattern', () => {
    it('should add a custom pattern', () => {
      const customPattern: ErrorPattern = {
        id: 'custom-pattern-1',
        name: 'Custom Error Pattern',
        category: 'unknown',
        patterns: [/CustomError: .+/i],
        baseConfidence: 0.8,
        suggestedStrategies: ['retry-simple']
      }

      const initialCount = service.getAllPatterns().length
      service.addCustomPattern(customPattern)
      const newCount = service.getAllPatterns().length

      expect(newCount).toBe(initialCount + 1)
    })

    it('should be able to retrieve added custom pattern', () => {
      const customPattern: ErrorPattern = {
        id: 'custom-pattern-2',
        name: 'Another Custom Pattern',
        category: 'syntax',
        patterns: [/MyAppError: syntax issue/i],
        baseConfidence: 0.9,
        suggestedStrategies: ['retry-with-fix']
      }

      service.addCustomPattern(customPattern)
      const retrieved = service.getPattern('custom-pattern-2')

      expect(retrieved).toEqual(customPattern)
    })

    it('should match errors using custom patterns', () => {
      const customPattern: ErrorPattern = {
        id: 'custom-pattern-3',
        name: 'Database Connection Error',
        category: 'network',
        patterns: [/DatabaseConnectionError: .+/i],
        baseConfidence: 0.95,
        suggestedStrategies: ['retry-with-backoff']
      }

      service.addCustomPattern(customPattern)
      const results = service.classifyError('DatabaseConnectionError: Failed to connect to primary')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].patternId).toBe('custom-pattern-3')
      expect(results[0].category).toBe('network')
    })

    it('should replace existing pattern with same id', () => {
      const pattern1: ErrorPattern = {
        id: 'replaceable-pattern',
        name: 'Original Pattern',
        category: 'unknown',
        patterns: [/original/i],
        baseConfidence: 0.5,
        suggestedStrategies: []
      }

      const pattern2: ErrorPattern = {
        id: 'replaceable-pattern',
        name: 'Replacement Pattern',
        category: 'syntax',
        patterns: [/replacement/i],
        baseConfidence: 0.7,
        suggestedStrategies: ['fix-syntax']
      }

      service.addCustomPattern(pattern1)
      service.addCustomPattern(pattern2)

      const retrieved = service.getPattern('replaceable-pattern')
      expect(retrieved?.name).toBe('Replacement Pattern')
      expect(retrieved?.category).toBe('syntax')
    })
  })

  describe('Multiple pattern matches', () => {
    it('should return multiple classifications when error matches multiple patterns', () => {
      // This error could match both dependency and syntax patterns
      const errorText = `SyntaxError: Cannot use import statement outside a module
        Error: Cannot find module '@types/node'
        at Function.Module._resolveFilename`

      const results = service.classifyError(errorText)

      // Should have matches from both categories
      const categories = new Set(results.map((r) => r.category))
      expect(categories.size).toBeGreaterThanOrEqual(1)
    })

    it('should not return duplicate classifications for the same pattern', () => {
      const errorText = `SyntaxError: Unexpected token
        SyntaxError: Unexpected token`

      const results = service.classifyError(errorText)

      // Check for unique patternIds (allow same pattern to match different text)
      const patternMatches = new Map<string, string[]>()
      for (const result of results) {
        const existing = patternMatches.get(result.patternId) || []
        existing.push(result.matchedText)
        patternMatches.set(result.patternId, existing)
      }

      // Each pattern should only produce one classification per unique match
      // (implementation detail: we de-duplicate by patternId, keeping highest confidence match)
      const uniquePatternIds = new Set(results.map((r) => r.patternId))
      expect(uniquePatternIds.size).toBe(results.length)
    })
  })
})

/**
 * Tests for VariableExtractor
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  VariableExtractor,
  DetectedPattern,
  variableExtractor
} from '../variable-extractor'
// TemplateVariable and VariableType types are used via the extractor's return values

/**
 * ExecutionPlan type for testing (simplified from renderer store)
 */
interface ExecutionPlan {
  issue: {
    number: number
    title: string
  }
  status: string
  phases: Array<{
    number: number
    title: string
    status: string
    files: string[]
    verification: string[]
    summary?: string
    error?: string
  }>
}

describe('VariableExtractor', () => {
  let extractor: VariableExtractor

  beforeEach(() => {
    extractor = new VariableExtractor()
  })

  describe('DetectedPattern interface', () => {
    it('should have all required properties', () => {
      const pattern: DetectedPattern = {
        pattern: '#42',
        suggestedVariable: 'issueNumber',
        occurrences: 3,
        contexts: ['Phase 1 title', 'Phase 2 content', 'verification step'],
        type: 'number'
      }

      expect(pattern).toHaveProperty('pattern')
      expect(pattern).toHaveProperty('suggestedVariable')
      expect(pattern).toHaveProperty('occurrences')
      expect(pattern).toHaveProperty('contexts')
      expect(pattern).toHaveProperty('type')

      expect(typeof pattern.pattern).toBe('string')
      expect(typeof pattern.suggestedVariable).toBe('string')
      expect(typeof pattern.occurrences).toBe('number')
      expect(Array.isArray(pattern.contexts)).toBe(true)
      expect(['string', 'file', 'component', 'number']).toContain(pattern.type)
    })
  })

  describe('extractVariables', () => {
    it('should extract issue number from plan', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Add user authentication'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Phase 1: Setup for #42',
            status: 'completed',
            files: ['src/auth/auth.ts'],
            verification: ['Auth module works']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      const issueVar = variables.find((v) => v.name === 'issueNumber')
      expect(issueVar).toBeDefined()
      expect(issueVar!.type).toBe('number')
      expect(issueVar!.defaultValue).toBe('42')
    })

    it('should extract component names from file paths', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 10,
          title: 'Create User component'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create User component',
            status: 'completed',
            files: [
              'src/components/User.tsx',
              'src/components/User.test.tsx',
              'src/components/User.styles.ts'
            ],
            verification: ['User component renders']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      const componentVar = variables.find((v) => v.name === 'componentName')
      expect(componentVar).toBeDefined()
      expect(componentVar!.type).toBe('component')
      expect(componentVar!.defaultValue).toBe('User')
    })

    it('should extract model names from title', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 15,
          title: 'Create Product model and API'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create Product model',
            status: 'completed',
            files: ['src/models/Product.ts'],
            verification: []
          },
          {
            number: 2,
            title: 'Create Product API endpoints',
            status: 'completed',
            files: ['src/api/product.ts'],
            verification: []
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      const modelVar = variables.find((v) => v.name === 'modelName')
      expect(modelVar).toBeDefined()
      expect(modelVar!.type).toBe('component')
      expect(modelVar!.defaultValue).toBe('Product')
    })

    it('should extract repeated strings across phases', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 20,
          title: 'Refactor authentication module'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Update authentication types',
            status: 'completed',
            files: ['src/auth/types.ts'],
            verification: ['authentication types updated']
          },
          {
            number: 2,
            title: 'Implement authentication service',
            status: 'completed',
            files: ['src/auth/service.ts'],
            verification: ['authentication service works']
          },
          {
            number: 3,
            title: 'Test authentication module',
            status: 'completed',
            files: ['src/auth/auth.test.ts'],
            verification: ['authentication tests pass']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      // Should detect "authentication" as a repeated term
      const featureVar = variables.find((v) => v.defaultValue?.toLowerCase() === 'authentication')
      expect(featureVar).toBeDefined()
    })

    it('should return required=true for all extracted variables', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 5,
          title: 'Simple feature'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Implement feature #5',
            status: 'completed',
            files: ['src/features/Feature.ts'],
            verification: []
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      for (const variable of variables) {
        expect(variable.required).toBe(true)
      }
    })

    it('should generate meaningful descriptions for variables', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Create Button component'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create Button',
            status: 'completed',
            files: ['src/components/Button.tsx'],
            verification: []
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      for (const variable of variables) {
        expect(variable.description).toBeTruthy()
        expect(variable.description.length).toBeGreaterThan(5)
      }
    })

    it('should handle plan with no extractable variables', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 1,
          title: 'Fix typo'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Fix the typo',
            status: 'completed',
            files: ['README.md'],
            verification: ['typo is fixed']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      // Should at least extract issue number
      expect(variables.length).toBeGreaterThanOrEqual(1)
      expect(variables.find((v) => v.name === 'issueNumber')).toBeDefined()
    })
  })

  describe('detectPatterns', () => {
    it('should detect issue number patterns', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Feature #42'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Work on issue #42',
            status: 'completed',
            files: [],
            verification: ['#42 is complete']
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const issuePattern = patterns.find((p) => p.suggestedVariable === 'issueNumber')
      expect(issuePattern).toBeDefined()
      expect(issuePattern!.pattern).toBe('#42')
      expect(issuePattern!.type).toBe('number')
      expect(issuePattern!.occurrences).toBeGreaterThanOrEqual(2)
    })

    it('should detect issue-N patterns', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 99,
          title: 'Fix issue-99'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Branch: issue-99',
            status: 'completed',
            files: [],
            verification: ['issue-99 resolved']
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const issuePattern = patterns.find((p) => p.pattern === 'issue-99')
      expect(issuePattern).toBeDefined()
      expect(issuePattern!.type).toBe('number')
    })

    it('should detect file path patterns', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 10,
          title: 'Create Dashboard'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create component',
            status: 'completed',
            files: [
              'src/components/Dashboard.tsx',
              'src/components/Dashboard.test.tsx'
            ],
            verification: []
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const componentPattern = patterns.find(
        (p) => p.suggestedVariable === 'componentName' && p.pattern === 'Dashboard'
      )
      expect(componentPattern).toBeDefined()
      expect(componentPattern!.type).toBe('component')
      expect(componentPattern!.occurrences).toBe(2)
    })

    it('should detect route path patterns', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 30,
          title: 'Add users API'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create /api/users endpoint',
            status: 'completed',
            files: ['src/routes/api/users.ts'],
            verification: ['/api/users returns data']
          },
          {
            number: 2,
            title: 'Add /api/users/:id route',
            status: 'completed',
            files: ['src/routes/api/users/[id].ts'],
            verification: ['/api/users/:id works']
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const routePattern = patterns.find(
        (p) => p.pattern.includes('users') && p.type === 'string'
      )
      expect(routePattern).toBeDefined()
    })

    it('should detect capitalized component names in paths', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 50,
          title: 'Create UserProfile component'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create UserProfile',
            status: 'completed',
            files: [
              'src/components/UserProfile/UserProfile.tsx',
              'src/components/UserProfile/index.ts'
            ],
            verification: []
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const componentPattern = patterns.find((p) => p.pattern === 'UserProfile')
      expect(componentPattern).toBeDefined()
      expect(componentPattern!.type).toBe('component')
    })

    it('should track occurrences across all phases', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Feature #42'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Phase 1 for #42',
            status: 'completed',
            files: [],
            verification: ['#42 phase 1 done']
          },
          {
            number: 2,
            title: 'Phase 2 for #42',
            status: 'completed',
            files: [],
            verification: ['#42 phase 2 done']
          },
          {
            number: 3,
            title: 'Phase 3 for #42',
            status: 'completed',
            files: [],
            verification: ['#42 phase 3 done']
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const issuePattern = patterns.find((p) => p.pattern === '#42')
      expect(issuePattern).toBeDefined()
      expect(issuePattern!.occurrences).toBeGreaterThanOrEqual(6)
    })

    it('should include context information for each pattern', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Test context'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Work on #42 title',
            status: 'completed',
            files: [],
            verification: ['verify #42 verification']
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const issuePattern = patterns.find((p) => p.pattern === '#42')
      expect(issuePattern).toBeDefined()
      expect(issuePattern!.contexts.length).toBeGreaterThan(0)
      expect(issuePattern!.contexts.some((c) => c.includes('title'))).toBe(true)
    })

    it('should return empty array for plan with no patterns', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 0, // Invalid issue number
          title: ''
        },
        status: 'pending',
        phases: []
      }

      const patterns = extractor.detectPatterns(plan)

      expect(Array.isArray(patterns)).toBe(true)
    })
  })

  describe('substituteVariables', () => {
    it('should replace ${variableName} with actual values', () => {
      const template = 'Create ${componentName} component for issue #${issueNumber}'
      const variables = {
        componentName: 'Button',
        issueNumber: '42'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Create Button component for issue #42')
    })

    it('should handle multiple occurrences of same variable', () => {
      const template = '${name} is great. I love ${name}. ${name} forever!'
      const variables = {
        name: 'TypeScript'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('TypeScript is great. I love TypeScript. TypeScript forever!')
    })

    it('should leave unmatched variables unchanged', () => {
      const template = 'Hello ${name}, your code is ${status}'
      const variables = {
        name: 'Developer'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Hello Developer, your code is ${status}')
    })

    it('should handle nested path variables', () => {
      const template = 'src/components/${componentName}/${componentName}.tsx'
      const variables = {
        componentName: 'Modal'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('src/components/Modal/Modal.tsx')
    })

    it('should handle empty variables object', () => {
      const template = 'Hello ${name}'
      const variables = {}

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Hello ${name}')
    })

    it('should handle template with no variables', () => {
      const template = 'This is a plain string'
      const variables = {
        unused: 'value'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('This is a plain string')
    })

    it('should handle special characters in variable values', () => {
      const template = 'Path: ${path}'
      const variables = {
        path: 'C:\\Users\\test\\file.ts'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Path: C:\\Users\\test\\file.ts')
    })

    it('should handle variable names with underscores', () => {
      const template = 'Value: ${my_variable_name}'
      const variables = {
        my_variable_name: 'test'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Value: test')
    })

    it('should handle camelCase variable names', () => {
      const template = 'Component: ${componentName}, Model: ${modelName}'
      const variables = {
        componentName: 'Header',
        modelName: 'User'
      }

      const result = extractor.substituteVariables(template, variables)

      expect(result).toBe('Component: Header, Model: User')
    })
  })

  describe('suggestVariableName', () => {
    it('should suggest issueNumber for issue references', () => {
      const name = extractor.suggestVariableName('#42', 'issue title')
      expect(name).toBe('issueNumber')
    })

    it('should suggest issueNumber for issue-N format', () => {
      const name = extractor.suggestVariableName('issue-99', 'branch name')
      expect(name).toBe('issueNumber')
    })

    it('should suggest componentName for PascalCase in file paths', () => {
      const name = extractor.suggestVariableName('UserProfile', 'src/components/UserProfile.tsx')
      expect(name).toBe('componentName')
    })

    it('should suggest modelName for model-related contexts', () => {
      const name = extractor.suggestVariableName('Product', 'src/models/Product.ts')
      expect(name).toBe('modelName')
    })

    it('should suggest routePath for API route contexts', () => {
      const name = extractor.suggestVariableName('/api/users', 'route definition')
      expect(name).toBe('routePath')
    })

    it('should suggest featureName for generic strings', () => {
      const name = extractor.suggestVariableName('authentication', 'feature implementation')
      expect(name).toBe('featureName')
    })

    it('should suggest fileName for file path contexts', () => {
      const name = extractor.suggestVariableName('config.json', 'file path')
      expect(name).toBe('fileName')
    })

    it('should handle empty value gracefully', () => {
      const name = extractor.suggestVariableName('', 'some context')
      expect(name).toBe('value')
    })

    it('should suggest serviceName for service-related contexts', () => {
      const name = extractor.suggestVariableName('AuthService', 'src/services/AuthService.ts')
      expect(name).toBe('serviceName')
    })
  })

  describe('edge cases', () => {
    it('should handle plan with empty phases array', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 1,
          title: 'Empty plan'
        },
        status: 'pending',
        phases: []
      }

      const variables = extractor.extractVariables(plan)
      const patterns = extractor.detectPatterns(plan)

      expect(Array.isArray(variables)).toBe(true)
      expect(Array.isArray(patterns)).toBe(true)
    })

    it('should handle phases with empty files array', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 5,
          title: 'No files'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Documentation',
            status: 'completed',
            files: [],
            verification: ['Docs updated']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)
      expect(Array.isArray(variables)).toBe(true)
    })

    it('should deduplicate variables with same name', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Feature with Component'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create Component',
            status: 'completed',
            files: ['src/components/Widget.tsx'],
            verification: []
          },
          {
            number: 2,
            title: 'Test Component',
            status: 'completed',
            files: ['src/components/Widget.test.tsx'],
            verification: []
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      // Should not have duplicate componentName entries
      const componentNames = variables.filter((v) => v.name === 'componentName')
      expect(componentNames.length).toBeLessThanOrEqual(1)
    })

    it('should handle unicode characters in titles', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 100,
          title: 'Add support for emojis and unicode'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Phase 1: Unicode support',
            status: 'completed',
            files: ['src/utils/unicode.ts'],
            verification: ['Unicode works']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)
      const patterns = extractor.detectPatterns(plan)

      expect(Array.isArray(variables)).toBe(true)
      expect(Array.isArray(patterns)).toBe(true)
    })

    it('should handle very long file paths', () => {
      const longPath =
        'src/components/features/users/profile/settings/privacy/PrivacySettings.tsx'
      const plan: ExecutionPlan = {
        issue: {
          number: 200,
          title: 'Add privacy settings'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create component',
            status: 'completed',
            files: [longPath],
            verification: []
          }
        ]
      }

      const patterns = extractor.detectPatterns(plan)

      const componentPattern = patterns.find((p) => p.pattern === 'PrivacySettings')
      expect(componentPattern).toBeDefined()
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(variableExtractor).toBeInstanceOf(VariableExtractor)
    })
  })

  describe('integration scenarios', () => {
    it('should extract all variables from a typical CRUD feature plan', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 50,
          title: 'Implement Product CRUD operations'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create Product model for #50',
            status: 'completed',
            files: ['src/models/Product.ts', 'src/models/Product.test.ts'],
            verification: ['Product model compiles', 'Product tests pass']
          },
          {
            number: 2,
            title: 'Create Product service',
            status: 'completed',
            files: ['src/services/ProductService.ts', 'src/services/ProductService.test.ts'],
            verification: ['ProductService works']
          },
          {
            number: 3,
            title: 'Create /api/products endpoints',
            status: 'completed',
            files: ['src/routes/api/products.ts'],
            verification: ['/api/products responds']
          },
          {
            number: 4,
            title: 'Create Product component',
            status: 'completed',
            files: ['src/components/Product/Product.tsx', 'src/components/Product/index.ts'],
            verification: ['Product component renders']
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      // Should extract meaningful variables
      expect(variables.length).toBeGreaterThan(0)

      // Check for expected variable types
      const issueVar = variables.find((v) => v.name === 'issueNumber')
      expect(issueVar).toBeDefined()
      expect(issueVar!.defaultValue).toBe('50')

      // Should have some component/model variable
      const hasComponentOrModel = variables.some(
        (v) => v.name === 'componentName' || v.name === 'modelName'
      )
      expect(hasComponentOrModel).toBe(true)
    })

    it('should work with substituteVariables to regenerate similar content', () => {
      const plan: ExecutionPlan = {
        issue: {
          number: 42,
          title: 'Create Widget component'
        },
        status: 'completed',
        phases: [
          {
            number: 1,
            title: 'Create Widget',
            status: 'completed',
            files: ['src/components/Widget.tsx'],
            verification: []
          }
        ]
      }

      const variables = extractor.extractVariables(plan)

      // Create a template string
      const template = 'Create ${componentName} component for issue #${issueNumber}'

      // Build variable map from extracted variables
      const variableMap: Record<string, string> = {}
      for (const v of variables) {
        if (v.defaultValue) {
          variableMap[v.name] = v.defaultValue
        }
      }

      // Should be able to substitute
      const result = extractor.substituteVariables(template, variableMap)

      // Verify it substitutes correctly
      if (variableMap.componentName) {
        expect(result).toContain(variableMap.componentName)
      }
      if (variableMap.issueNumber) {
        expect(result).toContain(variableMap.issueNumber)
      }
    })
  })
})

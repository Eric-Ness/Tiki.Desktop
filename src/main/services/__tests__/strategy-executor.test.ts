/**
 * Tests for StrategyExecutorService
 *
 * TDD: Tests written first, then implementation
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StrategyExecutorService, strategyExecutorService } from '../strategy-executor'
import { RetryStrategy } from '../failure-analyzer'

describe('StrategyExecutorService', () => {
  let service: StrategyExecutorService

  beforeEach(() => {
    service = new StrategyExecutorService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('StrategyExecution interface', () => {
    it('should create execution with all required properties', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo the phase',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 42, 3, '/project/path')

      expect(execution).toHaveProperty('id')
      expect(execution).toHaveProperty('strategyId')
      expect(execution).toHaveProperty('issueNumber')
      expect(execution).toHaveProperty('phaseNumber')
      expect(execution).toHaveProperty('startedAt')
      expect(execution).toHaveProperty('completedAt')
      expect(execution).toHaveProperty('outcome')

      // Validate types
      expect(typeof execution.id).toBe('string')
      expect(execution.strategyId).toBe('simple-redo')
      expect(execution.issueNumber).toBe(42)
      expect(execution.phaseNumber).toBe(3)
      expect(typeof execution.startedAt).toBe('number')
      expect(execution.completedAt).toBeNull() // Initially null since command is generated, not executed
      expect(execution.outcome).toBe('pending')
    })

    it('should generate unique execution IDs', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const exec1 = await service.executeStrategy(strategy, 1, 1, '/path')
      const exec2 = await service.executeStrategy(strategy, 1, 1, '/path')

      expect(exec1.id).not.toBe(exec2.id)
    })
  })

  describe('executeStrategy - command generation', () => {
    describe('simple-redo strategy', () => {
      it('should generate redo-phase command', async () => {
        const strategy: RetryStrategy = {
          id: 'simple-redo',
          name: 'Simple Redo',
          description: 'Redo the phase',
          confidence: 0.2,
          applicableTo: ['syntax'],
          action: 'redo'
        }

        const execution = await service.executeStrategy(strategy, 42, 3, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(1)
        expect(execution.commands![0].command).toContain('redo-phase')
        expect(execution.commands![0].command).toContain('42')
        expect(execution.commands![0].command).toContain('3')
      })
    })

    describe('redo-with-error-context strategy', () => {
      it('should generate redo-phase command with context flag', async () => {
        const strategy: RetryStrategy = {
          id: 'redo-with-error-context',
          name: 'Redo with Error Context',
          description: 'Redo with context',
          confidence: 0.5,
          applicableTo: ['syntax'],
          action: 'redo-with-context',
          contextHints: ['Error occurred in file: src/test.ts', 'Line 42']
        }

        const execution = await service.executeStrategy(strategy, 10, 2, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(1)
        expect(execution.commands![0].command).toContain('redo-phase')
        expect(execution.commands![0].command).toContain('10')
        expect(execution.commands![0].command).toContain('2')
        // Should have context flag or similar
        expect(execution.commands![0].command).toContain('--context')
      })

      it('should include context hints in the command notes', async () => {
        const strategy: RetryStrategy = {
          id: 'redo-with-error-context',
          name: 'Redo with Error Context',
          description: 'Redo with context',
          confidence: 0.5,
          applicableTo: ['syntax'],
          action: 'redo-with-context',
          contextHints: ['Error in file: test.ts', 'Missing semicolon']
        }

        const execution = await service.executeStrategy(strategy, 10, 2, '/project')

        expect(execution.notes).toBeDefined()
        expect(execution.notes).toContain('Error in file: test.ts')
        expect(execution.notes).toContain('Missing semicolon')
      })
    })

    describe('rollback-and-redo strategy', () => {
      it('should generate rollback command followed by redo command', async () => {
        const strategy: RetryStrategy = {
          id: 'rollback-and-redo',
          name: 'Rollback and Redo',
          description: 'Rollback then redo',
          confidence: 0.7,
          applicableTo: ['syntax'],
          action: 'rollback-and-redo'
        }

        const execution = await service.executeStrategy(strategy, 5, 1, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(2)

        // First command should be rollback
        expect(execution.commands![0].command).toContain('rollback')
        expect(execution.commands![0].command).toContain('5')
        expect(execution.commands![0].command).toContain('1')
        expect(execution.commands![0].sequence).toBe(1)

        // Second command should be redo
        expect(execution.commands![1].command).toContain('redo-phase')
        expect(execution.commands![1].command).toContain('5')
        expect(execution.commands![1].command).toContain('1')
        expect(execution.commands![1].sequence).toBe(2)
      })
    })

    describe('install-dependencies strategy', () => {
      it('should generate npm install command followed by redo', async () => {
        const strategy: RetryStrategy = {
          id: 'install-dependencies',
          name: 'Install Dependencies',
          description: 'Install deps then redo',
          confidence: 0.8,
          applicableTo: ['dependency'],
          action: 'redo-with-context',
          contextHints: ['Run npm install before retrying']
        }

        const execution = await service.executeStrategy(strategy, 15, 4, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(2)

        // First command should be npm install
        expect(execution.commands![0].command).toContain('npm install')
        expect(execution.commands![0].sequence).toBe(1)

        // Second command should be redo
        expect(execution.commands![1].command).toContain('redo-phase')
        expect(execution.commands![1].command).toContain('15')
        expect(execution.commands![1].command).toContain('4')
        expect(execution.commands![1].sequence).toBe(2)
      })
    })

    describe('skip-phase strategy', () => {
      it('should generate skip-phase command', async () => {
        const strategy: RetryStrategy = {
          id: 'skip-phase',
          name: 'Skip Phase',
          description: 'Skip the phase',
          confidence: 0.2,
          applicableTo: ['syntax'],
          action: 'skip'
        }

        const execution = await service.executeStrategy(strategy, 7, 2, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(1)
        expect(execution.commands![0].command).toContain('skip-phase')
        expect(execution.commands![0].command).toContain('7')
        expect(execution.commands![0].command).toContain('2')
      })
    })

    describe('manual strategy', () => {
      it('should not generate commands but provide instructions', async () => {
        const strategy: RetryStrategy = {
          id: 'fix-and-redo',
          name: 'Manual Fix then Redo',
          description: 'Requires manual intervention',
          confidence: 0.5,
          applicableTo: ['syntax'],
          action: 'manual'
        }

        const execution = await service.executeStrategy(strategy, 3, 1, '/project')

        expect(execution.commands).toBeDefined()
        expect(execution.commands!.length).toBe(0)
        expect(execution.notes).toContain('manual')
        expect(execution.outcome).toBe('pending')
      })
    })
  })

  describe('getExecutionStatus', () => {
    it('should return execution by ID', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')
      const retrieved = service.getExecutionStatus(execution.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(execution.id)
      expect(retrieved!.strategyId).toBe('simple-redo')
    })

    it('should return null for non-existent ID', () => {
      const result = service.getExecutionStatus('non-existent-id')
      expect(result).toBeNull()
    })

    it('should track multiple executions', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const exec1 = await service.executeStrategy(strategy, 1, 1, '/path')
      const exec2 = await service.executeStrategy(strategy, 2, 2, '/path')
      const exec3 = await service.executeStrategy(strategy, 3, 3, '/path')

      expect(service.getExecutionStatus(exec1.id)).not.toBeNull()
      expect(service.getExecutionStatus(exec2.id)).not.toBeNull()
      expect(service.getExecutionStatus(exec3.id)).not.toBeNull()

      expect(service.getExecutionStatus(exec1.id)!.issueNumber).toBe(1)
      expect(service.getExecutionStatus(exec2.id)!.issueNumber).toBe(2)
      expect(service.getExecutionStatus(exec3.id)!.issueNumber).toBe(3)
    })
  })

  describe('cancelExecution', () => {
    it('should cancel a pending execution', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')
      expect(execution.outcome).toBe('pending')

      const result = await service.cancelExecution(execution.id)

      expect(result).toBe(true)
      const updated = service.getExecutionStatus(execution.id)
      expect(updated!.outcome).toBe('cancelled')
      expect(updated!.completedAt).not.toBeNull()
    })

    it('should return false for non-existent ID', async () => {
      const result = await service.cancelExecution('non-existent-id')
      expect(result).toBe(false)
    })

    it('should not cancel already completed execution', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')

      // Mark as completed
      service.updateExecutionStatus(execution.id, 'success')

      const result = await service.cancelExecution(execution.id)

      expect(result).toBe(false)
      const updated = service.getExecutionStatus(execution.id)
      expect(updated!.outcome).toBe('success')
    })

    it('should not cancel already cancelled execution', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')
      await service.cancelExecution(execution.id)

      // Try to cancel again
      const result = await service.cancelExecution(execution.id)
      expect(result).toBe(false)
    })
  })

  describe('updateExecutionStatus', () => {
    it('should update execution to success', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')
      service.updateExecutionStatus(execution.id, 'success', 'completed')

      const updated = service.getExecutionStatus(execution.id)
      expect(updated!.outcome).toBe('success')
      expect(updated!.completedAt).not.toBeNull()
      expect(updated!.resultPhaseStatus).toBe('completed')
    })

    it('should update execution to failure', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')
      service.updateExecutionStatus(execution.id, 'failure', 'failed')

      const updated = service.getExecutionStatus(execution.id)
      expect(updated!.outcome).toBe('failure')
      expect(updated!.completedAt).not.toBeNull()
      expect(updated!.resultPhaseStatus).toBe('failed')
    })

    it('should return false for non-existent execution', () => {
      const result = service.updateExecutionStatus('non-existent', 'success')
      expect(result).toBe(false)
    })
  })

  describe('GeneratedCommand interface', () => {
    it('should have all required properties', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')

      expect(execution.commands!.length).toBeGreaterThan(0)
      const command = execution.commands![0]

      expect(command).toHaveProperty('command')
      expect(command).toHaveProperty('sequence')
      expect(command).toHaveProperty('description')

      expect(typeof command.command).toBe('string')
      expect(typeof command.sequence).toBe('number')
      expect(typeof command.description).toBe('string')
    })
  })

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(strategyExecutorService).toBeInstanceOf(StrategyExecutorService)
    })
  })

  describe('edge cases', () => {
    it('should handle strategy with empty contextHints', async () => {
      const strategy: RetryStrategy = {
        id: 'redo-with-error-context',
        name: 'Redo with Context',
        description: 'Redo',
        confidence: 0.5,
        applicableTo: ['syntax'],
        action: 'redo-with-context',
        contextHints: []
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')

      expect(execution.commands).toBeDefined()
      expect(execution.commands!.length).toBeGreaterThan(0)
    })

    it('should handle strategy with undefined contextHints', async () => {
      const strategy: RetryStrategy = {
        id: 'redo-with-error-context',
        name: 'Redo with Context',
        description: 'Redo',
        confidence: 0.5,
        applicableTo: ['syntax'],
        action: 'redo-with-context'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')

      expect(execution.commands).toBeDefined()
      expect(execution.commands!.length).toBeGreaterThan(0)
    })

    it('should handle very long context hints', async () => {
      const longHint = 'Error: ' + 'a'.repeat(1000)
      const strategy: RetryStrategy = {
        id: 'redo-with-error-context',
        name: 'Redo with Context',
        description: 'Redo',
        confidence: 0.5,
        applicableTo: ['syntax'],
        action: 'redo-with-context',
        contextHints: [longHint]
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path')

      expect(execution.commands).toBeDefined()
      expect(execution.notes).toContain('Error:')
    })

    it('should handle phase number 0', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 0, '/path')

      expect(execution.phaseNumber).toBe(0)
      expect(execution.commands![0].command).toContain('0')
    })

    it('should handle special characters in working directory path', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      const execution = await service.executeStrategy(strategy, 1, 1, '/path/with spaces/and-dashes')

      expect(execution.commands).toBeDefined()
      expect(execution.commands!.length).toBeGreaterThan(0)
    })
  })

  describe('getExecutionHistory', () => {
    it('should return all executions for an issue', async () => {
      const strategy: RetryStrategy = {
        id: 'simple-redo',
        name: 'Simple Redo',
        description: 'Redo',
        confidence: 0.2,
        applicableTo: ['syntax'],
        action: 'redo'
      }

      await service.executeStrategy(strategy, 42, 1, '/path')
      await service.executeStrategy(strategy, 42, 2, '/path')
      await service.executeStrategy(strategy, 99, 1, '/path')

      const history = service.getExecutionHistory(42)

      expect(history.length).toBe(2)
      expect(history.every((e) => e.issueNumber === 42)).toBe(true)
    })

    it('should return empty array for issue with no executions', () => {
      const history = service.getExecutionHistory(999)
      expect(history).toEqual([])
    })
  })
})

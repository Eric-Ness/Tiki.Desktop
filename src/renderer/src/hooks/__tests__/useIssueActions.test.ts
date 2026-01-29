import { describe, it, expect } from 'vitest'
import { getActionInfo, getIssueWorkState, type IssueActionType } from '../useIssueActions'
import type { GitHubIssue, TikiState, ExecutionPlan } from '../../stores/tiki-store'

describe('useIssueActions', () => {
  describe('getActionInfo', () => {
    const actionTypes: IssueActionType[] = [
      'yolo', 'plan', 'execute', 'resume', 'ship', 'verify',
      'get', 'review', 'audit'
    ]

    it('returns info for all action types', () => {
      for (const action of actionTypes) {
        const info = getActionInfo(action)
        expect(info).toBeDefined()
        expect(info.label).toBeTruthy()
        expect(info.icon).toBeTruthy()
        expect(info.description).toBeTruthy()
      }
    })

    it('returns correct info for get action', () => {
      const info = getActionInfo('get')
      expect(info.label).toBe('Get Issue')
      expect(info.icon).toBe('download')
      expect(info.description).toContain('Fetch')
    })

    it('returns correct info for review action', () => {
      const info = getActionInfo('review')
      expect(info.label).toBe('Review')
      expect(info.icon).toBe('search')
      expect(info.description).toContain('review')
    })

    it('returns correct info for audit action', () => {
      const info = getActionInfo('audit')
      expect(info.label).toBe('Audit Plan')
      expect(info.icon).toBe('shield')
      expect(info.description).toContain('audit')
    })

    it('returns correct info for existing actions', () => {
      expect(getActionInfo('yolo').label).toBe('Start Working')
      expect(getActionInfo('plan').label).toBe('Create Plan')
      expect(getActionInfo('execute').label).toBe('Execute')
      expect(getActionInfo('resume').label).toBe('Resume')
      expect(getActionInfo('ship').label).toBe('Ship')
      expect(getActionInfo('verify').label).toBe('Verify')
    })
  })

  describe('getIssueWorkState', () => {
    const mockIssue: GitHubIssue = {
      number: 1,
      title: 'Test Issue',
      state: 'open',
      body: 'Test body',
      labels: [],
      hasPlan: false,
      user: { login: 'test', avatar_url: 'https://example.com/avatar' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    }

    const mockTikiState: TikiState = {
      activeIssue: null,
      currentPhase: null,
      lastActivity: null
    }

    it('includes workflow actions in secondary actions when no plan', () => {
      const result = getIssueWorkState(mockIssue, mockTikiState, null)
      expect(result.primaryAction).toBe('yolo')
      // Should include get, review, plan as secondary actions
      expect(result.secondaryActions).toContain('get')
      expect(result.secondaryActions).toContain('review')
      expect(result.secondaryActions).toContain('plan')
    })

    it('includes audit in secondary actions when plan exists but not started', () => {
      const mockPlan: ExecutionPlan = {
        issueNumber: 1,
        issueTitle: 'Test',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00Z',
        phases: [],
        totalPhases: 0,
        completedPhases: 0,
        currentPhase: null,
        tddEnabled: false
      }
      const issueWithPlan = { ...mockIssue, hasPlan: true }
      const result = getIssueWorkState(issueWithPlan, mockTikiState, mockPlan)
      expect(result.primaryAction).toBe('execute')
      expect(result.secondaryActions).toContain('audit')
    })

    it('returns no actions for closed issues', () => {
      const closedIssue = { ...mockIssue, state: 'closed' }
      const result = getIssueWorkState(closedIssue, mockTikiState, null)
      expect(result.primaryAction).toBeNull()
      expect(result.secondaryActions).toHaveLength(0)
    })
  })
})

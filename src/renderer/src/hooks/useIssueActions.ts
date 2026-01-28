import { useCallback, useState } from 'react'
import { useTikiStore, type GitHubIssue, type TikiState, type ExecutionPlan } from '../stores/tiki-store'

export type IssueActionType = 'yolo' | 'plan' | 'execute' | 'resume' | 'ship' | 'verify'

export interface IssueWorkState {
  hasPlan: boolean
  planStatus: 'none' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'shipped'
  isActiveIssue: boolean
  primaryAction: IssueActionType | null
  secondaryActions: IssueActionType[]
}

/**
 * Determine the work state and available actions for an issue
 */
export function getIssueWorkState(
  issue: GitHubIssue,
  tikiState: TikiState | null,
  plan: ExecutionPlan | null
): IssueWorkState {
  const hasPlan = issue.hasPlan || plan !== null
  const isActiveIssue = tikiState?.activeIssue === issue.number

  // Determine plan status
  let planStatus: IssueWorkState['planStatus'] = 'none'
  if (plan) {
    switch (plan.status) {
      case 'shipped':
        planStatus = 'shipped'
        break
      case 'completed':
        planStatus = 'completed'
        break
      case 'in_progress':
      case 'executing':
        planStatus = 'in_progress'
        break
      case 'failed':
        planStatus = 'failed'
        break
      default:
        planStatus = 'pending'
    }
  } else if (hasPlan) {
    // Has plan but we don't have the details loaded
    planStatus = 'pending'
  }

  // Determine primary and secondary actions based on state
  let primaryAction: IssueActionType | null = null
  const secondaryActions: IssueActionType[] = []

  if (issue.state.toLowerCase() === 'closed') {
    // Closed issue - no actions
    return { hasPlan, planStatus, isActiveIssue, primaryAction: null, secondaryActions: [] }
  }

  switch (planStatus) {
    case 'none':
      // No plan - offer to start work or create plan
      primaryAction = 'yolo'
      secondaryActions.push('plan')
      break
    case 'pending':
      // Has plan but not started - offer to execute or start yolo
      primaryAction = 'execute'
      secondaryActions.push('yolo', 'plan')
      break
    case 'in_progress':
      // In progress - offer to resume or continue execution
      primaryAction = 'resume'
      secondaryActions.push('verify')
      break
    case 'completed':
      // Completed - offer to ship
      primaryAction = 'ship'
      secondaryActions.push('verify')
      break
    case 'failed':
      // Failed - offer to resume or re-execute
      primaryAction = 'resume'
      secondaryActions.push('execute', 'plan')
      break
    case 'shipped':
      // Already shipped - no actions
      primaryAction = null
      break
  }

  return { hasPlan, planStatus, isActiveIssue, primaryAction, secondaryActions }
}

/**
 * Get display info for an action
 */
export function getActionInfo(action: IssueActionType): {
  label: string
  icon: 'play' | 'document' | 'resume' | 'ship' | 'check' | 'execute'
  description: string
} {
  switch (action) {
    case 'yolo':
      return {
        label: 'Start Working',
        icon: 'play',
        description: 'Run full workflow (plan + execute)'
      }
    case 'plan':
      return {
        label: 'Create Plan',
        icon: 'document',
        description: 'Create execution plan without starting'
      }
    case 'execute':
      return {
        label: 'Execute',
        icon: 'execute',
        description: 'Start executing the plan'
      }
    case 'resume':
      return {
        label: 'Resume',
        icon: 'resume',
        description: 'Continue from last checkpoint'
      }
    case 'ship':
      return {
        label: 'Ship',
        icon: 'ship',
        description: 'Finalize and close the issue'
      }
    case 'verify':
      return {
        label: 'Verify',
        icon: 'check',
        description: 'Run verification checks'
      }
  }
}

/**
 * Hook for executing issue actions
 */
export function useIssueActions() {
  const activeProject = useTikiStore((state) => state.activeProject)
  const activeTerminal = useTikiStore((state) => state.activeTerminal)
  const setActiveTab = useTikiStore((state) => state.setActiveTab)
  const [executing, setExecuting] = useState<IssueActionType | null>(null)

  /**
   * Ensure we have an active terminal, creating one if necessary
   */
  const ensureTerminal = useCallback(async (): Promise<string | null> => {
    let terminalId = useTikiStore.getState().activeTerminal
    if (terminalId) return terminalId

    if (!activeProject?.path) return null

    try {
      terminalId = await window.tikiDesktop.terminal.create(activeProject.path)
      useTikiStore.getState().addTerminal({
        id: terminalId,
        name: 'Terminal 1',
        status: 'active'
      })
      useTikiStore.getState().setActiveTerminal(terminalId)
      return terminalId
    } catch {
      return null
    }
  }, [activeProject?.path])

  /**
   * Execute an action for an issue
   */
  const executeAction = useCallback(
    async (action: IssueActionType, issueNumber: number): Promise<boolean> => {
      setExecuting(action)

      try {
        const terminalId = await ensureTerminal()
        if (!terminalId) {
          console.error('No terminal available')
          setExecuting(null)
          return false
        }

        // Build the command based on action
        let command: string
        switch (action) {
          case 'yolo':
            command = `/tiki:yolo ${issueNumber}\n`
            break
          case 'plan':
            command = `/tiki:plan-issue ${issueNumber}\n`
            break
          case 'execute':
            command = `/tiki:execute ${issueNumber}\n`
            break
          case 'resume':
            command = `/tiki:resume\n`
            break
          case 'ship':
            command = `/tiki:ship\n`
            break
          case 'verify':
            command = `/tiki:verify\n`
            break
        }

        // Send to terminal
        window.tikiDesktop.terminal.write(terminalId, command)

        // Switch to terminal tab
        setActiveTab('terminal')

        // Focus the terminal
        window.dispatchEvent(
          new CustomEvent('terminal:focus', { detail: { id: terminalId } })
        )

        return true
      } catch (error) {
        console.error('Failed to execute action:', error)
        return false
      } finally {
        // Clear executing state after a short delay to allow UI feedback
        setTimeout(() => setExecuting(null), 500)
      }
    },
    [ensureTerminal, setActiveTab]
  )

  return {
    executing,
    executeAction,
    getIssueWorkState,
    getActionInfo
  }
}

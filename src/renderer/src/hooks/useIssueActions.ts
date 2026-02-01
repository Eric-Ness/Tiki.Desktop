import { useCallback, useState } from 'react'
import { logger } from '../lib/logger'
import { useTikiStore, type GitHubIssue, type TikiState, type ExecutionPlan } from '../stores/tiki-store'

export type IssueActionType = 'yolo' | 'plan' | 'execute' | 'resume' | 'ship' | 'verify' | 'get' | 'review' | 'audit'

type BranchOption = 'create' | 'existing' | 'current'

export interface StartDialogState {
  isOpen: boolean
  pendingAction: IssueActionType | null
  pendingIssue: GitHubIssue | null
}

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
      secondaryActions.push('get', 'review', 'plan')
      break
    case 'pending':
      // Has plan but not started - offer to execute or start yolo
      primaryAction = 'execute'
      secondaryActions.push('audit', 'yolo', 'plan')
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
  icon: 'play' | 'document' | 'resume' | 'ship' | 'check' | 'execute' | 'download' | 'search' | 'shield'
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
    case 'get':
      return {
        label: 'Get Issue',
        icon: 'download',
        description: 'Fetch and display issue details'
      }
    case 'review':
      return {
        label: 'Review',
        icon: 'search',
        description: 'Pre-planning review and analysis'
      }
    case 'audit':
      return {
        label: 'Audit Plan',
        icon: 'shield',
        description: 'Validate and audit the execution plan'
      }
  }
}

/**
 * Hook for executing issue actions
 */
export function useIssueActions() {
  const activeProject = useTikiStore((state) => state.activeProject)
  const setActiveTab = useTikiStore((state) => state.setActiveTab)
  const associateBranch = useTikiStore((state) => state.associateBranch)
  const setBranchOperationInProgress = useTikiStore((state) => state.setBranchOperationInProgress)
  const [executing, setExecuting] = useState<IssueActionType | null>(null)

  // State for the start issue dialog
  const [startDialogState, setStartDialogState] = useState<StartDialogState>({
    isOpen: false,
    pendingAction: null,
    pendingIssue: null
  })

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
   * Execute an action directly (without branch dialog)
   */
  const executeActionDirect = useCallback(
    async (action: IssueActionType, issueNumber: number): Promise<boolean> => {
      setExecuting(action)

      try {
        const terminalId = await ensureTerminal()
        if (!terminalId) {
          logger.error('No terminal available')
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
          case 'get':
            command = `/tiki:get-issue ${issueNumber}\n`
            break
          case 'review':
            command = `/tiki:review-issue ${issueNumber}\n`
            break
          case 'audit':
            command = `/tiki:audit-plan ${issueNumber}\n`
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
        logger.error('Failed to execute action:', error)
        return false
      } finally {
        // Clear executing state after a short delay to allow UI feedback
        setTimeout(() => setExecuting(null), 500)
      }
    },
    [ensureTerminal, setActiveTab]
  )

  /**
   * Execute an action for an issue - intercepts yolo/execute to show branch dialog
   */
  const executeAction = useCallback(
    async (action: IssueActionType, issueNumber: number, issue?: GitHubIssue): Promise<boolean> => {
      // For yolo and execute actions, show the start dialog first
      if ((action === 'yolo' || action === 'execute') && issue) {
        setStartDialogState({
          isOpen: true,
          pendingAction: action,
          pendingIssue: issue
        })
        return true // Dialog will handle the execution
      }

      // For other actions, execute directly
      return executeActionDirect(action, issueNumber)
    },
    [executeActionDirect]
  )

  /**
   * Close the start dialog without executing
   */
  const closeStartDialog = useCallback(() => {
    setStartDialogState({
      isOpen: false,
      pendingAction: null,
      pendingIssue: null
    })
  }, [])

  /**
   * Handle confirmation from the start dialog with branch options
   */
  const handleStartWithBranch = useCallback(
    async (options: {
      branchOption: BranchOption
      branchName: string
      stashChanges: boolean
    }): Promise<boolean> => {
      const { pendingAction, pendingIssue } = startDialogState
      if (!pendingAction || !pendingIssue || !activeProject?.path) {
        closeStartDialog()
        return false
      }

      const cwd = activeProject.path
      setBranchOperationInProgress(true)

      try {
        // Handle branch operations based on selected option
        if (options.branchOption === 'create') {
          // Create and switch to new branch
          const result = await window.tikiDesktop.branch.create(cwd, {
            name: options.branchName,
            checkout: true
          })

          if (!result.success) {
            logger.error('Failed to create branch:', result.error)
            setBranchOperationInProgress(false)
            return false
          }

          // Associate the branch with the issue
          await window.tikiDesktop.branch.associateIssue(cwd, options.branchName, pendingIssue.number)
          associateBranch(pendingIssue.number, options.branchName)
        } else if (options.branchOption === 'existing') {
          // Switch to existing branch
          const result = await window.tikiDesktop.branch.switch(cwd, options.branchName, {
            stash: options.stashChanges
          })

          if (!result.success) {
            logger.error('Failed to switch branch:', result.error)
            setBranchOperationInProgress(false)
            return false
          }

          // Associate the branch with the issue
          await window.tikiDesktop.branch.associateIssue(cwd, options.branchName, pendingIssue.number)
          associateBranch(pendingIssue.number, options.branchName)
        }
        // For 'current' option, we don't need to switch branches

        // Close the dialog
        closeStartDialog()
        setBranchOperationInProgress(false)

        // Execute the original action
        return executeActionDirect(pendingAction, pendingIssue.number)
      } catch (error) {
        logger.error('Branch operation failed:', error)
        setBranchOperationInProgress(false)
        return false
      }
    },
    [startDialogState, activeProject?.path, closeStartDialog, executeActionDirect, associateBranch, setBranchOperationInProgress]
  )

  return {
    executing,
    executeAction,
    getIssueWorkState,
    getActionInfo,
    // Dialog state and handlers
    startDialogState,
    closeStartDialog,
    handleStartWithBranch
  }
}

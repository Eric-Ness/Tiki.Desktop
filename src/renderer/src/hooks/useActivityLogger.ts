import { useEffect } from 'react'
import { useActivityStore } from '../stores/activity-store'
import { useTikiStore } from '../stores/tiki-store'

/**
 * Hook that listens to various Tiki and app events and logs them to the activity store.
 * This provides a real-time activity feed of what's happening in the application.
 */
export function useActivityLogger() {
  const addEvent = useActivityStore((state) => state.addEvent)
  const tikiState = useTikiStore((state) => state.tikiState)
  const currentPlan = useTikiStore((state) => state.currentPlan)
  const activeProject = useTikiStore((state) => state.activeProject)

  // Log app start on mount
  useEffect(() => {
    addEvent({
      type: 'app_start',
      level: 'info',
      message: 'Tiki Desktop started'
    })
  }, []) // Only on mount

  // Track Tiki state changes
  useEffect(() => {
    if (!tikiState) return

    // Check for execution start
    if (tikiState.status === 'executing' && tikiState.activeIssue) {
      addEvent({
        type: 'execution_start',
        level: 'info',
        message: `Started executing issue #${tikiState.activeIssue}`,
        metadata: {
          issueNumber: tikiState.activeIssue
        }
      })
    }

    // Check for execution completion
    if (tikiState.status === 'idle' && tikiState.lastActivity === 'completed') {
      addEvent({
        type: 'execution_complete',
        level: 'success',
        message: `Completed execution of issue #${tikiState.activeIssue}`,
        metadata: {
          issueNumber: tikiState.activeIssue ?? undefined
        }
      })
    }

    // Check for execution failure
    if (tikiState.status === 'failed') {
      addEvent({
        type: 'execution_fail',
        level: 'error',
        message: `Execution failed for issue #${tikiState.activeIssue}`,
        metadata: {
          issueNumber: tikiState.activeIssue ?? undefined
        }
      })
    }
  }, [tikiState?.status, tikiState?.activeIssue])

  // Track phase changes from current plan
  useEffect(() => {
    if (!currentPlan) return

    const phases = currentPlan.phases || []
    for (const phase of phases) {
      if (phase.status === 'in_progress') {
        addEvent({
          type: 'phase_start',
          level: 'info',
          message: `Phase ${phase.number}: ${phase.title}`,
          metadata: {
            issueNumber: currentPlan.issue.number,
            phaseNumber: phase.number
          }
        })
      } else if (phase.status === 'completed') {
        addEvent({
          type: 'phase_complete',
          level: 'success',
          message: `Completed Phase ${phase.number}: ${phase.title}`,
          metadata: {
            issueNumber: currentPlan.issue.number,
            phaseNumber: phase.number
          }
        })
      } else if (phase.status === 'failed') {
        addEvent({
          type: 'phase_fail',
          level: 'error',
          message: `Failed Phase ${phase.number}: ${phase.title}`,
          metadata: {
            issueNumber: currentPlan.issue.number,
            phaseNumber: phase.number,
            error: phase.error
          }
        })
      } else if (phase.status === 'skipped') {
        addEvent({
          type: 'phase_skip',
          level: 'warning',
          message: `Skipped Phase ${phase.number}: ${phase.title}`,
          metadata: {
            issueNumber: currentPlan.issue.number,
            phaseNumber: phase.number
          }
        })
      }
    }
  }, [currentPlan?.status, JSON.stringify(currentPlan?.phases?.map(p => ({ n: p.number, s: p.status })))])

  // Track project switches
  useEffect(() => {
    if (activeProject) {
      addEvent({
        type: 'project_switch',
        level: 'info',
        message: `Switched to project: ${activeProject.name}`,
        metadata: {
          files: [activeProject.path]
        }
      })
    }
  }, [activeProject?.id])
}

type AddEventFn = (event: Omit<import('../stores/activity-store').ActivityEvent, 'id' | 'timestamp'>) => void

/**
 * Log a command execution event
 */
export function logCommandExecution(addEvent: AddEventFn, command: string): void {
  addEvent({
    type: 'command_execute',
    level: 'info',
    message: `Executed command: ${command}`,
    metadata: {
      command
    }
  })
}

/**
 * Log a terminal creation event
 */
export function logTerminalCreate(addEvent: AddEventFn, terminalId: string, name: string): void {
  addEvent({
    type: 'terminal_create',
    level: 'info',
    message: `Created terminal: ${name}`,
    metadata: {
      terminalId
    }
  })
}

/**
 * Log a terminal close event
 */
export function logTerminalClose(addEvent: AddEventFn, terminalId: string, name: string): void {
  addEvent({
    type: 'terminal_close',
    level: 'info',
    message: `Closed terminal: ${name}`,
    metadata: {
      terminalId
    }
  })
}

// Timeline utility functions for phase execution visualization

import type { PhaseExecution, ExecutionTimeline } from '../types/timeline'
import type { ExecutionPlan, TikiState } from '../stores/tiki-store'

/**
 * Format milliseconds duration to human readable string
 */
export function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return '--'
  }

  if (durationMs === 0) {
    return '0s'
  }

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }

  return `${seconds}s`
}

/**
 * Format Date to time string (HH:MM format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Generate evenly distributed tick marks between start and end times
 */
export function generateTicks(startTime: Date, endTime: Date, tickCount: number): Date[] {
  const ticks: Date[] = []
  const startMs = startTime.getTime()
  const endMs = endTime.getTime()
  const range = endMs - startMs

  for (let i = 0; i < tickCount; i++) {
    const fraction = tickCount > 1 ? i / (tickCount - 1) : 0
    ticks.push(new Date(startMs + range * fraction))
  }

  return ticks
}

/**
 * Calculate total duration of all executions
 */
export function calculateTotalDuration(executions: PhaseExecution[]): number {
  if (executions.length === 0) {
    return 0
  }

  return executions.reduce((total, exec) => {
    if (exec.durationMs !== undefined) {
      return total + exec.durationMs
    }
    // For running executions, calculate elapsed time
    if (exec.status === 'running') {
      const startTime = new Date(exec.startedAt).getTime()
      const elapsed = Date.now() - startTime
      return total + elapsed
    }
    return total
  }, 0)
}

/**
 * Calculate the start offset for a phase based on previous phases
 */
export function calculateOffset(executions: PhaseExecution[], index: number): number {
  let offset = 0
  for (let i = 0; i < index; i++) {
    const exec = executions[i]
    if (exec.durationMs !== undefined) {
      offset += exec.durationMs
    } else if (exec.status === 'running') {
      const startTime = new Date(exec.startedAt).getTime()
      offset += Date.now() - startTime
    }
  }
  return offset
}

/**
 * Calculate the end time of the timeline
 */
export function calculateEndTime(timeline: ExecutionTimeline): Date {
  if (timeline.executions.length === 0) {
    return new Date(timeline.startedAt)
  }

  // If there's a running execution, use current time
  if (timeline.currentExecution && timeline.currentExecution.status === 'running') {
    return new Date()
  }

  // Find the last completed execution
  const lastExecution = timeline.executions[timeline.executions.length - 1]
  if (lastExecution.completedAt) {
    return new Date(lastExecution.completedAt)
  }

  // Fallback: calculate from start + durations
  const totalDuration = calculateTotalDuration(timeline.executions)
  return new Date(new Date(timeline.startedAt).getTime() + totalDuration)
}

/**
 * Map plan phase status to timeline execution status
 */
function mapPhaseStatus(
  status: string,
  isCurrentPhase: boolean
): 'completed' | 'failed' | 'running' | 'skipped' {
  if (isCurrentPhase && status === 'in_progress') {
    return 'running'
  }
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'skipped':
      return 'skipped'
    case 'in_progress':
      return 'running'
    default:
      return 'completed'
  }
}

/**
 * Extract timeline data from execution plan and tiki state
 */
export function extractTimeline(
  plan: ExecutionPlan | null,
  state: TikiState | null
): ExecutionTimeline {
  if (!plan) {
    return {
      executions: [],
      issueNumber: 0,
      startedAt: new Date().toISOString()
    }
  }

  const executions: PhaseExecution[] = []
  let currentExecution: PhaseExecution | undefined

  const completedPhases = state?.completedPhases || []
  const currentPhase = state?.currentPhase || null

  for (const phase of plan.phases) {
    const isCompleted = completedPhases.includes(phase.number)
    const isRunning = phase.number === currentPhase
    const isFailed = phase.status === 'failed'
    const isSkipped = phase.status === 'skipped'

    // Only include phases that have been executed (completed, running, failed, or skipped)
    if (isCompleted || isRunning || isFailed || isSkipped) {
      const execution: PhaseExecution = {
        phaseNumber: phase.number,
        phaseName: phase.title,
        issueNumber: plan.issue.number,
        startedAt: new Date().toISOString(), // Would ideally come from phase metadata
        status: mapPhaseStatus(phase.status, isRunning),
        files: phase.files,
        error: phase.error
      }

      // Estimate duration for completed phases (would ideally come from actual timing data)
      if (isCompleted) {
        execution.completedAt = new Date().toISOString()
        // Placeholder duration - in real implementation, this would come from stored timing data
        execution.durationMs = 60000 // 1 minute default
      }

      executions.push(execution)

      if (isRunning) {
        currentExecution = execution
      }
    }
  }

  return {
    executions,
    currentExecution,
    issueNumber: plan.issue.number,
    startedAt: state?.lastActivity || new Date().toISOString()
  }
}

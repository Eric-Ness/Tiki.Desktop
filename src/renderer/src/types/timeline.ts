// Timeline data types for phase execution history visualization

export type PhaseExecutionStatus = 'completed' | 'failed' | 'running' | 'skipped'

export interface PhaseExecution {
  phaseNumber: number
  phaseName: string
  issueNumber: number
  startedAt: string
  completedAt?: string
  status: PhaseExecutionStatus
  durationMs?: number
  files?: string[]
  error?: string
}

export interface ExecutionTimeline {
  executions: PhaseExecution[]
  currentExecution?: PhaseExecution
  issueNumber: number
  startedAt: string
}

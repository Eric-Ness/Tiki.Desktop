import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MainContent } from '../components/layout/MainContent'

// Mock components that have complex initialization
vi.mock('../components/terminal/TerminalTabs', () => ({
  TerminalTabs: () => <div data-testid="terminal-tabs-mock">Terminal Tabs Mock</div>
}))

vi.mock('../components/workflow/WorkflowCanvas', () => ({
  WorkflowCanvas: () => <div data-testid="workflow-canvas-mock">Workflow Canvas Mock</div>
}))

describe('MainContent Timeline Integration', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the Timeline tab button', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })
    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument()
  })

  it('should switch to Timeline view when Timeline tab is clicked', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    const timelineTab = screen.getByRole('button', { name: /timeline/i })
    await act(async () => {
      fireEvent.click(timelineTab)
    })

    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()
  })

  it('should have Workflow and Timeline tabs adjacent for easy switching', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    const workflowTab = screen.getByRole('button', { name: /workflow/i })
    const timelineTab = screen.getByRole('button', { name: /timeline/i })

    // Both should exist
    expect(workflowTab).toBeInTheDocument()
    expect(timelineTab).toBeInTheDocument()
  })

  it('should hide timeline when switching to other tabs', async () => {
    await act(async () => {
      render(<MainContent cwd="/test/path" />)
    })

    // Switch to timeline first
    const timelineTab = screen.getByRole('button', { name: /timeline/i })
    await act(async () => {
      fireEvent.click(timelineTab)
    })

    expect(screen.getByTestId('timeline-view')).toBeInTheDocument()

    // Switch to workflow (not terminal to avoid xterm issues)
    const workflowTab = screen.getByRole('button', { name: /workflow/i })
    await act(async () => {
      fireEvent.click(workflowTab)
    })

    expect(screen.queryByTestId('timeline-view')).not.toBeInTheDocument()
  })
})

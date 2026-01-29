import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DependencyIssueNode } from '../DependencyIssueNode'

// Mock @xyflow/react Handle
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Top: 'top', Bottom: 'bottom' }
}))

describe('DependencyIssueNode', () => {
  const defaultProps = {
    data: {
      number: 123,
      title: 'Test Issue Title',
      state: 'OPEN',
      hasCircularDep: false
    }
  }

  it('should render issue number', () => {
    render(<DependencyIssueNode {...defaultProps} />)

    expect(screen.getByText('#123')).toBeInTheDocument()
  })

  it('should render issue title', () => {
    render(<DependencyIssueNode {...defaultProps} />)

    expect(screen.getByText('Test Issue Title')).toBeInTheDocument()
  })

  it('should render handles for connections', () => {
    render(<DependencyIssueNode {...defaultProps} />)

    expect(screen.getByTestId('handle-target')).toBeInTheDocument()
    expect(screen.getByTestId('handle-source')).toBeInTheDocument()
  })

  describe('state styling', () => {
    it('should apply open state styling for OPEN issues', () => {
      render(<DependencyIssueNode {...defaultProps} />)

      const node = screen.getByTestId('dependency-issue-node')
      expect(node).toHaveClass('border-green-500')
    })

    it('should apply closed state styling for CLOSED issues', () => {
      const props = {
        data: { ...defaultProps.data, state: 'CLOSED' }
      }
      render(<DependencyIssueNode {...props} />)

      const node = screen.getByTestId('dependency-issue-node')
      expect(node).toHaveClass('border-slate-500')
    })
  })

  describe('circular dependency indicator', () => {
    it('should show warning ring when hasCircularDep is true', () => {
      const props = {
        data: { ...defaultProps.data, hasCircularDep: true }
      }
      render(<DependencyIssueNode {...props} />)

      const node = screen.getByTestId('dependency-issue-node')
      expect(node).toHaveClass('ring-2')
      expect(node).toHaveClass('ring-orange-500')
    })

    it('should not show warning ring when hasCircularDep is false', () => {
      render(<DependencyIssueNode {...defaultProps} />)

      const node = screen.getByTestId('dependency-issue-node')
      expect(node).not.toHaveClass('ring-orange-500')
    })

    it('should show circular dependency icon when hasCircularDep is true', () => {
      const props = {
        data: { ...defaultProps.data, hasCircularDep: true }
      }
      render(<DependencyIssueNode {...props} />)

      expect(screen.getByTestId('circular-dep-indicator')).toBeInTheDocument()
    })

    it('should not show circular dependency icon when hasCircularDep is false', () => {
      render(<DependencyIssueNode {...defaultProps} />)

      expect(screen.queryByTestId('circular-dep-indicator')).not.toBeInTheDocument()
    })
  })

  it('should truncate long titles', () => {
    const props = {
      data: {
        ...defaultProps.data,
        title: 'This is a very long issue title that should be truncated by CSS'
      }
    }
    render(<DependencyIssueNode {...props} />)

    const titleElement = screen.getByText(props.data.title)
    expect(titleElement).toHaveClass('truncate')
  })
})

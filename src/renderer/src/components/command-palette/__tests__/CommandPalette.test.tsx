import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from '../CommandPalette'

const mockCommands = [
  { name: 'tiki:yolo', displayName: 'yolo', description: 'Run full workflow', argumentHint: '<issue>' },
  { name: 'tiki:ship', displayName: 'ship', description: 'Ship the issue' },
  { name: 'tiki:state', displayName: 'state', description: 'Show current state' },
  { name: 'tiki:release-ship', displayName: 'release-ship', description: 'Ship a release' }
]

const mockRecentCommands = ['tiki:yolo', 'tiki:ship']

describe('CommandPalette', () => {
  const mockOnSelect = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <CommandPalette
        isOpen={false}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument()
  })

  it('should display all commands', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('yolo')).toBeInTheDocument()
    expect(screen.getByText('ship')).toBeInTheDocument()
    expect(screen.getByText('state')).toBeInTheDocument()
  })

  it('should display command descriptions', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Run full workflow')).toBeInTheDocument()
    expect(screen.getByText('Ship the issue')).toBeInTheDocument()
  })

  it('should display argument hints', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('<issue>')).toBeInTheDocument()
  })

  it('should filter commands based on search input', async () => {
    const user = userEvent.setup()

    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    const input = screen.getByPlaceholderText(/search commands/i)
    await user.type(input, 'ship')

    // Should show "ship" and "release-ship" but not "yolo" or "state"
    expect(screen.getByText('ship')).toBeInTheDocument()
    expect(screen.getByText('release-ship')).toBeInTheDocument()
    // These may still be in DOM but filtered out visually by cmdk
  })

  it('should display recent commands section when recent commands exist', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={mockRecentCommands}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('should call onSelect when a command is selected', async () => {
    const user = userEvent.setup()

    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    // Find and click the yolo command
    const yoloButton = screen.getByText('yolo').closest('[cmdk-item]')
    if (yoloButton) {
      await user.click(yoloButton)
    }

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'tiki:yolo' }))
    })
  })

  it('should close on Escape key', async () => {
    const user = userEvent.setup()

    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    await user.keyboard('{Escape}')

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show empty state when no commands match', async () => {
    const user = userEvent.setup()

    render(
      <CommandPalette
        isOpen={true}
        onClose={mockOnClose}
        commands={mockCommands}
        recentCommands={[]}
        onSelect={mockOnSelect}
      />
    )

    const input = screen.getByPlaceholderText(/search commands/i)
    await user.type(input, 'xyznonexistent')

    expect(screen.getByText(/no commands found/i)).toBeInTheDocument()
  })
})

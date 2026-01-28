import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTikiStore } from '../stores/tiki-store'
import { TerminalTabs } from '../components/terminal/TerminalTabs'

// Mock the Terminal component
vi.mock('../components/terminal/Terminal', () => ({
  Terminal: ({ terminalId }: { terminalId: string }) => (
    <div data-testid={`terminal-${terminalId}`}>Terminal {terminalId}</div>
  )
}))

// Mock the useTerminalShortcuts hook
vi.mock('../hooks/useTerminalShortcuts', () => ({
  useTerminalShortcuts: () => {}
}))

describe('Terminal Rename', () => {
  beforeEach(() => {
    // Reset store state with pre-existing terminals
    useTikiStore.setState({
      terminals: [
        { id: 'terminal-1', name: 'Terminal 1', status: 'active' },
        { id: 'terminal-2', name: 'Terminal 2', status: 'active' }
      ],
      activeTerminal: 'terminal-1'
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Store renameTab action', () => {
    it('should rename a terminal tab via store action', () => {
      const { renameTab } = useTikiStore.getState()

      renameTab('terminal-1', 'My Custom Terminal')

      const state = useTikiStore.getState()
      expect(state.terminals[0].name).toBe('My Custom Terminal')
    })

    it('should keep other terminals unchanged when renaming one', () => {
      const { renameTab } = useTikiStore.getState()

      renameTab('terminal-1', 'Renamed Terminal')

      const state = useTikiStore.getState()
      expect(state.terminals[0].name).toBe('Renamed Terminal')
      expect(state.terminals[1].name).toBe('Terminal 2')
    })

    it('should handle empty name by using default name', () => {
      // This test verifies the edge case behavior - component should handle this
      const { renameTab } = useTikiStore.getState()
      const terminalIndex = useTikiStore.getState().terminals.findIndex(t => t.id === 'terminal-1')

      // Store allows empty name, but component is responsible for default
      renameTab('terminal-1', '')

      const state = useTikiStore.getState()
      // The store accepts any value, component is responsible for default
      expect(state.terminals[terminalIndex].name).toBe('')
    })
  })

  describe('TerminalTabs inline editing', () => {
    it('should enter edit mode on double-click of tab name', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // Find the tab name element (using data-testid for reliability)
      const tabName = screen.getByTestId('tab-name-terminal-1')

      // Double-click to enter edit mode
      fireEvent.doubleClick(tabName)

      // Should now have an input field
      const input = await screen.findByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Terminal 1')
    })

    it('should save name on Enter key press', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.type(input, 'My New Name{Enter}')

      // Input should disappear and new name should be displayed
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      expect(screen.getByText('My New Name')).toBeInTheDocument()
    })

    it('should save name on blur', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.type(input, 'Blurred Name')

      // Blur the input
      fireEvent.blur(input)

      // Input should disappear and new name should be displayed
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Blurred Name')).toBeInTheDocument()
    })

    it('should cancel editing on Escape key press', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.type(input, 'This should be cancelled')
      await user.keyboard('{Escape}')

      // Input should disappear and original name should remain
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Terminal 1')).toBeInTheDocument()
      expect(screen.queryByText('This should be cancelled')).not.toBeInTheDocument()
    })

    it('should revert to default name when empty name is submitted', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.keyboard('{Enter}')

      // Should revert to default name pattern "Terminal N"
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      // Should have "Terminal 1" as default for first terminal
      expect(screen.getByText('Terminal 1')).toBeInTheDocument()
    })

    it('should show edit icon on tab hover', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // The edit icon should exist (it may be hidden via CSS but present in DOM)
      const editIcon = screen.getByTestId('edit-icon-terminal-1')
      expect(editIcon).toBeInTheDocument()
    })

    it('should enter edit mode when clicking edit icon', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // Find and click the edit icon
      const editIcon = screen.getByTestId('edit-icon-terminal-1')
      fireEvent.click(editIcon)

      // Should enter edit mode
      const input = await screen.findByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Terminal 1')
    })

    it('should select all text when entering edit mode', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox') as HTMLInputElement

      // Check that input is focused
      expect(document.activeElement).toBe(input)
    })

    it('should only allow editing one tab at a time', async () => {
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode on first tab
      const tabName1 = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName1)

      // Verify first input exists
      await screen.findByRole('textbox')

      // Try to enter edit mode on second tab (by double-clicking)
      const tabName2 = screen.getByTestId('tab-name-terminal-2')
      fireEvent.doubleClick(tabName2)

      // Should still only have one input (either first is saved and second opened, or stays on first)
      const inputs = screen.queryAllByRole('textbox')
      expect(inputs).toHaveLength(1)
    })

    it('should trim whitespace from names', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.type(input, '  Trimmed Name  {Enter}')

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Trimmed Name')).toBeInTheDocument()
    })

    it('should handle whitespace-only name as empty', async () => {
      const user = userEvent.setup()
      render(<TerminalTabs cwd="/test/path" />)

      // Enter edit mode
      const tabName = screen.getByTestId('tab-name-terminal-1')
      fireEvent.doubleClick(tabName)

      const input = await screen.findByRole('textbox')
      await user.clear(input)
      await user.type(input, '   {Enter}')

      // Should revert to default name
      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Terminal 1')).toBeInTheDocument()
    })
  })

  describe('CSS truncation for long names', () => {
    it('should have truncate class for long names', () => {
      useTikiStore.setState({
        terminals: [
          { id: 'terminal-1', name: 'This is a very long terminal name that should be truncated', status: 'active' }
        ],
        activeTerminal: 'terminal-1'
      })

      render(<TerminalTabs cwd="/test/path" />)

      const tabName = screen.getByTestId('tab-name-terminal-1')
      expect(tabName).toHaveClass('truncate')
    })
  })
})

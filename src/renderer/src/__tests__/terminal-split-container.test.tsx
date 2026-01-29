import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useTikiStore } from '../stores/tiki-store'
import { TerminalSplitContainer } from '../components/terminal/TerminalSplitContainer'

// Mock Terminal component to avoid xterm complexity
vi.mock('../components/terminal/Terminal', () => ({
  Terminal: ({ terminalId }: { terminalId: string }) => (
    <div data-testid={`terminal-${terminalId}`}>Mock Terminal {terminalId}</div>
  )
}))

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="panel" className={className}>
      {children}
    </div>
  ),
  PanelGroup: ({
    children,
    direction,
    className
  }: {
    children: React.ReactNode
    direction: string
    className?: string
  }) => (
    <div data-testid="panel-group" data-direction={direction} className={className}>
      {children}
    </div>
  ),
  PanelResizeHandle: ({ className }: { className?: string }) => (
    <div data-testid="resize-handle" className={className} />
  )
}))

describe('TerminalSplitContainer', () => {
  beforeEach(() => {
    // Reset store to single pane layout
    useTikiStore.setState({
      terminals: [
        { id: 'terminal-1', name: 'Terminal 1', status: 'active' },
        { id: 'terminal-2', name: 'Terminal 2', status: 'idle' }
      ],
      activeTerminal: 'terminal-1',
      terminalLayout: {
        direction: 'none',
        panes: [{ id: 'pane-1', terminalId: 'terminal-1', size: 100 }]
      },
      focusedPaneId: 'pane-1'
    })
  })

  describe('single pane layout', () => {
    it('should render single terminal when no split', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.getByTestId('terminal-terminal-1')).toBeInTheDocument()
    })

    it('should not render resize handle when no split', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.queryByTestId('resize-handle')).not.toBeInTheDocument()
    })
  })

  describe('horizontal split layout', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        }
      })
    })

    it('should render two terminals side by side', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.getByTestId('terminal-terminal-1')).toBeInTheDocument()
      expect(screen.getByTestId('terminal-terminal-2')).toBeInTheDocument()
    })

    it('should use horizontal panel group', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      const panelGroup = screen.getByTestId('panel-group')
      expect(panelGroup).toHaveAttribute('data-direction', 'horizontal')
    })

    it('should render resize handle between panes', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.getByTestId('resize-handle')).toBeInTheDocument()
    })
  })

  describe('vertical split layout', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'vertical',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        }
      })
    })

    it('should render two terminals stacked', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.getByTestId('terminal-terminal-1')).toBeInTheDocument()
      expect(screen.getByTestId('terminal-terminal-2')).toBeInTheDocument()
    })

    it('should use vertical panel group', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      const panelGroup = screen.getByTestId('panel-group')
      expect(panelGroup).toHaveAttribute('data-direction', 'vertical')
    })
  })

  describe('focus indication', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        },
        focusedPaneId: 'pane-1'
      })
    })

    it('should show focus ring on focused pane', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      const pane1 = screen.getByTestId('pane-pane-1')
      const pane2 = screen.getByTestId('pane-pane-2')

      expect(pane1).toHaveClass('ring-2')
      expect(pane2).not.toHaveClass('ring-2')
    })

    it('should update focus on click', () => {
      const setFocusedPane = vi.fn()
      useTikiStore.setState({ setFocusedPane })

      render(<TerminalSplitContainer cwd="/test/path" />)

      const pane2 = screen.getByTestId('pane-pane-2')
      fireEvent.click(pane2)

      expect(setFocusedPane).toHaveBeenCalledWith('pane-2')
    })
  })

  describe('terminal selector', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        }
      })
    })

    it('should show terminal name in each pane header', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      // Both terminal names appear in selects and labels
      const terminal1Elements = screen.getAllByText('Terminal 1')
      const terminal2Elements = screen.getAllByText('Terminal 2')

      expect(terminal1Elements.length).toBeGreaterThan(0)
      expect(terminal2Elements.length).toBeGreaterThan(0)
    })
  })

  describe('close pane button', () => {
    beforeEach(() => {
      useTikiStore.setState({
        terminalLayout: {
          direction: 'horizontal',
          panes: [
            { id: 'pane-1', terminalId: 'terminal-1', size: 50 },
            { id: 'pane-2', terminalId: 'terminal-2', size: 50 }
          ]
        }
      })
    })

    it('should call closeSplit when close button clicked', () => {
      const closeSplit = vi.fn()
      useTikiStore.setState({ closeSplit })

      render(<TerminalSplitContainer cwd="/test/path" />)

      const closeButtons = screen.getAllByTitle('Close pane')
      fireEvent.click(closeButtons[1])

      expect(closeSplit).toHaveBeenCalledWith('pane-2')
    })
  })

  describe('split actions', () => {
    it('should show split buttons in toolbar', () => {
      render(<TerminalSplitContainer cwd="/test/path" />)

      expect(screen.getByTitle('Split horizontally')).toBeInTheDocument()
      expect(screen.getByTitle('Split vertically')).toBeInTheDocument()
    })

    it('should call splitTerminal when split button clicked', () => {
      const splitTerminal = vi.fn()
      useTikiStore.setState({ splitTerminal })

      render(<TerminalSplitContainer cwd="/test/path" />)

      fireEvent.click(screen.getByTitle('Split horizontally'))
      expect(splitTerminal).toHaveBeenCalledWith('horizontal')

      fireEvent.click(screen.getByTitle('Split vertically'))
      expect(splitTerminal).toHaveBeenCalledWith('vertical')
    })
  })
})

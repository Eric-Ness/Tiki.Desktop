import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodePreview } from '../CodePreview'

const mockFileContent = {
  content: `import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}`,
  language: 'typescript',
  lineCount: 6,
  isTruncated: false,
  originalSize: 150
}

const mockDiff = `diff --git a/src/Counter.tsx b/src/Counter.tsx
index abc123..def456 100644
--- a/src/Counter.tsx
+++ b/src/Counter.tsx
@@ -1,5 +1,7 @@
 import { useState } from 'react'
+import { useCallback } from 'react'

 function Counter() {
-  const [count, setCount] = useState(0)
+  const [count, setCount] = useState(10)
   return <button onClick={() => setCount(c => c + 1)}>{count}</button>
 }`

describe('CodePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock implementation
    ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileContent)
    ;(window.tikiDesktop.code.openInEditor as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
    ;(window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiff)
  })

  describe('Header Bar', () => {
    it('should render file path in header', async () => {
      render(<CodePreview filePath="src/components/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-path')).toHaveTextContent('src/components/Counter.tsx')
      })
    })

    it('should render expand/collapse toggle button', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-toggle')).toBeInTheDocument()
      })
    })

    it('should render open in editor button', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-open-editor')).toBeInTheDocument()
      })
    })

    it('should show view mode toggle when diff refs are provided', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-code')).toBeInTheDocument()
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })
    })

    it('should not show view mode toggle when no diff refs', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('view-mode-code')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-mode-diff')).not.toBeInTheDocument()
    })

    it('should apply correct header styling', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const header = screen.getByTestId('code-preview-header')
        expect(header).toHaveClass('bg-slate-800')
        expect(header).toHaveClass('border-b')
        expect(header).toHaveClass('border-slate-700')
      })
    })

    it('should apply monospace font to file path', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const path = screen.getByTestId('code-preview-path')
        expect(path).toHaveClass('font-mono')
        expect(path).toHaveClass('text-sm')
        expect(path).toHaveClass('text-slate-300')
      })
    })
  })

  describe('Expand/Collapse', () => {
    it('should be expanded by default', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
      })
    })

    it('should collapse when toggle is clicked', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('code-preview-toggle'))

      expect(screen.queryByTestId('code-preview-content')).not.toBeInTheDocument()
    })

    it('should expand when toggle is clicked again', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
      })

      // Collapse
      fireEvent.click(screen.getByTestId('code-preview-toggle'))
      expect(screen.queryByTestId('code-preview-content')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(screen.getByTestId('code-preview-toggle'))
      expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
    })

    it('should respect defaultExpanded=false prop', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" defaultExpanded={false} />)

      // Even with collapsed state, header should render
      await waitFor(() => {
        expect(screen.getByTestId('code-preview-header')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('code-preview-content')).not.toBeInTheDocument()
    })

    it('should respect defaultExpanded=true prop', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" defaultExpanded={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-content')).toBeInTheDocument()
      })
    })

    it('should show chevron pointing down when expanded', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const toggle = screen.getByTestId('code-preview-toggle')
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('should show chevron pointing right when collapsed', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" defaultExpanded={false} />)

      await waitFor(() => {
        const toggle = screen.getByTestId('code-preview-toggle')
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('View Mode Toggle', () => {
    it('should default to Code view when diff refs provided', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        const codeBtn = screen.getByTestId('view-mode-code')
        expect(codeBtn).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should switch to Diff view when Diff button is clicked', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('view-mode-diff'))

      await waitFor(() => {
        const diffBtn = screen.getByTestId('view-mode-diff')
        expect(diffBtn).toHaveAttribute('aria-pressed', 'true')
        const codeBtn = screen.getByTestId('view-mode-code')
        expect(codeBtn).toHaveAttribute('aria-pressed', 'false')
      })
    })

    it('should switch back to Code view when Code button is clicked', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })

      // Switch to diff
      fireEvent.click(screen.getByTestId('view-mode-diff'))

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-diff')).toHaveAttribute('aria-pressed', 'true')
      })

      // Switch back to code
      fireEvent.click(screen.getByTestId('view-mode-code'))

      await waitFor(() => {
        const codeBtn = screen.getByTestId('view-mode-code')
        expect(codeBtn).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should fetch diff when switching to Diff view', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('view-mode-diff'))

      await waitFor(() => {
        expect(window.tikiDesktop.git.getFileDiff).toHaveBeenCalledWith(
          '/test/project',
          'src/Counter.tsx',
          'abc123',
          'def456'
        )
      })
    })
  })

  describe('Open in Editor', () => {
    it('should call openInEditor when button is clicked', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-open-editor')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('code-preview-open-editor'))

      expect(window.tikiDesktop.code.openInEditor).toHaveBeenCalledWith('src/Counter.tsx')
    })

    it('should have accessible label for open in editor button', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const button = screen.getByTestId('code-preview-open-editor')
        expect(button).toHaveAttribute('aria-label', 'Open in editor')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner while fetching file content', async () => {
      // Make the readFile call hang
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      expect(screen.getByTestId('code-preview-loading')).toBeInTheDocument()
    })

    it('should show loading text', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should hide loading spinner after content loads', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.queryByTestId('code-preview-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should show error message when file cannot be read', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File not found')
      )

      render(<CodePreview filePath="src/missing-file.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-error')).toBeInTheDocument()
      })
    })

    it('should show "File not found" error message', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File not found')
      )

      render(<CodePreview filePath="src/missing-file.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByText(/file not found|unable to read file/i)).toBeInTheDocument()
      })
    })

    it('should show generic error message for other errors', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Permission denied')
      )

      render(<CodePreview filePath="src/restricted.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByText(/unable to read file/i)).toBeInTheDocument()
      })
    })

    it('should still show header when error occurs', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File not found')
      )

      render(<CodePreview filePath="src/missing-file.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-header')).toBeInTheDocument()
        expect(screen.getByTestId('code-preview-path')).toHaveTextContent('src/missing-file.tsx')
      })
    })
  })

  describe('Content Display', () => {
    it('should render SyntaxHighlighter when in code view', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
      })
    })

    it('should pass correct props to SyntaxHighlighter', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        // Check that the content is displayed (use getAllByText since syntax highlighting may split tokens)
        expect(screen.getAllByText(/useState/)[0]).toBeInTheDocument()
      })
    })

    it('should render DiffView when in diff mode', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('view-mode-diff'))

      await waitFor(() => {
        // DiffView should be rendered - check for diff line content which indicates DiffView is showing
        // DiffView shows the file path and diff content with line numbers
        expect(screen.getAllByTestId('line-number').length).toBeGreaterThan(0)
      })
    })

    it('should apply correct content area styling', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const content = screen.getByTestId('code-preview-content')
        expect(content).toHaveClass('bg-slate-900')
      })
    })

    it('should call readFile with correct arguments', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(window.tikiDesktop.code.readFile).toHaveBeenCalledWith(
          '/test/project',
          'src/Counter.tsx'
        )
      })
    })
  })

  describe('Truncation Handling', () => {
    it('should pass isTruncated to SyntaxHighlighter when file is truncated', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockFileContent,
        isTruncated: true
      })

      render(<CodePreview filePath="src/large-file.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('truncation-notice')).toBeInTheDocument()
      })
    })

    it('should not show truncation notice for non-truncated files', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('truncation-notice')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible expand/collapse button', async () => {
      render(<CodePreview filePath="src/Counter.tsx" cwd="/test/project" />)

      await waitFor(() => {
        const toggle = screen.getByTestId('code-preview-toggle')
        expect(toggle).toHaveAttribute('aria-expanded')
        expect(toggle).toHaveAttribute('aria-label')
      })
    })

    it('should have proper ARIA attributes on view mode buttons', async () => {
      render(
        <CodePreview
          filePath="src/Counter.tsx"
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        const codeBtn = screen.getByTestId('view-mode-code')
        const diffBtn = screen.getByTestId('view-mode-diff')
        expect(codeBtn).toHaveAttribute('aria-pressed')
        expect(diffBtn).toHaveAttribute('aria-pressed')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty file content', async () => {
      ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '',
        language: 'typescript',
        lineCount: 0,
        isTruncated: false,
        originalSize: 0
      })

      render(<CodePreview filePath="src/empty.tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
      })
    })

    it('should handle long file paths with truncation', async () => {
      const longPath = 'src/components/features/authentication/providers/oauth/google/GoogleAuthProvider.tsx'
      render(<CodePreview filePath={longPath} cwd="/test/project" />)

      await waitFor(() => {
        const pathElement = screen.getByTestId('code-preview-path')
        expect(pathElement).toHaveClass('truncate')
      })
    })

    it('should handle special characters in file path', async () => {
      render(<CodePreview filePath="src/components/[id].tsx" cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByTestId('code-preview-path')).toHaveTextContent('src/components/[id].tsx')
      })
    })
  })
})

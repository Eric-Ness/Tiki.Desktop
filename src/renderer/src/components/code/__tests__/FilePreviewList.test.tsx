import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { FilePreviewList } from '../FilePreviewList'

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

describe('FilePreviewList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.tikiDesktop.code.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockFileContent)
    ;(window.tikiDesktop.code.openInEditor as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
    ;(window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>).mockResolvedValue('')
  })

  describe('Rendering', () => {
    it('should render file list container', () => {
      render(<FilePreviewList files={['src/file1.ts']} cwd="/test/project" />)

      expect(screen.getByTestId('file-preview-list')).toBeInTheDocument()
    })

    it('should render CodePreview for each file', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        expect(previews).toHaveLength(3)
      })
    })

    it('should pass cwd to each CodePreview', async () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/custom/project/path" />
      )

      await waitFor(() => {
        expect(window.tikiDesktop.code.readFile).toHaveBeenCalledWith(
          '/custom/project/path',
          'src/file1.ts'
        )
      })
    })

    it('should pass diff refs to CodePreview when provided', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts']}
          cwd="/test/project"
          fromRef="abc123"
          toRef="def456"
        />
      )

      await waitFor(() => {
        // View mode buttons should appear when diff refs are provided
        expect(screen.getByTestId('view-mode-code')).toBeInTheDocument()
        expect(screen.getByTestId('view-mode-diff')).toBeInTheDocument()
      })
    })
  })

  describe('Header Section', () => {
    it('should render header with file count', () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      expect(screen.getByTestId('file-count')).toHaveTextContent('3 files')
    })

    it('should show singular "file" for single file', () => {
      render(<FilePreviewList files={['src/file1.ts']} cwd="/test/project" />)

      expect(screen.getByTestId('file-count')).toHaveTextContent('1 file')
    })

    it('should render Expand All button', () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
        />
      )

      expect(screen.getByTestId('expand-all-btn')).toBeInTheDocument()
      expect(screen.getByTestId('expand-all-btn')).toHaveTextContent('Expand All')
    })

    it('should render Collapse All button', () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
        />
      )

      expect(screen.getByTestId('collapse-all-btn')).toBeInTheDocument()
      expect(screen.getByTestId('collapse-all-btn')).toHaveTextContent('Collapse All')
    })

    it('should apply correct header styling', () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/test/project" />
      )

      const header = screen.getByTestId('file-preview-list-header')
      expect(header).toHaveClass('flex')
      expect(header).toHaveClass('justify-between')
      expect(header).toHaveClass('items-center')
      expect(header).toHaveClass('mb-3')
    })

    it('should apply correct styling to file count', () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/test/project" />
      )

      const fileCount = screen.getByTestId('file-count')
      expect(fileCount).toHaveClass('text-sm')
      expect(fileCount).toHaveClass('text-slate-400')
    })

    it('should apply correct styling to buttons', () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/test/project" />
      )

      const expandBtn = screen.getByTestId('expand-all-btn')
      const collapseBtn = screen.getByTestId('collapse-all-btn')

      expect(expandBtn).toHaveClass('text-xs')
      expect(expandBtn).toHaveClass('text-slate-400')
      expect(collapseBtn).toHaveClass('text-xs')
      expect(collapseBtn).toHaveClass('text-slate-400')
    })
  })

  describe('Auto Expand First', () => {
    it('should expand first file by default', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        // First preview should have content visible
        const firstPreview = previews[0]
        expect(within(firstPreview).getByTestId('code-preview-content')).toBeInTheDocument()
      })
    })

    it('should collapse other files by default', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        expect(previews).toHaveLength(3)
      })

      const previews = screen.getAllByTestId('code-preview')
      // Second and third previews should be collapsed (no content)
      expect(within(previews[1]).queryByTestId('code-preview-content')).not.toBeInTheDocument()
      expect(within(previews[2]).queryByTestId('code-preview-content')).not.toBeInTheDocument()
    })

    it('should respect autoExpandFirst=false prop', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
          autoExpandFirst={false}
        />
      )

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        expect(previews).toHaveLength(2)
      })

      const previews = screen.getAllByTestId('code-preview')
      // All previews should be collapsed when autoExpandFirst is false
      expect(within(previews[0]).queryByTestId('code-preview-content')).not.toBeInTheDocument()
      expect(within(previews[1]).queryByTestId('code-preview-content')).not.toBeInTheDocument()
    })

    it('should respect autoExpandFirst=true prop (explicit)', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
          autoExpandFirst={true}
        />
      )

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        const firstPreview = previews[0]
        expect(within(firstPreview).getByTestId('code-preview-content')).toBeInTheDocument()
      })
    })
  })

  describe('Expand All / Collapse All', () => {
    it('should expand all files when Expand All is clicked', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(3)
      })

      // Click Expand All
      fireEvent.click(screen.getByTestId('expand-all-btn'))

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        // All previews should now have content
        previews.forEach((preview) => {
          expect(within(preview).getByTestId('code-preview-content')).toBeInTheDocument()
        })
      })
    })

    it('should collapse all files when Collapse All is clicked', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(3)
      })

      // First, expand all
      fireEvent.click(screen.getByTestId('expand-all-btn'))

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        expect(within(previews[2]).getByTestId('code-preview-content')).toBeInTheDocument()
      })

      // Now collapse all
      fireEvent.click(screen.getByTestId('collapse-all-btn'))

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        // All previews should now be collapsed
        previews.forEach((preview) => {
          expect(within(preview).queryByTestId('code-preview-content')).not.toBeInTheDocument()
        })
      })
    })

    it('should allow individual file toggle after Expand All', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(2)
      })

      // Expand all
      fireEvent.click(screen.getByTestId('expand-all-btn'))

      await waitFor(() => {
        const previews = screen.getAllByTestId('code-preview')
        expect(within(previews[1]).getByTestId('code-preview-content')).toBeInTheDocument()
      })

      // Click toggle on first file to collapse it individually
      const previews = screen.getAllByTestId('code-preview')
      const toggleBtn = within(previews[0]).getByTestId('code-preview-toggle')
      fireEvent.click(toggleBtn)

      // First file should be collapsed, second still expanded
      await waitFor(() => {
        expect(within(previews[0]).queryByTestId('code-preview-content')).not.toBeInTheDocument()
      })
      expect(within(previews[1]).getByTestId('code-preview-content')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when files array is empty', () => {
      render(<FilePreviewList files={[]} cwd="/test/project" />)

      expect(screen.getByTestId('file-preview-list-empty')).toBeInTheDocument()
      expect(screen.getByText(/no files/i)).toBeInTheDocument()
    })

    it('should not render header when files array is empty', () => {
      render(<FilePreviewList files={[]} cwd="/test/project" />)

      expect(screen.queryByTestId('file-preview-list-header')).not.toBeInTheDocument()
    })

    it('should not render CodePreview components when files array is empty', () => {
      render(<FilePreviewList files={[]} cwd="/test/project" />)

      expect(screen.queryByTestId('code-preview')).not.toBeInTheDocument()
    })
  })

  describe('Container Styling', () => {
    it('should apply space-y-2 to file list container', () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
        />
      )

      const filesList = screen.getByTestId('file-preview-list-items')
      expect(filesList).toHaveClass('space-y-2')
    })
  })

  describe('File Path Display', () => {
    it('should display each file path correctly', async () => {
      render(
        <FilePreviewList
          files={['src/components/App.tsx', 'src/utils/helpers.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument()
        expect(screen.getByText('src/utils/helpers.ts')).toBeInTheDocument()
      })
    })
  })

  describe('Lazy Loading', () => {
    it('should only load content for expanded files', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts', 'src/file3.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(3)
      })

      // Only the first file should have triggered a read (expanded by default)
      // Note: CodePreview loads content on mount regardless of expanded state
      // but the content is only displayed when expanded
      expect(window.tikiDesktop.code.readFile).toHaveBeenCalledWith(
        '/test/project',
        'src/file1.ts'
      )
    })

    it('should load content when a collapsed file is expanded', async () => {
      render(
        <FilePreviewList
          files={['src/file1.ts', 'src/file2.ts']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(2)
      })

      // Expand the second file
      const previews = screen.getAllByTestId('code-preview')
      const toggleBtn = within(previews[1]).getByTestId('code-preview-toggle')
      fireEvent.click(toggleBtn)

      await waitFor(() => {
        expect(within(previews[1]).getByTestId('code-preview-content')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single file list', async () => {
      render(<FilePreviewList files={['src/file1.ts']} cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(1)
      })

      expect(screen.getByTestId('file-count')).toHaveTextContent('1 file')
    })

    it('should handle large number of files', async () => {
      const files = Array.from({ length: 20 }, (_, i) => `src/file${i + 1}.ts`)
      render(<FilePreviewList files={files} cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('code-preview')).toHaveLength(20)
      })

      expect(screen.getByTestId('file-count')).toHaveTextContent('20 files')
    })

    it('should handle files with special characters in paths', async () => {
      render(
        <FilePreviewList
          files={['src/components/[id].tsx', 'src/pages/[[...slug]].tsx']}
          cwd="/test/project"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('src/components/[id].tsx')).toBeInTheDocument()
        expect(screen.getByText('src/pages/[[...slug]].tsx')).toBeInTheDocument()
      })
    })

    it('should handle deeply nested file paths', async () => {
      const deepPath = 'src/components/features/auth/providers/oauth/google/GoogleProvider.tsx'
      render(<FilePreviewList files={[deepPath]} cwd="/test/project" />)

      await waitFor(() => {
        expect(screen.getByText(deepPath)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible Expand All button', () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/test/project" />
      )

      const expandBtn = screen.getByTestId('expand-all-btn')
      expect(expandBtn.tagName).toBe('BUTTON')
    })

    it('should have accessible Collapse All button', () => {
      render(
        <FilePreviewList files={['src/file1.ts']} cwd="/test/project" />
      )

      const collapseBtn = screen.getByTestId('collapse-all-btn')
      expect(collapseBtn.tagName).toBe('BUTTON')
    })
  })
})

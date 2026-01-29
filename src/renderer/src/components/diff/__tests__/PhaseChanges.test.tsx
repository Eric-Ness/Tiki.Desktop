import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhaseChanges } from '../PhaseChanges'

const mockDiffStats = {
  files: [
    { path: 'src/main/index.ts', status: 'modified' as const, additions: 10, deletions: 5 },
    { path: 'src/new-file.ts', status: 'added' as const, additions: 50, deletions: 0 }
  ],
  totalAdditions: 60,
  totalDeletions: 5,
  totalFiles: 2
}

describe('PhaseChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', async () => {
    // Use a cwd prop to avoid async getCwd call
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    // Should show loading initially since getDiffStats never resolves
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should render change summary after loading', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiffStats)
    ;(window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>).mockResolvedValue('')

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    // First wait for the file list to be rendered, which indicates loading is complete
    await waitFor(() => {
      expect(screen.getByText('src/main/index.ts')).toBeInTheDocument()
    })

    // Then check for the summary section
    const summarySection = screen.getByTestId('change-summary')
    expect(summarySection).toBeInTheDocument()
    expect(summarySection).toHaveTextContent('+60')
    expect(summarySection).toHaveTextContent('-5')
    expect(summarySection).toHaveTextContent('2 files changed')
  })

  it('should render file list', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiffStats)
    ;(window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>).mockResolvedValue('')

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    await waitFor(() => {
      expect(screen.getByText('src/main/index.ts')).toBeInTheDocument()
      expect(screen.getByText('src/new-file.ts')).toBeInTheDocument()
    })
  })

  it('should show diff when file is clicked', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiffStats)
    const mockGetFileDiff = window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>
    mockGetFileDiff.mockResolvedValue(`diff --git a/src/main/index.ts b/src/main/index.ts
@@ -1,5 +1,7 @@
 import { app } from 'electron'
+import { newImport } from './new'
 function main() {
   console.log('hello')
+  console.log('new line')
 }
`)

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    // Wait for file list to render
    await waitFor(() => {
      expect(screen.getAllByText('src/main/index.ts').length).toBeGreaterThan(0)
    })

    // Click the file in the file list (use data-testid to be specific)
    const fileItem = screen.getAllByTestId('file-item')[0]
    fireEvent.click(fileItem)

    await waitFor(() => {
      expect(mockGetFileDiff).toHaveBeenCalledWith(
        '/test/project',
        'src/main/index.ts',
        'abc123',
        'def456'
      )
    })
  })

  it('should render empty state when no changes', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
      totalFiles: 0
    })

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    await waitFor(() => {
      expect(screen.getByText(/no files changed/i)).toBeInTheDocument()
    })
  })

  it('should handle error gracefully', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Git error'))

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    await waitFor(() => {
      expect(screen.getByText(/error loading changes/i)).toBeInTheDocument()
    })
  })

  it('should allow navigation between files with keyboard', async () => {
    ;(window.tikiDesktop.git.getDiffStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiffStats)
    ;(window.tikiDesktop.git.getFileDiff as ReturnType<typeof vi.fn>).mockResolvedValue('')

    render(<PhaseChanges fromRef="abc123" toRef="def456" cwd="/test/project" />)

    await waitFor(() => {
      expect(screen.getByText('src/main/index.ts')).toBeInTheDocument()
    })

    // Click first file
    fireEvent.click(screen.getByText('src/main/index.ts'))

    // Navigate with keyboard
    const list = screen.getByRole('listbox')
    fireEvent.keyDown(list, { key: 'ArrowDown' })

    // Second file should be selected
    const secondItem = screen.getByText('src/new-file.ts').closest('[data-testid="file-item"]')
    expect(secondItem).toHaveClass('bg-slate-700')
  })
})

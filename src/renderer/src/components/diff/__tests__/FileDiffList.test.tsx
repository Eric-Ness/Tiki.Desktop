import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileDiffList, FileChange } from '../FileDiffList'

const mockFiles: FileChange[] = [
  { path: 'src/main/index.ts', status: 'modified', additions: 10, deletions: 5 },
  { path: 'src/new-file.ts', status: 'added', additions: 50, deletions: 0 },
  { path: 'src/old-file.ts', status: 'deleted', additions: 0, deletions: 30 }
]

describe('FileDiffList', () => {
  it('should render list of files', () => {
    render(<FileDiffList files={mockFiles} onFileSelect={vi.fn()} />)

    expect(screen.getByText('src/main/index.ts')).toBeInTheDocument()
    expect(screen.getByText('src/new-file.ts')).toBeInTheDocument()
    expect(screen.getByText('src/old-file.ts')).toBeInTheDocument()
  })

  it('should show status indicator for modified files', () => {
    render(<FileDiffList files={mockFiles} onFileSelect={vi.fn()} />)

    const modifiedItem = screen.getByText('src/main/index.ts').closest('[data-testid="file-item"]')
    expect(modifiedItem).toHaveAttribute('data-status', 'modified')
  })

  it('should show status indicator for added files', () => {
    render(<FileDiffList files={mockFiles} onFileSelect={vi.fn()} />)

    const addedItem = screen.getByText('src/new-file.ts').closest('[data-testid="file-item"]')
    expect(addedItem).toHaveAttribute('data-status', 'added')
  })

  it('should show status indicator for deleted files', () => {
    render(<FileDiffList files={mockFiles} onFileSelect={vi.fn()} />)

    const deletedItem = screen.getByText('src/old-file.ts').closest('[data-testid="file-item"]')
    expect(deletedItem).toHaveAttribute('data-status', 'deleted')
  })

  it('should call onFileSelect when file is clicked', () => {
    const onFileSelect = vi.fn()
    render(<FileDiffList files={mockFiles} onFileSelect={onFileSelect} />)

    fireEvent.click(screen.getByText('src/main/index.ts'))

    expect(onFileSelect).toHaveBeenCalledWith(mockFiles[0])
  })

  it('should highlight selected file', () => {
    render(
      <FileDiffList files={mockFiles} onFileSelect={vi.fn()} selectedPath="src/new-file.ts" />
    )

    const selectedItem = screen.getByText('src/new-file.ts').closest('[data-testid="file-item"]')
    expect(selectedItem).toHaveClass('bg-slate-700')
  })

  it('should show additions and deletions for each file', () => {
    render(<FileDiffList files={mockFiles} onFileSelect={vi.fn()} />)

    // Modified file: +10 -5
    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('-5')).toBeInTheDocument()

    // Added file: +50
    expect(screen.getByText('+50')).toBeInTheDocument()

    // Deleted file: -30
    expect(screen.getByText('-30')).toBeInTheDocument()
  })

  it('should render empty state when no files', () => {
    render(<FileDiffList files={[]} onFileSelect={vi.fn()} />)

    expect(screen.getByText(/no files changed/i)).toBeInTheDocument()
  })

  it('should support keyboard navigation with arrow keys', () => {
    const onFileSelect = vi.fn()
    render(<FileDiffList files={mockFiles} onFileSelect={onFileSelect} selectedPath="src/main/index.ts" />)

    const list = screen.getByRole('listbox')
    fireEvent.keyDown(list, { key: 'ArrowDown' })

    expect(onFileSelect).toHaveBeenCalledWith(mockFiles[1])
  })

  it('should support Enter key to select file', () => {
    const onFileSelect = vi.fn()
    render(<FileDiffList files={mockFiles} onFileSelect={onFileSelect} selectedPath="src/main/index.ts" />)

    const list = screen.getByRole('listbox')
    fireEvent.keyDown(list, { key: 'Enter' })

    expect(onFileSelect).toHaveBeenCalledWith(mockFiles[0])
  })
})

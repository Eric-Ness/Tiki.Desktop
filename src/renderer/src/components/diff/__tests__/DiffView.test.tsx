import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffView } from '../DiffView'

const sampleDiff = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,7 @@
 import { app } from 'electron'
+import { newImport } from './new'

 function main() {
   console.log('hello')
+  console.log('new line')
+  console.log('another line')
 }
`

describe('DiffView', () => {
  it('should render diff content', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    expect(screen.getByText(/import \{ app \} from 'electron'/)).toBeInTheDocument()
    expect(screen.getByText(/import \{ newImport \} from '.\/new'/)).toBeInTheDocument()
  })

  it('should show file path in header', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    expect(screen.getByText('src/index.ts')).toBeInTheDocument()
  })

  it('should highlight added lines in green', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    // Lines starting with + should have green background
    const addedLines = screen.getAllByTestId('diff-line-added')
    expect(addedLines.length).toBeGreaterThan(0)
    addedLines.forEach(line => {
      expect(line).toHaveClass('bg-green-900/30')
    })
  })

  it('should highlight removed lines in red', () => {
    const diffWithRemovals = `diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,2 @@
 const a = 1
-const b = 2
 const c = 3
`
    render(<DiffView diff={diffWithRemovals} filePath="src/test.ts" />)

    const removedLines = screen.getAllByTestId('diff-line-removed')
    expect(removedLines.length).toBeGreaterThan(0)
    removedLines.forEach(line => {
      expect(line).toHaveClass('bg-red-900/30')
    })
  })

  it('should default to unified view mode', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    const unifiedButton = screen.getByRole('button', { name: /unified/i })
    expect(unifiedButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('should allow switching to side-by-side view', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    const sideBySideButton = screen.getByRole('button', { name: /side-by-side/i })
    fireEvent.click(sideBySideButton)

    expect(sideBySideButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('should show line numbers', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" />)

    // Line numbers should be visible
    const lineNumbers = screen.getAllByTestId('line-number')
    expect(lineNumbers.length).toBeGreaterThan(0)
  })

  it('should render empty state when no diff', () => {
    render(<DiffView diff="" filePath="src/index.ts" />)

    expect(screen.getByText(/no changes/i)).toBeInTheDocument()
  })

  it('should render loading state', () => {
    render(<DiffView diff="" filePath="src/index.ts" loading />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should support side-by-side mode with two columns', () => {
    render(<DiffView diff={sampleDiff} filePath="src/index.ts" mode="split" />)

    expect(screen.getByTestId('diff-view-split')).toBeInTheDocument()
  })

  it('should handle binary files gracefully', () => {
    const binaryDiff = 'Binary files a/image.png and b/image.png differ'
    render(<DiffView diff={binaryDiff} filePath="image.png" />)

    expect(screen.getByText(/binary file/i)).toBeInTheDocument()
  })
})

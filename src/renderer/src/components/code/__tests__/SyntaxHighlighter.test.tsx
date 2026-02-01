import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyntaxHighlighter } from '../SyntaxHighlighter'

const sampleTypeScript = `import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}`

const sampleJSON = `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0"
  }
}`

const sampleCSS = `.container {
  display: flex;
  background-color: #000;
}`

describe('SyntaxHighlighter', () => {
  describe('Basic Rendering', () => {
    it('should render code content', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      // Use getAllByText since syntax highlighting may split tokens
      expect(screen.getAllByText(/import/)[0]).toBeInTheDocument()
      expect(screen.getAllByText(/useState/)[0]).toBeInTheDocument()
    })

    it('should render with data-testid', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should apply dark theme background', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const container = screen.getByTestId('syntax-highlighter')
      expect(container).toHaveClass('bg-slate-900')
    })
  })

  describe('Line Numbers', () => {
    it('should display line numbers by default', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const lineNumbers = screen.getAllByTestId('line-number')
      expect(lineNumbers.length).toBeGreaterThan(0)
      expect(lineNumbers[0]).toHaveTextContent('1')
    })

    it('should hide line numbers when lineNumbers is false', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" lineNumbers={false} />)

      expect(screen.queryAllByTestId('line-number')).toHaveLength(0)
    })

    it('should start line numbers from startLine prop', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" startLine={10} />)

      const lineNumbers = screen.getAllByTestId('line-number')
      expect(lineNumbers[0]).toHaveTextContent('10')
      expect(lineNumbers[1]).toHaveTextContent('11')
    })

    it('should style line numbers with slate color and border', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const lineNumberColumn = screen.getByTestId('line-number-column')
      expect(lineNumberColumn).toHaveClass('text-slate-500')
      expect(lineNumberColumn).toHaveClass('border-r')
      expect(lineNumberColumn).toHaveClass('border-slate-700')
    })
  })

  describe('Language Support', () => {
    it('should render TypeScript code', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      // Should contain syntax elements
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should render JavaScript code', () => {
      const jsCode = 'const x = 5;\nconsole.log(x);'
      render(<SyntaxHighlighter code={jsCode} language="javascript" />)

      expect(screen.getByText(/const/)).toBeInTheDocument()
    })

    it('should render JSON code', () => {
      render(<SyntaxHighlighter code={sampleJSON} language="json" />)

      expect(screen.getByText(/"name"/)).toBeInTheDocument()
    })

    it('should render CSS code', () => {
      render(<SyntaxHighlighter code={sampleCSS} language="css" />)

      expect(screen.getByText(/\.container/)).toBeInTheDocument()
    })

    it('should render HTML code', () => {
      const htmlCode = '<div class="test">Hello</div>'
      render(<SyntaxHighlighter code={htmlCode} language="html" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should render Python code', () => {
      const pythonCode = 'def hello():\n    print("Hello")'
      render(<SyntaxHighlighter code={pythonCode} language="python" />)

      expect(screen.getByText(/def/)).toBeInTheDocument()
    })

    it('should render Bash code', () => {
      const bashCode = 'echo "Hello World"\nls -la'
      render(<SyntaxHighlighter code={bashCode} language="bash" />)

      expect(screen.getByText(/echo/)).toBeInTheDocument()
    })

    it('should fallback to plaintext for unknown languages', () => {
      const code = 'some random text'
      render(<SyntaxHighlighter code={code} language="unknown-lang" />)

      expect(screen.getByText(/some random text/)).toBeInTheDocument()
    })
  })

  describe('Line Highlighting', () => {
    it('should highlight specified lines', () => {
      render(
        <SyntaxHighlighter
          code={sampleTypeScript}
          language="typescript"
          highlightLines={[1, 3]}
        />
      )

      const highlightedLines = screen.getAllByTestId('highlighted-line')
      expect(highlightedLines.length).toBe(2)
    })

    it('should apply amber highlight styling to highlighted lines', () => {
      render(
        <SyntaxHighlighter
          code={sampleTypeScript}
          language="typescript"
          highlightLines={[1]}
        />
      )

      const highlightedLine = screen.getByTestId('highlighted-line')
      expect(highlightedLine).toHaveClass('bg-amber-900/30')
    })
  })

  describe('Scrolling and Container', () => {
    it('should apply maxHeight when provided', () => {
      render(
        <SyntaxHighlighter
          code={sampleTypeScript}
          language="typescript"
          maxHeight="400px"
        />
      )

      const container = screen.getByTestId('syntax-highlighter')
      expect(container).toHaveStyle({ maxHeight: '400px' })
    })

    it('should be scrollable with overflow-auto', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const container = screen.getByTestId('syntax-highlighter')
      expect(container).toHaveClass('overflow-auto')
    })

    it('should use monospace font', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const codeElement = screen.getByTestId('code-content')
      expect(codeElement).toHaveClass('font-mono')
    })

    it('should use text-sm font size', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      const codeElement = screen.getByTestId('code-content')
      expect(codeElement).toHaveClass('text-sm')
    })
  })

  describe('Truncation Notice', () => {
    it('should show truncation notice when isTruncated is true', () => {
      render(
        <SyntaxHighlighter
          code={sampleTypeScript}
          language="typescript"
          isTruncated={true}
        />
      )

      expect(screen.getByTestId('truncation-notice')).toBeInTheDocument()
      expect(screen.getByText(/truncated/i)).toBeInTheDocument()
    })

    it('should not show truncation notice by default', () => {
      render(<SyntaxHighlighter code={sampleTypeScript} language="typescript" />)

      expect(screen.queryByTestId('truncation-notice')).not.toBeInTheDocument()
    })

    it('should not show truncation notice when isTruncated is false', () => {
      render(
        <SyntaxHighlighter
          code={sampleTypeScript}
          language="typescript"
          isTruncated={false}
        />
      )

      expect(screen.queryByTestId('truncation-notice')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty code', () => {
      render(<SyntaxHighlighter code="" language="typescript" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should handle code with only whitespace', () => {
      render(<SyntaxHighlighter code="   \n   " language="typescript" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should handle very long lines', () => {
      const longLine = 'const x = ' + 'a'.repeat(500)
      render(<SyntaxHighlighter code={longLine} language="javascript" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should handle special characters in code', () => {
      const code = '<script>alert("XSS")</script>'
      render(<SyntaxHighlighter code={code} language="html" />)

      // Should render without executing script
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should preserve whitespace and indentation', () => {
      const indentedCode = '  const x = 1;\n    const y = 2;'
      render(<SyntaxHighlighter code={indentedCode} language="javascript" />)

      const codeContent = screen.getByTestId('code-content')
      expect(codeContent).toHaveClass('whitespace-pre')
    })
  })

  describe('Language Aliases', () => {
    it('should support tsx as typescript variant', () => {
      const tsxCode = 'const App = () => <div>Hello</div>'
      render(<SyntaxHighlighter code={tsxCode} language="tsx" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should support jsx as javascript variant', () => {
      const jsxCode = 'const App = () => <div>Hello</div>'
      render(<SyntaxHighlighter code={jsxCode} language="jsx" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should support markdown language', () => {
      const mdCode = '# Header\n\n- List item'
      render(<SyntaxHighlighter code={mdCode} language="markdown" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should support go language', () => {
      const goCode = 'func main() {\n    fmt.Println("Hello")\n}'
      render(<SyntaxHighlighter code={goCode} language="go" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should support rust language', () => {
      const rustCode = 'fn main() {\n    println!("Hello");\n}'
      render(<SyntaxHighlighter code={rustCode} language="rust" />)

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })
  })

  describe('XSS Prevention', () => {
    it('should sanitize script tags in code', () => {
      const malicious = '<script>alert("XSS")</script>'
      render(<SyntaxHighlighter code={malicious} language="html" />)

      // Script tag should not exist in DOM
      expect(document.querySelector('script')).toBeNull()
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })

    it('should sanitize event handlers in code', () => {
      const malicious = '<img src=x onerror=alert(1)>'
      render(<SyntaxHighlighter code={malicious} language="html" />)

      // img tag with onerror should not exist
      expect(document.querySelector('img')).toBeNull()
    })

    it('should sanitize onclick handlers in code', () => {
      const malicious = '<div onclick="alert(1)">click me</div>'
      render(<SyntaxHighlighter code={malicious} language="html" />)

      // div with onclick should not exist
      expect(document.querySelector('div[onclick]')).toBeNull()
    })

    it('should handle code containing HTML-like strings safely', () => {
      const code = 'const x = "<script>alert(1)</script>"'
      render(<SyntaxHighlighter code={code} language="javascript" />)

      expect(document.querySelector('script')).toBeNull()
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
    })
  })
})

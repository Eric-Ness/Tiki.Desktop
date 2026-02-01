import { useMemo } from 'react'
import * as Prism from 'prismjs'
import DOMPurify from 'dompurify'

// Import core languages
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-bash'

export interface SyntaxHighlighterProps {
  code: string
  language: string
  lineNumbers?: boolean
  startLine?: number
  highlightLines?: number[]
  maxHeight?: string
  isTruncated?: boolean
}

// Map language aliases to Prism language keys
const languageMap: Record<string, string> = {
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  css: 'css',
  html: 'markup',
  markup: 'markup',
  xml: 'markup',
  markdown: 'markdown',
  md: 'markdown',
  python: 'python',
  py: 'python',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  rs: 'rust',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash'
}

function getPrismLanguage(language: string): string {
  const normalized = language.toLowerCase()
  return languageMap[normalized] || 'plaintext'
}

function highlightCode(code: string, language: string): string {
  const prismLang = getPrismLanguage(language)
  const grammar = Prism.languages[prismLang]

  if (grammar) {
    return Prism.highlight(code, grammar, prismLang)
  }

  // Fallback: escape HTML and return as-is
  return escapeHtml(code)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// DOMPurify configuration: only allow Prism's span-based output
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['span'],
  ALLOWED_ATTR: ['class']
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}

export function SyntaxHighlighter({
  code,
  language,
  lineNumbers = true,
  startLine = 1,
  highlightLines = [],
  maxHeight,
  isTruncated = false
}: SyntaxHighlighterProps) {
  const lines = useMemo(() => code.split('\n'), [code])

  const highlightedLines = useMemo(() => {
    return lines.map((line) => highlightCode(line, language))
  }, [lines, language])

  const highlightedLineSet = useMemo(() => new Set(highlightLines), [highlightLines])

  return (
    <div
      data-testid="syntax-highlighter"
      className="bg-slate-900 rounded overflow-auto"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="flex">
        {/* Line numbers column */}
        {lineNumbers && (
          <div
            data-testid="line-number-column"
            className="flex-shrink-0 text-slate-500 border-r border-slate-700 select-none"
          >
            {lines.map((_, index) => {
              const lineNum = startLine + index
              return (
                <div
                  key={index}
                  data-testid="line-number"
                  className="px-3 text-right text-xs leading-6"
                >
                  {lineNum}
                </div>
              )
            })}
          </div>
        )}

        {/* Code content */}
        <div
          data-testid="code-content"
          className="flex-1 font-mono text-sm whitespace-pre overflow-x-auto"
        >
          {highlightedLines.map((htmlLine, index) => {
            const lineNum = startLine + index
            const isHighlighted = highlightedLineSet.has(lineNum)

            return (
              <div
                key={index}
                data-testid={isHighlighted ? 'highlighted-line' : undefined}
                className={`px-4 leading-6 ${isHighlighted ? 'bg-amber-900/30' : ''}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlLine) || '&nbsp;' }}
              />
            )
          })}
        </div>
      </div>

      {/* Truncation notice */}
      {isTruncated && (
        <div
          data-testid="truncation-notice"
          className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-slate-400 text-sm text-center"
        >
          Content truncated - file is too large to display in full
        </div>
      )}
    </div>
  )
}

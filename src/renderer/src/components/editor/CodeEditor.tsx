/**
 * CodeEditor Component
 *
 * Wrapper around Monaco Editor that:
 * - Syncs with editor store state
 * - Handles keyboard shortcuts (Ctrl+S to save)
 * - Applies custom theme
 * - Tracks cursor and scroll position
 */

import { useRef, useCallback, useEffect } from 'react'
import Editor, { OnMount, OnChange, Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEditorStore, selectActiveFile } from '../../stores/editor-store'

// Monaco theme definition matching Tiki.Desktop
const TIKI_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'type', foreground: 'ffa657' }
  ],
  colors: {
    'editor.background': '#0f0f0f',
    'editor.foreground': '#e2e8f0',
    'editor.lineHighlightBackground': '#1a1a1a',
    'editor.selectionBackground': '#f59e0b33',
    'editor.inactiveSelectionBackground': '#f59e0b1a',
    'editorCursor.foreground': '#f59e0b',
    'editorLineNumber.foreground': '#4a5568',
    'editorLineNumber.activeForeground': '#94a3b8',
    'editor.selectionHighlightBackground': '#f59e0b1a',
    'editorIndentGuide.background': '#2d2d2d',
    'editorIndentGuide.activeBackground': '#3d3d3d',
    'editorBracketMatch.background': '#f59e0b22',
    'editorBracketMatch.border': '#f59e0b44',
    'scrollbarSlider.background': '#ffffff15',
    'scrollbarSlider.hoverBackground': '#ffffff25',
    'scrollbarSlider.activeBackground': '#ffffff35'
  }
}

export function CodeEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  // Store state
  const activeFile = useEditorStore(selectActiveFile)
  const updateFileContent = useEditorStore((state) => state.updateFileContent)
  const updateCursorPosition = useEditorStore((state) => state.updateCursorPosition)
  const updateScrollPosition = useEditorStore((state) => state.updateScrollPosition)
  const saveFile = useEditorStore((state) => state.saveFile)

  /**
   * Handle editor mount.
   */
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // Define and apply custom theme
      monaco.editor.defineTheme('tiki-dark', TIKI_DARK_THEME)
      monaco.editor.setTheme('tiki-dark')

      // Configure editor options
      editor.updateOptions({
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: {
          enabled: true,
          maxColumn: 80,
          renderCharacters: false
        },
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'off',
        automaticLayout: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 8, bottom: 8 },
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true
        }
      })

      // Register save command (Ctrl+S)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const fileId = useEditorStore.getState().activeFileId
        if (fileId) {
          saveFile(fileId)
        }
      })

      // Track cursor position changes
      editor.onDidChangeCursorPosition((e) => {
        const fileId = useEditorStore.getState().activeFileId
        if (fileId) {
          updateCursorPosition(fileId, e.position.lineNumber, e.position.column)
        }
      })

      // Track scroll position changes
      editor.onDidScrollChange((e) => {
        const fileId = useEditorStore.getState().activeFileId
        if (fileId) {
          updateScrollPosition(fileId, e.scrollTop, e.scrollLeft)
        }
      })
    },
    [saveFile, updateCursorPosition, updateScrollPosition]
  )

  /**
   * Handle content changes.
   */
  const handleChange: OnChange = useCallback(
    (value) => {
      if (activeFile && value !== undefined) {
        updateFileContent(activeFile.id, value)
      }
    },
    [activeFile, updateFileContent]
  )

  /**
   * Restore cursor and scroll position when switching files.
   */
  useEffect(() => {
    if (editorRef.current && activeFile) {
      const editor = editorRef.current

      // Restore cursor position
      editor.setPosition({
        lineNumber: activeFile.cursorPosition.lineNumber,
        column: activeFile.cursorPosition.column
      })

      // Restore scroll position
      editor.setScrollPosition({
        scrollTop: activeFile.scrollPosition.scrollTop,
        scrollLeft: activeFile.scrollPosition.scrollLeft
      })

      // Focus the editor
      editor.focus()
    }
  }, [activeFile?.id])

  // No file open
  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-slate-500">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">📝</div>
          <p className="text-lg mb-2">No file open</p>
          <p className="text-sm">Double-click a file in the explorer to open it</p>
          <p className="text-xs mt-4 text-slate-600">
            Or press{' '}
            <kbd className="px-1.5 py-0.5 bg-background-secondary rounded border border-border text-[10px]">
              Ctrl+P
            </kbd>{' '}
            to quick open
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="tiki-dark"
        loading={
          <div className="h-full flex items-center justify-center bg-background text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading editor...</span>
            </div>
          </div>
        }
        options={{
          readOnly: false
        }}
      />
    </div>
  )
}

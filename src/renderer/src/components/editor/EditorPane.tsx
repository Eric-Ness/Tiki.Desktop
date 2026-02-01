/**
 * EditorPane Component
 *
 * Main container for the code editor area.
 * Combines tabs, breadcrumb, and Monaco editor.
 */

import { EditorTabs } from './EditorTabs'
import { EditorBreadcrumb } from './EditorBreadcrumb'
import { CodeEditor } from './CodeEditor'
import { useEditorStore, selectActiveFile } from '../../stores/editor-store'
import { useTikiStore } from '../../stores/tiki-store'

export function EditorPane() {
  const activeFile = useEditorStore(selectActiveFile)
  const activeProject = useTikiStore((state) => state.activeProject)
  const developmentState = useTikiStore((state) => state.developmentState)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Editor tabs */}
      <EditorTabs />

      {/* Breadcrumb (only when file is open and setting enabled) */}
      {activeFile && developmentState.showBreadcrumbs && (
        <EditorBreadcrumb filePath={activeFile.path} projectPath={activeProject?.path} />
      )}

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <CodeEditor />
      </div>
    </div>
  )
}

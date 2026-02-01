# Revised Plan: Greenfield Project Creation in Tiki Desktop

## Executive Summary

After deep analysis of the codebase, I've identified critical constraints that reshape our approach:

1. **Desktop cannot fully initialize Tiki** - The `.tiki/` structure must be created by the CLI
2. **Phase 2 (Deep Questioning) cannot be automated** - It requires real Claude conversation
3. **Current UX has silent failures** - No feedback when `.tiki/` is missing
4. **File watcher is conditional** - Only activates if `.tiki/` exists

This plan addresses these constraints with a pragmatic, phased approach.

---

## Critical Constraints

### What Desktop CAN Do
- Pick folders and manage project list
- Detect folder state (empty, has code, has .tiki/)
- Create terminals and send commands
- Watch for file creation in `.tiki/`
- Create releases (and the releases directory)
- Display progress based on file watching

### What Desktop CANNOT Do
- Create full `.tiki/` directory structure
- Run Claude conversation (Phase 2) natively
- Skip the conversational deep questioning phase
- Parse Claude's streaming output reliably for phase detection

### Key Insight
**The CLI's `/tiki:new-project` Phase 2 (Deep Questioning) is conversational and irreplaceable.** Any Desktop solution must either:
- A) Delegate to terminal for this phase, OR
- B) Skip it entirely via templates with pre-defined project configs

---

## Revised Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROJECT CREATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐    │
│  │ Add Project  │────▶│   Analyze    │────▶│   Decision Dialog    │    │
│  │   Button     │     │    Folder    │     │                      │    │
│  └──────────────┘     └──────────────┘     │  ○ Has .tiki/ → Add  │    │
│                                            │  ○ Empty → Init      │    │
│                                            │  ○ Has code → Map    │    │
│                                            └──────────┬───────────┘    │
│                                                       │                 │
│                    ┌──────────────────────────────────┼─────────┐      │
│                    │                                  │         │      │
│                    ▼                                  ▼         ▼      │
│  ┌─────────────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │   Template Quickstart   │  │  Full CLI Flow  │  │  Just Add It  │  │
│  │   (Skip Phase 2)        │  │  (Terminal)     │  │  (No Init)    │  │
│  └───────────┬─────────────┘  └────────┬────────┘  └───────────────┘  │
│              │                         │                               │
│              ▼                         ▼                               │
│  ┌─────────────────────┐    ┌─────────────────────┐                   │
│  │  Template Selector  │    │  Enhanced Terminal  │                   │
│  │  + Config Form      │    │  Shell with Progress│                   │
│  └──────────┬──────────┘    └──────────┬──────────┘                   │
│             │                          │                               │
│             ▼                          ▼                               │
│  ┌─────────────────────────────────────────────────┐                  │
│  │              File Watcher Monitors              │                  │
│  │         .tiki/ directory for artifacts          │                  │
│  └─────────────────────────────────────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Smart Project Detection (Week 1)
**Goal:** Fix silent failures and add intelligent folder analysis

### Phase 2: Enhanced Terminal Shell (Week 2)
**Goal:** Provide visual progress when running `/tiki:new-project` in terminal

### Phase 3: Template Quickstart (Weeks 3-4)
**Goal:** Enable instant project creation with pre-defined templates

### Phase 4: Polish & Integration (Week 5)
**Goal:** Onboarding, empty states, and UX refinements

---

## Phase 1: Smart Project Detection

### 1.1 New IPC Handler: `projects:analyze-folder`

**File:** `src/main/ipc/projects.ts`

```typescript
interface FolderAnalysis {
  path: string
  name: string
  state: 'empty' | 'has-code' | 'has-tiki' | 'has-tiki-partial'
  details: {
    isEmpty: boolean
    hasTiki: boolean
    hasTikiState: boolean      // .tiki/state/current.json exists
    hasTikiConfig: boolean     // .tiki/config.json exists
    hasProjectMd: boolean      // PROJECT.md exists
    hasGit: boolean
    hasCode: boolean
    codeFileCount: number
    manifestFiles: string[]    // package.json, requirements.txt, etc.
    detectedStack: string[]    // ['node', 'typescript', 'react']
  }
  recommendations: {
    primary: 'add' | 'init-full' | 'init-template' | 'map-first'
    reason: string
    alternatives: Array<{
      action: string
      label: string
      description: string
    }>
  }
}

ipcMain.handle('projects:analyze-folder', async (_, { path }: { path: string }): Promise<FolderAnalysis> => {
  const analysis: FolderAnalysis = {
    path,
    name: basename(path),
    state: 'empty',
    details: {
      isEmpty: false,
      hasTiki: false,
      hasTikiState: false,
      hasTikiConfig: false,
      hasProjectMd: false,
      hasGit: false,
      hasCode: false,
      codeFileCount: 0,
      manifestFiles: [],
      detectedStack: []
    },
    recommendations: {
      primary: 'init-full',
      reason: '',
      alternatives: []
    }
  }

  // Check directory contents
  const entries = await readdir(path).catch(() => [])
  analysis.details.isEmpty = entries.length === 0 ||
    entries.every(e => e.startsWith('.') && e !== '.git' && e !== '.tiki')

  // Check for .tiki directory
  const tikiPath = join(path, '.tiki')
  analysis.details.hasTiki = existsSync(tikiPath)
  if (analysis.details.hasTiki) {
    analysis.details.hasTikiState = existsSync(join(tikiPath, 'state', 'current.json'))
    analysis.details.hasTikiConfig = existsSync(join(tikiPath, 'config.json'))
  }

  // Check for PROJECT.md
  analysis.details.hasProjectMd = existsSync(join(path, 'PROJECT.md'))

  // Check for git
  analysis.details.hasGit = existsSync(join(path, '.git'))

  // Detect manifest files and stack
  const manifestChecks = [
    { file: 'package.json', stack: ['node'] },
    { file: 'tsconfig.json', stack: ['typescript'] },
    { file: 'requirements.txt', stack: ['python'] },
    { file: 'pyproject.toml', stack: ['python'] },
    { file: 'go.mod', stack: ['go'] },
    { file: 'Cargo.toml', stack: ['rust'] },
    { file: 'pom.xml', stack: ['java', 'maven'] },
    { file: 'build.gradle', stack: ['java', 'gradle'] }
  ]

  for (const check of manifestChecks) {
    if (existsSync(join(path, check.file))) {
      analysis.details.manifestFiles.push(check.file)
      analysis.details.detectedStack.push(...check.stack)
    }
  }

  // Detect framework-specific files
  if (existsSync(join(path, 'package.json'))) {
    try {
      const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.react) analysis.details.detectedStack.push('react')
      if (deps.vue) analysis.details.detectedStack.push('vue')
      if (deps.angular) analysis.details.detectedStack.push('angular')
      if (deps.electron) analysis.details.detectedStack.push('electron')
      if (deps.next) analysis.details.detectedStack.push('nextjs')
      if (deps.express) analysis.details.detectedStack.push('express')
      if (deps.fastify) analysis.details.detectedStack.push('fastify')
    } catch {}
  }

  // Dedupe stack
  analysis.details.detectedStack = [...new Set(analysis.details.detectedStack)]

  // Count code files (quick heuristic - check for src/ or common patterns)
  const codePatterns = ['src', 'lib', 'app', 'pages', 'components']
  for (const pattern of codePatterns) {
    if (existsSync(join(path, pattern))) {
      analysis.details.hasCode = true
      break
    }
  }
  if (!analysis.details.hasCode && analysis.details.manifestFiles.length > 0) {
    analysis.details.hasCode = true
  }

  // Determine state
  if (analysis.details.hasTiki && analysis.details.hasTikiState) {
    analysis.state = 'has-tiki'
  } else if (analysis.details.hasTiki) {
    analysis.state = 'has-tiki-partial'
  } else if (analysis.details.isEmpty) {
    analysis.state = 'empty'
  } else {
    analysis.state = 'has-code'
  }

  // Generate recommendations
  switch (analysis.state) {
    case 'has-tiki':
      analysis.recommendations = {
        primary: 'add',
        reason: 'This folder is already a Tiki project',
        alternatives: []
      }
      break

    case 'has-tiki-partial':
      analysis.recommendations = {
        primary: 'add',
        reason: 'This folder has a partial Tiki setup. Adding it will let you complete initialization.',
        alternatives: [
          {
            action: 'init-full',
            label: 'Re-initialize',
            description: 'Start fresh with /tiki:new-project'
          }
        ]
      }
      break

    case 'empty':
      analysis.recommendations = {
        primary: 'init-template',
        reason: 'This is an empty folder. Start with a template for the fastest setup.',
        alternatives: [
          {
            action: 'init-full',
            label: 'Full Setup',
            description: 'Use /tiki:new-project for guided project definition'
          },
          {
            action: 'add',
            label: 'Just Add',
            description: 'Add without initialization (you can initialize later)'
          }
        ]
      }
      break

    case 'has-code':
      const hasMapping = existsSync(join(path, '.tiki', 'STACK.md'))
      if (hasMapping) {
        analysis.recommendations = {
          primary: 'init-full',
          reason: 'This codebase is mapped. Ready for project initialization.',
          alternatives: [
            {
              action: 'init-template',
              label: 'Use Template',
              description: 'Apply a template to this existing code'
            },
            {
              action: 'add',
              label: 'Just Add',
              description: 'Add without further initialization'
            }
          ]
        }
      } else {
        analysis.recommendations = {
          primary: 'map-first',
          reason: 'This folder has code. Map the codebase first so Tiki understands it.',
          alternatives: [
            {
              action: 'init-full',
              label: 'Skip Mapping',
              description: 'Go straight to /tiki:new-project'
            },
            {
              action: 'add',
              label: 'Just Add',
              description: 'Add without any initialization'
            }
          ]
        }
      }
      break
  }

  return analysis
})
```

### 1.2 Folder Analysis Dialog Component

**File:** `src/renderer/src/components/projects/FolderAnalysisDialog.tsx`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { FolderIcon, CheckCircleIcon, AlertCircleIcon, CodeIcon, FileTextIcon } from 'lucide-react'

interface FolderAnalysis {
  path: string
  name: string
  state: 'empty' | 'has-code' | 'has-tiki' | 'has-tiki-partial'
  details: {
    isEmpty: boolean
    hasTiki: boolean
    hasTikiState: boolean
    hasTikiConfig: boolean
    hasProjectMd: boolean
    hasGit: boolean
    hasCode: boolean
    codeFileCount: number
    manifestFiles: string[]
    detectedStack: string[]
  }
  recommendations: {
    primary: 'add' | 'init-full' | 'init-template' | 'map-first'
    reason: string
    alternatives: Array<{
      action: string
      label: string
      description: string
    }>
  }
}

interface Props {
  isOpen: boolean
  analysis: FolderAnalysis | null
  onClose: () => void
  onAction: (action: 'add' | 'init-full' | 'init-template' | 'map-first') => void
}

export function FolderAnalysisDialog({ isOpen, analysis, onClose, onAction }: Props) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  // Reset selection when dialog opens with new analysis
  useEffect(() => {
    if (analysis) {
      setSelectedAction(analysis.recommendations.primary)
    }
  }, [analysis])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Enter' && selectedAction) {
        e.preventDefault()
        onAction(selectedAction as any)
      }
    },
    [onClose, onAction, selectedAction]
  )

  if (!isOpen || !analysis) return null

  const stateIcons = {
    'empty': <FolderIcon className="w-6 h-6 text-slate-400" />,
    'has-code': <CodeIcon className="w-6 h-6 text-blue-400" />,
    'has-tiki': <CheckCircleIcon className="w-6 h-6 text-green-400" />,
    'has-tiki-partial': <AlertCircleIcon className="w-6 h-6 text-amber-400" />
  }

  const stateLabels = {
    'empty': 'Empty Folder',
    'has-code': 'Existing Codebase',
    'has-tiki': 'Tiki Project',
    'has-tiki-partial': 'Partial Tiki Setup'
  }

  const actionLabels = {
    'add': 'Add Project',
    'init-full': 'Initialize with /tiki:new-project',
    'init-template': 'Quick Start with Template',
    'map-first': 'Map Codebase First'
  }

  const actionDescriptions = {
    'add': 'Add to project list without initialization',
    'init-full': 'Full guided setup with deep questioning',
    'init-template': 'Choose a template for instant setup',
    'map-first': 'Analyze existing code before initialization'
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-medium text-slate-100">Add Project</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Folder info */}
          <div className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg">
            {stateIcons[analysis.state]}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100 truncate">{analysis.name}</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                  {stateLabels[analysis.state]}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{analysis.path}</p>
            </div>
          </div>

          {/* Detection details */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 rounded ${analysis.details.hasGit ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
              <span className="block font-medium">Git</span>
              <span>{analysis.details.hasGit ? 'Initialized' : 'Not found'}</span>
            </div>
            <div className={`p-2 rounded ${analysis.details.hasTiki ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
              <span className="block font-medium">.tiki/</span>
              <span>{analysis.details.hasTiki ? (analysis.details.hasTikiState ? 'Complete' : 'Partial') : 'Not found'}</span>
            </div>
            <div className={`p-2 rounded ${analysis.details.hasProjectMd ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
              <span className="block font-medium">PROJECT.md</span>
              <span>{analysis.details.hasProjectMd ? 'Found' : 'Not found'}</span>
            </div>
          </div>

          {/* Detected stack */}
          {analysis.details.detectedStack.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Detected:</span>
              {analysis.details.detectedStack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded">
            <p className="text-sm text-slate-200">{analysis.recommendations.reason}</p>
          </div>

          {/* Action options */}
          <div className="space-y-2">
            {/* Primary action */}
            <button
              onClick={() => setSelectedAction(analysis.recommendations.primary)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedAction === analysis.recommendations.primary
                  ? 'border-amber-500 bg-amber-900/20'
                  : 'border-border hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">
                  {actionLabels[analysis.recommendations.primary]}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-600 text-white rounded">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {actionDescriptions[analysis.recommendations.primary]}
              </p>
            </button>

            {/* Alternative actions */}
            {analysis.recommendations.alternatives.map((alt) => (
              <button
                key={alt.action}
                onClick={() => setSelectedAction(alt.action)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedAction === alt.action
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-border hover:border-slate-500'
                }`}
              >
                <span className="font-medium text-slate-200">{alt.label}</span>
                <p className="text-xs text-slate-400 mt-1">{alt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-background">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedAction && onAction(selectedAction as any)}
            disabled={!selectedAction}
            className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 1.3 Modified ProjectList Component

**File:** `src/renderer/src/components/sidebar/ProjectList.tsx` (modifications)

```typescript
// Add state for analysis dialog
const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
const [currentAnalysis, setCurrentAnalysis] = useState<FolderAnalysis | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)

// Modified handleAddProject
const handleAddProject = async () => {
  // 1. Pick folder
  const folder = await window.tikiDesktop.projects.pickFolder()
  if (!folder) return

  // 2. Check if already in project list
  const existing = projects.find(p => p.path === folder.path)
  if (existing) {
    // Switch to existing project
    onProjectSwitch(existing)
    return
  }

  // 3. Analyze folder
  setIsAnalyzing(true)
  try {
    const analysis = await window.tikiDesktop.projects.analyzeFolder(folder.path)

    // If already a complete Tiki project, just add it
    if (analysis.state === 'has-tiki') {
      addProject(folder)
      onProjectSwitch(folder)
      return
    }

    // Otherwise, show analysis dialog
    setCurrentAnalysis(analysis)
    setAnalysisDialogOpen(true)
  } finally {
    setIsAnalyzing(false)
  }
}

// Handle analysis dialog action
const handleAnalysisAction = async (action: 'add' | 'init-full' | 'init-template' | 'map-first') => {
  if (!currentAnalysis) return

  const project = {
    id: `project-${Date.now()}`,
    name: currentAnalysis.name,
    path: currentAnalysis.path
  }

  // Close dialog first
  setAnalysisDialogOpen(false)

  // Add project to list
  addProject(project)
  onProjectSwitch(project)

  // Execute action
  switch (action) {
    case 'add':
      // Already added, nothing more to do
      break

    case 'init-full':
      // Open enhanced terminal shell with /tiki:new-project
      onOpenInitShell(project, 'full')
      break

    case 'init-template':
      // Open template selector
      onOpenTemplateSelector(project)
      break

    case 'map-first':
      // Open terminal with /tiki:map-codebase, then prompt for next step
      onOpenInitShell(project, 'map')
      break
  }

  setCurrentAnalysis(null)
}
```

### 1.4 Preload API Addition

**File:** `src/preload/index.ts` (addition to projects namespace)

```typescript
projects: {
  pickFolder: () => ipcRenderer.invoke('projects:pick-folder'),
  validatePath: (path: string) => ipcRenderer.invoke('projects:validate-path', { path }),
  switchProject: (path: string) => ipcRenderer.invoke('projects:switch', { path }),
  analyzeFolder: (path: string) => ipcRenderer.invoke('projects:analyze-folder', { path }), // NEW
  onSwitched: (callback: (data: { path: string }) => void) => {
    const handler = (_: IpcRendererEvent, data: { path: string }) => callback(data)
    ipcRenderer.on('projects:switched', handler)
    return () => ipcRenderer.removeListener('projects:switched', handler)
  }
}
```

---

## Phase 2: Enhanced Terminal Shell

### 2.1 New Project Init Shell Component

**File:** `src/renderer/src/components/projects/NewProjectInitShell.tsx`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircleIcon, CircleIcon, LoaderIcon, FileIcon, AlertCircleIcon } from 'lucide-react'
import { Terminal } from '../terminal/Terminal'

type InitMode = 'full' | 'map' | 'template-post'

interface Phase {
  id: string
  name: string
  status: 'pending' | 'active' | 'completed' | 'skipped'
  optional: boolean
}

interface Artifact {
  name: string
  path: string
  exists: boolean
  optional: boolean
}

interface Props {
  isOpen: boolean
  project: { id: string; name: string; path: string }
  mode: InitMode
  onClose: () => void
  onComplete: () => void
}

export function NewProjectInitShell({ isOpen, project, mode, onClose, onComplete }: Props) {
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phase tracking
  const [phases, setPhases] = useState<Phase[]>([])
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)

  // Artifact tracking
  const [artifacts, setArtifacts] = useState<Artifact[]>([])

  // Terminal output buffer for phase detection
  const outputBuffer = useRef('')

  // Initialize phases based on mode
  useEffect(() => {
    if (!isOpen) return

    if (mode === 'full') {
      setPhases([
        { id: 'setup', name: 'Setup', status: 'pending', optional: false },
        { id: 'questioning', name: 'Deep Questioning', status: 'pending', optional: false },
        { id: 'project-md', name: 'Generate PROJECT.md', status: 'pending', optional: false },
        { id: 'research', name: 'Research', status: 'pending', optional: true },
        { id: 'requirements', name: 'Requirements', status: 'pending', optional: false },
        { id: 'issues', name: 'GitHub Issues', status: 'pending', optional: true }
      ])
      setArtifacts([
        { name: 'PROJECT.md', path: 'PROJECT.md', exists: false, optional: false },
        { name: 'project-config.json', path: '.tiki/project-config.json', exists: false, optional: false },
        { name: 'requirements.json', path: '.tiki/requirements.json', exists: false, optional: false },
        { name: 'REQUIREMENTS.md', path: '.tiki/REQUIREMENTS.md', exists: false, optional: false },
        { name: 'STACK.md', path: '.tiki/research/project/STACK.md', exists: false, optional: true },
        { name: 'FEATURES.md', path: '.tiki/research/project/FEATURES.md', exists: false, optional: true }
      ])
    } else if (mode === 'map') {
      setPhases([
        { id: 'analysis', name: 'Codebase Analysis', status: 'pending', optional: false },
        { id: 'stack', name: 'Stack Detection', status: 'pending', optional: false },
        { id: 'documentation', name: 'Generate Docs', status: 'pending', optional: false }
      ])
      setArtifacts([
        { name: 'STACK.md', path: '.tiki/STACK.md', exists: false, optional: false },
        { name: 'ARCHITECTURE.md', path: '.tiki/ARCHITECTURE.md', exists: false, optional: true }
      ])
    }
  }, [isOpen, mode])

  // Create terminal and start command
  useEffect(() => {
    if (!isOpen || !project.path || isStarted) return

    const init = async () => {
      try {
        // Create terminal in project directory
        const id = await window.tikiDesktop.terminal.create(
          project.path,
          mode === 'full' ? 'New Project' : 'Map Codebase'
        )
        setTerminalId(id)
        setIsStarted(true)

        // Wait for terminal to initialize
        await new Promise(r => setTimeout(r, 500))

        // Send the appropriate command
        const command = mode === 'full'
          ? 'claude /tiki:new-project\n'
          : 'claude /tiki:map-codebase\n'

        window.tikiDesktop.terminal.write(id, command)

        // Mark first phase as active
        setCurrentPhase(phases[0]?.id || null)
        setPhases(prev => prev.map((p, i) =>
          i === 0 ? { ...p, status: 'active' } : p
        ))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start terminal')
      }
    }

    init()

    return () => {
      // Cleanup terminal on unmount (optional - may want to keep it)
    }
  }, [isOpen, project.path, mode, isStarted, phases])

  // Watch terminal output for phase detection
  useEffect(() => {
    if (!terminalId) return

    const unsubscribe = window.tikiDesktop.terminal.onData((id, data) => {
      if (id !== terminalId) return

      // Append to buffer
      outputBuffer.current += data

      // Phase detection patterns (heuristic - based on /tiki:new-project output)
      const phasePatterns: Record<string, RegExp[]> = {
        'questioning': [/What do you want to build\?/i, /Tell me about your/i],
        'project-md': [/Creating PROJECT\.md/i, /docs: initialize project/i],
        'research': [/Research the domain/i, /Spawning.*research.*agent/i],
        'requirements': [/Requirements Scoping/i, /Which.*features/i],
        'issues': [/Create GitHub issues/i, /gh issue create/i]
      }

      // Check for phase transitions
      for (const [phaseId, patterns] of Object.entries(phasePatterns)) {
        if (patterns.some(p => p.test(data))) {
          // Mark previous phases as completed
          setPhases(prev => prev.map(p => {
            if (p.id === phaseId) {
              return { ...p, status: 'active' }
            }
            if (p.status === 'active' && p.id !== phaseId) {
              return { ...p, status: 'completed' }
            }
            return p
          }))
          setCurrentPhase(phaseId)
        }
      }

      // Check for completion
      if (/## Project Initialized/i.test(data) || /Next Steps/i.test(data)) {
        setPhases(prev => prev.map(p =>
          p.status === 'active' ? { ...p, status: 'completed' } : p
        ))
        setIsComplete(true)
      }

      // Check for skip patterns
      if (/Skip research/i.test(data)) {
        setPhases(prev => prev.map(p =>
          p.id === 'research' ? { ...p, status: 'skipped' } : p
        ))
      }
      if (/Skip.*issues/i.test(data)) {
        setPhases(prev => prev.map(p =>
          p.id === 'issues' ? { ...p, status: 'skipped' } : p
        ))
      }
    })

    return unsubscribe
  }, [terminalId])

  // Watch for artifact creation
  useEffect(() => {
    if (!isOpen || !project.path) return

    const checkArtifacts = async () => {
      const updated = await Promise.all(
        artifacts.map(async (a) => {
          const fullPath = `${project.path}/${a.path}`
          const exists = await window.tikiDesktop.fs.exists(fullPath).catch(() => false)
          return { ...a, exists }
        })
      )

      // Only update if something changed
      const hasChanges = updated.some((a, i) => a.exists !== artifacts[i].exists)
      if (hasChanges) {
        setArtifacts(updated)
      }
    }

    // Check immediately and then periodically
    checkArtifacts()
    const interval = setInterval(checkArtifacts, 2000)

    return () => clearInterval(interval)
  }, [isOpen, project.path, artifacts])

  // Handle close
  const handleClose = useCallback(() => {
    if (isComplete) {
      onComplete()
    }
    onClose()
  }, [isComplete, onComplete, onClose])

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only allow escape if complete or error
      if (e.key === 'Escape' && (isComplete || error)) {
        e.preventDefault()
        handleClose()
      }
    },
    [isComplete, error, handleClose]
  )

  if (!isOpen) return null

  const completedArtifacts = artifacts.filter(a => a.exists).length
  const requiredArtifacts = artifacts.filter(a => !a.optional).length
  const completedRequired = artifacts.filter(a => !a.optional && a.exists).length

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-5xl h-[80vh] bg-background-secondary border border-border rounded-lg flex overflow-hidden">

        {/* Left sidebar: Progress */}
        <div className="w-56 border-r border-border flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-slate-100">
              {mode === 'full' ? 'New Project' : 'Map Codebase'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{project.name}</p>
          </div>

          {/* Phases */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-slate-500 uppercase mb-2">Progress</div>
            <div className="space-y-2">
              {phases.map((phase) => (
                <div key={phase.id} className="flex items-center gap-2">
                  {phase.status === 'completed' && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  {phase.status === 'active' && (
                    <LoaderIcon className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin" />
                  )}
                  {phase.status === 'pending' && (
                    <CircleIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  )}
                  {phase.status === 'skipped' && (
                    <CircleIcon className="w-4 h-4 text-slate-700 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      phase.status === 'active'
                        ? 'text-amber-400'
                        : phase.status === 'completed'
                        ? 'text-slate-300'
                        : phase.status === 'skipped'
                        ? 'text-slate-600 line-through'
                        : 'text-slate-500'
                    }`}
                  >
                    {phase.name}
                    {phase.optional && phase.status === 'pending' && (
                      <span className="text-[10px] text-slate-600 ml-1">(optional)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Artifacts */}
            <div className="mt-6">
              <div className="text-xs text-slate-500 uppercase mb-2">
                Artifacts ({completedArtifacts}/{artifacts.length})
              </div>
              <div className="space-y-1">
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.path}
                    className={`flex items-center gap-2 text-xs ${
                      artifact.exists ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    <FileIcon className={`w-3 h-3 ${artifact.exists ? 'text-green-500' : ''}`} />
                    <span className="truncate">{artifact.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {isComplete ? (
              <button
                onClick={handleClose}
                className="w-full py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
              >
                Done
              </button>
            ) : error ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircleIcon className="w-4 h-4" />
                  <span>Error occurred</span>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-2 text-sm border border-slate-600 text-slate-300 rounded hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                onClick={handleClose}
                className="w-full py-2 text-sm border border-slate-600 text-slate-400 rounded hover:text-slate-200 hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-1 flex flex-col">
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isComplete ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-xs text-slate-400">
                {isComplete
                  ? 'Completed'
                  : error
                  ? 'Error'
                  : currentPhase
                  ? `Running: ${phases.find(p => p.id === currentPhase)?.name}`
                  : 'Starting...'}
              </span>
            </div>
            <span className="text-xs text-slate-500">{project.path}</span>
          </div>

          {/* Terminal */}
          <div className="flex-1 min-h-0">
            {terminalId ? (
              <Terminal terminalId={terminalId} className="h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <LoaderIcon className="w-5 h-5 animate-spin mr-2" />
                Initializing terminal...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 2.2 Required IPC for Filesystem Check

**File:** `src/main/ipc/fs.ts` (new file)

```typescript
import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import { stat } from 'fs/promises'

export function registerFsHandlers(): void {
  ipcMain.handle('fs:exists', async (_, { path }: { path: string }) => {
    return existsSync(path)
  })

  ipcMain.handle('fs:stat', async (_, { path }: { path: string }) => {
    try {
      const stats = await stat(path)
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime.toISOString()
      }
    } catch {
      return { exists: false }
    }
  })
}
```

**File:** `src/preload/index.ts` (addition)

```typescript
fs: {
  exists: (path: string) => ipcRenderer.invoke('fs:exists', { path }),
  stat: (path: string) => ipcRenderer.invoke('fs:stat', { path })
}
```

---

## Phase 3: Template Quickstart

### 3.1 Template Data Structure

**File:** `src/shared/types/templates.ts`

```typescript
export interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string  // lucide icon name
  tags: string[]

  // What this template provides
  provides: {
    projectMd: boolean      // Generates PROJECT.md
    requirements: boolean   // Generates requirements.json
    scaffold: boolean       // Creates starter files
    gitInit: boolean        // Initializes git
  }

  // Variables user must fill in
  variables: TemplateVariable[]

  // File templates (Handlebars)
  files: {
    'PROJECT.md': string
    '.tiki/project-config.json': string
    '.tiki/requirements.json'?: string
    '.tiki/REQUIREMENTS.md'?: string
    '.tiki/config.json'?: string
    [key: string]: string | undefined  // Additional scaffold files
  }

  // Post-create commands (run in order)
  postCreate?: string[]
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'string' | 'boolean' | 'select' | 'multiselect'
  required: boolean
  default?: string | boolean | string[]
  options?: Array<{ value: string; label: string }>  // For select/multiselect
  placeholder?: string
  description?: string
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
  }
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  templates: ProjectTemplate[]
}
```

### 3.2 Built-in Templates

**File:** `src/main/services/builtin-templates.ts`

```typescript
import { ProjectTemplate, TemplateCategory } from '../../shared/types/templates'

export const BUILTIN_TEMPLATES: TemplateCategory[] = [
  {
    id: 'web',
    name: 'Web Applications',
    description: 'Frontend and full-stack web projects',
    templates: [
      {
        id: 'react-vite',
        name: 'React + Vite',
        description: 'Modern React app with Vite, TypeScript, and TailwindCSS',
        icon: 'Atom',
        tags: ['react', 'vite', 'typescript', 'tailwind', 'frontend'],
        provides: {
          projectMd: true,
          requirements: true,
          scaffold: false,  // User runs npm create vite
          gitInit: true
        },
        variables: [
          {
            name: 'projectName',
            label: 'Project Name',
            type: 'string',
            required: true,
            placeholder: 'my-react-app',
            validation: { pattern: '^[a-z][a-z0-9-]*$', minLength: 2, maxLength: 50 }
          },
          {
            name: 'description',
            label: 'Description',
            type: 'string',
            required: true,
            placeholder: 'A modern React application'
          },
          {
            name: 'styling',
            label: 'Styling Solution',
            type: 'select',
            required: true,
            default: 'tailwind',
            options: [
              { value: 'tailwind', label: 'TailwindCSS' },
              { value: 'css-modules', label: 'CSS Modules' },
              { value: 'styled-components', label: 'Styled Components' },
              { value: 'none', label: 'Plain CSS' }
            ]
          },
          {
            name: 'features',
            label: 'Include Features',
            type: 'multiselect',
            required: false,
            default: ['routing', 'state'],
            options: [
              { value: 'routing', label: 'React Router' },
              { value: 'state', label: 'State Management (Zustand)' },
              { value: 'forms', label: 'Form Handling (React Hook Form)' },
              { value: 'testing', label: 'Testing Setup (Vitest)' },
              { value: 'storybook', label: 'Storybook' }
            ]
          }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a modern, performant web application with excellent developer experience and user interface.

## Target Users
- End users of the web application
- Development team maintaining the codebase

## Technical Constraints
- Browser support: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- Performance: Initial load under 200KB, LCP under 2.5s
- Accessibility: WCAG 2.1 AA compliance

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 | Component-based UI with hooks |
| Build | Vite | Fast HMR, optimized production builds |
| Language | TypeScript | Type safety and better DX |
{{#if (eq styling 'tailwind')}}
| Styling | TailwindCSS | Utility-first, rapid prototyping |
{{/if}}
{{#if (eq styling 'styled-components')}}
| Styling | Styled Components | CSS-in-JS, component scoping |
{{/if}}
{{#if (includes features 'routing')}}
| Routing | React Router v6 | Declarative routing |
{{/if}}
{{#if (includes features 'state')}}
| State | Zustand | Lightweight, hooks-based state |
{{/if}}
{{#if (includes features 'testing')}}
| Testing | Vitest + Testing Library | Fast unit and component tests |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users need a responsive, mobile-friendly interface
- [ ] Fast page loads improve user engagement
{{#if (includes features 'routing')}}
- [ ] Multi-page navigation improves content organization
{{/if}}

### Out of Scope (for now)
- Server-side rendering
- Native mobile apps
- Offline support (PWA)
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "react-vite",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  },
  "technical": {
    "stack": {
      "framework": "react",
      "build": "vite",
      "language": "typescript",
      "styling": "{{styling}}"
    },
    "features": {{json features}}
  }
}`,
          '.tiki/config.json': `{
  "tdd": {
    "enabled": true,
    "framework": "vitest"
  },
  "execution": {
    "autoCommit": true,
    "requireTests": {{#if (includes features 'testing')}}true{{else}}false{{/if}}
  }
}`
        },
        postCreate: [
          'git init',
          'git add -A',
          'git commit -m "chore: initialize project from react-vite template"'
        ]
      },

      // More templates...
      {
        id: 'nextjs',
        name: 'Next.js App',
        description: 'Full-stack React with Next.js 14, App Router, and Server Components',
        icon: 'Triangle',
        tags: ['react', 'nextjs', 'typescript', 'fullstack', 'ssr'],
        provides: { projectMd: true, requirements: true, scaffold: false, gitInit: true },
        variables: [
          { name: 'projectName', label: 'Project Name', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'string', required: true },
          {
            name: 'database',
            label: 'Database',
            type: 'select',
            required: false,
            default: 'none',
            options: [
              { value: 'none', label: 'None (add later)' },
              { value: 'prisma-postgres', label: 'PostgreSQL (Prisma)' },
              { value: 'prisma-sqlite', label: 'SQLite (Prisma)' },
              { value: 'drizzle', label: 'Drizzle ORM' }
            ]
          },
          {
            name: 'auth',
            label: 'Authentication',
            type: 'select',
            required: false,
            default: 'none',
            options: [
              { value: 'none', label: 'None (add later)' },
              { value: 'nextauth', label: 'NextAuth.js' },
              { value: 'clerk', label: 'Clerk' }
            ]
          }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a production-ready full-stack web application with server-side rendering and API routes.

## Target Users
- End users accessing the application
- Developers extending functionality

## Technical Constraints
- Edge-compatible where possible
- SEO-friendly with SSR/SSG
- Type-safe from database to UI

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
{{#if (neq database 'none')}}
| Database | {{database}} |
{{/if}}
{{#if (neq auth 'none')}}
| Auth | {{auth}} |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users need fast, SEO-friendly page loads
- [ ] Server components reduce client bundle size
{{#if (neq auth 'none')}}
- [ ] Secure authentication is required for user data
{{/if}}

### Out of Scope
- Native mobile app
- Real-time features (WebSockets)
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "nextjs",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  }
}`
        },
        postCreate: ['git init', 'git add -A', 'git commit -m "chore: initialize project from nextjs template"']
      }
    ]
  },

  {
    id: 'desktop',
    name: 'Desktop Applications',
    description: 'Cross-platform desktop apps',
    templates: [
      {
        id: 'electron-react',
        name: 'Electron + React',
        description: 'Cross-platform desktop app with Electron, React, and TypeScript',
        icon: 'Monitor',
        tags: ['electron', 'react', 'typescript', 'desktop', 'cross-platform'],
        provides: { projectMd: true, requirements: true, scaffold: false, gitInit: true },
        variables: [
          { name: 'projectName', label: 'Project Name', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'string', required: true },
          {
            name: 'features',
            label: 'Include Features',
            type: 'multiselect',
            required: false,
            default: ['ipc', 'store'],
            options: [
              { value: 'ipc', label: 'IPC Communication Layer' },
              { value: 'store', label: 'Persistent Storage (electron-store)' },
              { value: 'auto-update', label: 'Auto Updates' },
              { value: 'tray', label: 'System Tray' },
              { value: 'notifications', label: 'Native Notifications' }
            ]
          }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a native-feeling desktop application that works across Windows, macOS, and Linux.

## Target Users
- Desktop users on Windows, macOS, and Linux
- Power users who prefer native applications

## Technical Constraints
- Must work offline
- Native OS integration (file system, notifications, tray)
- Reasonable memory footprint (< 200MB idle)
- Fast startup time (< 3s)

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Electron |
| UI | React + TypeScript |
| Build | electron-vite |
| Styling | TailwindCSS |
{{#if (includes features 'store')}}
| Storage | electron-store |
{{/if}}

## Architecture

\`\`\`
┌─────────────────────────────────────┐
│           Main Process              │
│  (Node.js - system access, IPC)     │
├─────────────────────────────────────┤
│           Preload Scripts           │
│  (Context bridge, secure IPC)       │
├─────────────────────────────────────┤
│          Renderer Process           │
│  (React UI, no direct Node access)  │
└─────────────────────────────────────┘
\`\`\`

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
{{#if (includes features 'ipc')}}
- [ ] IPC layer provides secure main-renderer communication
{{/if}}
{{#if (includes features 'store')}}
- [ ] Settings persist across app restarts
{{/if}}
{{#if (includes features 'auto-update')}}
- [ ] Users receive updates automatically
{{/if}}
- [ ] App launches quickly and feels responsive

### Out of Scope
- Mobile versions
- Web version
- Plugin system
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "electron-react",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  }
}`
        },
        postCreate: ['git init', 'git add -A', 'git commit -m "chore: initialize project from electron-react template"']
      }
    ]
  },

  {
    id: 'backend',
    name: 'Backend & APIs',
    description: 'API services and backend systems',
    templates: [
      {
        id: 'node-api',
        name: 'Node.js API',
        description: 'REST API with Express/Fastify, TypeScript, and Prisma',
        icon: 'Server',
        tags: ['node', 'api', 'typescript', 'rest', 'backend'],
        provides: { projectMd: true, requirements: true, scaffold: false, gitInit: true },
        variables: [
          { name: 'projectName', label: 'Project Name', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'string', required: true },
          {
            name: 'framework',
            label: 'Framework',
            type: 'select',
            required: true,
            default: 'fastify',
            options: [
              { value: 'fastify', label: 'Fastify (Recommended)' },
              { value: 'express', label: 'Express' },
              { value: 'hono', label: 'Hono' }
            ]
          },
          {
            name: 'database',
            label: 'Database',
            type: 'select',
            required: true,
            default: 'prisma-postgres',
            options: [
              { value: 'prisma-postgres', label: 'PostgreSQL (Prisma)' },
              { value: 'prisma-mysql', label: 'MySQL (Prisma)' },
              { value: 'drizzle-postgres', label: 'PostgreSQL (Drizzle)' },
              { value: 'mongodb', label: 'MongoDB' }
            ]
          },
          {
            name: 'features',
            label: 'Include Features',
            type: 'multiselect',
            required: false,
            default: ['validation', 'auth'],
            options: [
              { value: 'validation', label: 'Request Validation (Zod)' },
              { value: 'auth', label: 'JWT Authentication' },
              { value: 'swagger', label: 'OpenAPI/Swagger Docs' },
              { value: 'rate-limit', label: 'Rate Limiting' },
              { value: 'testing', label: 'Testing Setup' }
            ]
          }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a reliable, scalable API service with proper authentication, validation, and documentation.

## Target Users
- Frontend applications consuming the API
- Third-party integrations
- Mobile applications

## Technical Constraints
- Response time: p95 < 200ms
- Availability: 99.9% uptime target
- Security: OWASP Top 10 compliance

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 LTS |
| Framework | {{framework}} |
| Language | TypeScript |
| Database | {{database}} |
{{#if (includes features 'validation')}}
| Validation | Zod |
{{/if}}
{{#if (includes features 'auth')}}
| Auth | JWT |
{{/if}}
{{#if (includes features 'swagger')}}
| Docs | OpenAPI/Swagger |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] RESTful endpoints serve client needs
{{#if (includes features 'auth')}}
- [ ] JWT auth secures protected routes
{{/if}}
{{#if (includes features 'validation')}}
- [ ] Input validation prevents bad data
{{/if}}
{{#if (includes features 'swagger')}}
- [ ] API docs enable third-party integration
{{/if}}

### Out of Scope
- GraphQL
- WebSocket real-time features
- File uploads (S3)
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "node-api",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  }
}`
        },
        postCreate: ['git init', 'git add -A', 'git commit -m "chore: initialize project from node-api template"']
      }
    ]
  },

  {
    id: 'cli',
    name: 'CLI Tools',
    description: 'Command-line applications',
    templates: [
      {
        id: 'node-cli',
        name: 'Node.js CLI',
        description: 'Command-line tool with TypeScript, Commander, and Ink',
        icon: 'Terminal',
        tags: ['node', 'cli', 'typescript', 'terminal'],
        provides: { projectMd: true, requirements: true, scaffold: false, gitInit: true },
        variables: [
          { name: 'projectName', label: 'CLI Name', type: 'string', required: true, placeholder: 'my-cli' },
          { name: 'description', label: 'Description', type: 'string', required: true },
          { name: 'binName', label: 'Binary Name', type: 'string', required: true, placeholder: 'mycli' },
          {
            name: 'features',
            label: 'Include Features',
            type: 'multiselect',
            required: false,
            default: ['config', 'colors'],
            options: [
              { value: 'config', label: 'Config File Support' },
              { value: 'colors', label: 'Colored Output (chalk)' },
              { value: 'interactive', label: 'Interactive Prompts (inquirer)' },
              { value: 'progress', label: 'Progress Bars (ora)' },
              { value: 'ink', label: 'React-based UI (Ink)' }
            ]
          }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a developer-friendly command-line tool that's easy to install, use, and extend.

## Target Users
- Developers using the CLI in their workflow
- CI/CD pipelines
- Automation scripts

## Technical Constraints
- Single binary distribution via npm
- Works on Windows, macOS, Linux
- Startup time < 500ms
- No runtime dependencies

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Language | TypeScript |
| CLI Framework | Commander |
| Build | tsup (bundle to single file) |
{{#if (includes features 'colors')}}
| Output | chalk |
{{/if}}
{{#if (includes features 'interactive')}}
| Prompts | inquirer |
{{/if}}
{{#if (includes features 'ink')}}
| UI | Ink (React) |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users can install globally via npm
- [ ] Help text is clear and useful
{{#if (includes features 'config')}}
- [ ] Config file reduces repetitive flags
{{/if}}
{{#if (includes features 'interactive')}}
- [ ] Interactive mode improves UX
{{/if}}

### Out of Scope
- GUI version
- Web interface
- Plugin system
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "node-cli",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}",
    "binName": "{{binName}}"
  }
}`
        },
        postCreate: ['git init', 'git add -A', 'git commit -m "chore: initialize project from node-cli template"']
      }
    ]
  },

  {
    id: 'other',
    name: 'Other',
    description: 'Miscellaneous project types',
    templates: [
      {
        id: 'blank',
        name: 'Blank Project',
        description: 'Minimal setup - just PROJECT.md and .tiki config',
        icon: 'File',
        tags: ['minimal', 'custom'],
        provides: { projectMd: true, requirements: false, scaffold: false, gitInit: true },
        variables: [
          { name: 'projectName', label: 'Project Name', type: 'string', required: true },
          { name: 'description', label: 'Description', type: 'string', required: true }
        ],
        files: {
          'PROJECT.md': `# {{projectName}}

## Vision
{{description}}

## Core Problem
_Define the core problem this project solves_

## Target Users
_Who will use this?_

## Technical Constraints
_Any technical limitations or requirements_

## Tech Stack
_Technologies used_

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
_What you believe users need_

### Out of Scope
_What you're explicitly not building_
`,
          '.tiki/project-config.json': `{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "blank",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  }
}`
        },
        postCreate: ['git init', 'git add -A', 'git commit -m "chore: initialize project"']
      }
    ]
  }
]

export function getTemplateById(id: string): ProjectTemplate | undefined {
  for (const category of BUILTIN_TEMPLATES) {
    const template = category.templates.find(t => t.id === id)
    if (template) return template
  }
  return undefined
}

export function getAllTemplates(): ProjectTemplate[] {
  return BUILTIN_TEMPLATES.flatMap(c => c.templates)
}
```

### 3.3 Template Service

**File:** `src/main/services/template-service.ts`

```typescript
import Handlebars from 'handlebars'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { ProjectTemplate } from '../../shared/types/templates'
import { BUILTIN_TEMPLATES, getTemplateById } from './builtin-templates'

const execFileAsync = promisify(execFile)

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b)
Handlebars.registerHelper('neq', (a, b) => a !== b)
Handlebars.registerHelper('includes', (arr, value) => Array.isArray(arr) && arr.includes(value))
Handlebars.registerHelper('json', (obj) => JSON.stringify(obj))
Handlebars.registerHelper('now', () => new Date().toISOString())

export interface ApplyTemplateOptions {
  templateId: string
  targetPath: string
  variables: Record<string, any>
}

export interface ApplyTemplateResult {
  success: boolean
  error?: string
  filesCreated: string[]
  postCreateOutput?: string[]
}

export async function applyTemplate(options: ApplyTemplateOptions): Promise<ApplyTemplateResult> {
  const { templateId, targetPath, variables } = options
  const filesCreated: string[] = []
  const postCreateOutput: string[] = []

  // Get template
  const template = getTemplateById(templateId)
  if (!template) {
    return { success: false, error: `Template not found: ${templateId}`, filesCreated }
  }

  try {
    // Ensure target directory exists
    if (!existsSync(targetPath)) {
      await mkdir(targetPath, { recursive: true })
    }

    // Ensure .tiki directory exists
    const tikiPath = join(targetPath, '.tiki')
    if (!existsSync(tikiPath)) {
      await mkdir(tikiPath, { recursive: true })
    }

    // Add computed variables
    const allVariables = {
      ...variables,
      now: new Date().toISOString()
    }

    // Process each file template
    for (const [filePath, templateContent] of Object.entries(template.files)) {
      if (!templateContent) continue

      const fullPath = join(targetPath, filePath)

      // Ensure parent directory exists
      const parentDir = join(fullPath, '..')
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true })
      }

      // Compile and write
      const compiled = Handlebars.compile(templateContent)
      const content = compiled(allVariables)

      await writeFile(fullPath, content, 'utf-8')
      filesCreated.push(filePath)
    }

    // Run post-create commands
    if (template.postCreate && template.postCreate.length > 0) {
      for (const cmd of template.postCreate) {
        try {
          const [command, ...args] = cmd.split(' ')
          const { stdout, stderr } = await execFileAsync(command, args, { cwd: targetPath })
          postCreateOutput.push(`$ ${cmd}\n${stdout}${stderr}`)
        } catch (err: any) {
          // Log but don't fail - post-create commands are optional
          postCreateOutput.push(`$ ${cmd}\nError: ${err.message}`)
        }
      }
    }

    return { success: true, filesCreated, postCreateOutput }
  } catch (err: any) {
    return { success: false, error: err.message, filesCreated }
  }
}

export function getTemplateCategories(): typeof BUILTIN_TEMPLATES {
  return BUILTIN_TEMPLATES
}

export function validateTemplateVariables(
  template: ProjectTemplate,
  variables: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const varDef of template.variables) {
    const value = variables[varDef.name]

    // Check required
    if (varDef.required && (value === undefined || value === '' || value === null)) {
      errors.push(`${varDef.label} is required`)
      continue
    }

    // Skip validation if optional and empty
    if (!varDef.required && (value === undefined || value === '')) {
      continue
    }

    // Type-specific validation
    if (varDef.type === 'string' && typeof value === 'string') {
      if (varDef.validation) {
        if (varDef.validation.minLength && value.length < varDef.validation.minLength) {
          errors.push(`${varDef.label} must be at least ${varDef.validation.minLength} characters`)
        }
        if (varDef.validation.maxLength && value.length > varDef.validation.maxLength) {
          errors.push(`${varDef.label} must be at most ${varDef.validation.maxLength} characters`)
        }
        if (varDef.validation.pattern && !new RegExp(varDef.validation.pattern).test(value)) {
          errors.push(`${varDef.label} has invalid format`)
        }
      }
    }

    if (varDef.type === 'select' && varDef.options) {
      const validValues = varDef.options.map(o => o.value)
      if (!validValues.includes(value)) {
        errors.push(`${varDef.label} has invalid selection`)
      }
    }

    if (varDef.type === 'multiselect' && varDef.options) {
      if (!Array.isArray(value)) {
        errors.push(`${varDef.label} must be an array`)
      } else {
        const validValues = varDef.options.map(o => o.value)
        for (const v of value) {
          if (!validValues.includes(v)) {
            errors.push(`${varDef.label} contains invalid selection: ${v}`)
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

### 3.4 Template Selector Dialog

**File:** `src/renderer/src/components/projects/TemplateSelector.tsx`

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  SearchIcon, CheckIcon, ChevronRightIcon,
  AtomIcon, TriangleIcon, MonitorIcon, ServerIcon, TerminalIcon, FileIcon
} from 'lucide-react'

// Icon mapping
const ICONS: Record<string, React.ComponentType<any>> = {
  'Atom': AtomIcon,
  'Triangle': TriangleIcon,
  'Monitor': MonitorIcon,
  'Server': ServerIcon,
  'Terminal': TerminalIcon,
  'File': FileIcon
}

interface TemplateCategory {
  id: string
  name: string
  description: string
  templates: ProjectTemplate[]
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  tags: string[]
  variables: TemplateVariable[]
}

interface TemplateVariable {
  name: string
  label: string
  type: 'string' | 'boolean' | 'select' | 'multiselect'
  required: boolean
  default?: any
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  description?: string
}

interface Props {
  isOpen: boolean
  project: { id: string; name: string; path: string }
  onClose: () => void
  onApply: (templateId: string, variables: Record<string, any>) => void
}

export function TemplateSelector({ isOpen, project, onClose, onApply }: Props) {
  const [step, setStep] = useState<'browse' | 'configure'>('browse')
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isApplying, setIsApplying] = useState(false)

  // Load templates on mount
  useEffect(() => {
    if (!isOpen) return
    window.tikiDesktop.templates.getCategories().then(setCategories)
  }, [isOpen])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep('browse')
      setSelectedTemplate(null)
      setVariables({})
      setSearchQuery('')
      setSelectedCategory(null)
      setErrors([])
    }
  }, [isOpen])

  // Initialize variables when template is selected
  useEffect(() => {
    if (!selectedTemplate) return

    const defaults: Record<string, any> = {}
    for (const v of selectedTemplate.variables) {
      defaults[v.name] = v.default ?? (v.type === 'multiselect' ? [] : '')
    }
    // Pre-fill project name from folder
    if (defaults.projectName === '' || defaults.projectName === undefined) {
      defaults.projectName = project.name
    }
    setVariables(defaults)
  }, [selectedTemplate, project.name])

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery && !selectedCategory) {
      return categories
    }

    const query = searchQuery.toLowerCase()
    return categories.map(cat => ({
      ...cat,
      templates: cat.templates.filter(t => {
        const matchesCategory = !selectedCategory || cat.id === selectedCategory
        const matchesSearch = !searchQuery ||
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
        return matchesCategory && matchesSearch
      })
    })).filter(cat => cat.templates.length > 0)
  }, [categories, searchQuery, selectedCategory])

  // Validate and apply
  const handleApply = useCallback(async () => {
    if (!selectedTemplate) return

    // Validate
    const validation = await window.tikiDesktop.templates.validate(selectedTemplate.id, variables)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setIsApplying(true)
    setErrors([])

    try {
      await onApply(selectedTemplate.id, variables)
      onClose()
    } catch (err: any) {
      setErrors([err.message || 'Failed to apply template'])
    } finally {
      setIsApplying(false)
    }
  }, [selectedTemplate, variables, onApply, onClose])

  // Keyboard handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (step === 'configure') {
        setStep('browse')
        setSelectedTemplate(null)
      } else {
        onClose()
      }
    }
  }, [step, onClose])

  if (!isOpen) return null

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    categories.forEach(cat => cat.templates.forEach(t => t.tags.forEach(tag => tags.add(tag))))
    return Array.from(tags).sort()
  }, [categories])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-3xl h-[70vh] bg-background-secondary border border-border rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'configure' && (
              <button
                onClick={() => { setStep('browse'); setSelectedTemplate(null) }}
                className="text-slate-400 hover:text-slate-200 mr-2"
              >
                <ChevronRightIcon className="w-4 h-4 rotate-180" />
              </button>
            )}
            <h2 className="text-base font-medium text-slate-100">
              {step === 'browse' ? 'Choose a Template' : `Configure: ${selectedTemplate?.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'browse' ? (
          <>
            {/* Search and filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    !selectedCategory ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedCategory === cat.id ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredTemplates.map(category => (
                <div key={category.id} className="mb-6 last:mb-0">
                  <h3 className="text-xs text-slate-500 uppercase mb-2">{category.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {category.templates.map(template => {
                      const IconComponent = ICONS[template.icon] || FileIcon
                      return (
                        <button
                          key={template.id}
                          onClick={() => { setSelectedTemplate(template); setStep('configure') }}
                          className="text-left p-4 bg-background-tertiary border border-border rounded-lg hover:border-amber-500 transition-colors group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent className="w-6 h-6 text-slate-400 group-hover:text-amber-400 transition-colors" />
                            <span className="font-medium text-slate-100">{template.name}</span>
                          </div>
                          <p className="text-sm text-slate-400 mb-2 line-clamp-2">{template.description}</p>
                          <div className="flex gap-1 flex-wrap">
                            {template.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No templates match your search
                </div>
              )}
            </div>
          </>
        ) : selectedTemplate ? (
          <>
            {/* Configuration form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedTemplate.variables.map(variable => (
                <div key={variable.name}>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    {variable.label}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {variable.type === 'string' && (
                    <input
                      type="text"
                      value={variables[variable.name] || ''}
                      onChange={(e) => setVariables(prev => ({ ...prev, [variable.name]: e.target.value }))}
                      placeholder={variable.placeholder}
                      className="w-full px-3 py-2 bg-background-tertiary border border-border rounded text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 outline-none"
                    />
                  )}

                  {variable.type === 'boolean' && (
                    <button
                      onClick={() => setVariables(prev => ({ ...prev, [variable.name]: !prev[variable.name] }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        variables[variable.name] ? 'bg-amber-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          variables[variable.name] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  )}

                  {variable.type === 'select' && variable.options && (
                    <select
                      value={variables[variable.name] || ''}
                      onChange={(e) => setVariables(prev => ({ ...prev, [variable.name]: e.target.value }))}
                      className="w-full px-3 py-2 bg-background-tertiary border border-border rounded text-sm text-slate-200 focus:border-amber-500 outline-none"
                    >
                      {variable.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {variable.type === 'multiselect' && variable.options && (
                    <div className="space-y-1">
                      {variable.options.map(opt => {
                        const isSelected = (variables[variable.name] || []).includes(opt.value)
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-900/20' : 'hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setVariables(prev => {
                                  const current = prev[variable.name] || []
                                  const next = isSelected
                                    ? current.filter((v: string) => v !== opt.value)
                                    : [...current, opt.value]
                                  return { ...prev, [variable.name]: next }
                                })
                              }}
                              className="sr-only"
                            />
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-amber-600 border-amber-600' : 'border-slate-500'
                            }`}>
                              {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                            </span>
                            <span className="text-sm text-slate-200">{opt.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {variable.description && (
                    <p className="text-xs text-slate-500 mt-1">{variable.description}</p>
                  )}
                </div>
              ))}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-400">{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
              <span className="text-xs text-slate-500">
                Will create files in: {project.path}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('browse'); setSelectedTemplate(null) }}
                  className="px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100"
                >
                  Back
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded disabled:opacity-50"
                >
                  {isApplying ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
```

---

## Phase 4: Polish & Integration

### 4.1 Empty State Component

**File:** `src/renderer/src/components/projects/EmptyProjectState.tsx`

```typescript
import { FolderPlusIcon, SparklesIcon, TerminalIcon } from 'lucide-react'

interface Props {
  onAddProject: () => void
  onNewFromTemplate: () => void
  onNewWithCLI: () => void
}

export function EmptyProjectState({ onAddProject, onNewFromTemplate, onNewWithCLI }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        <FolderPlusIcon className="w-8 h-8 text-slate-500" />
      </div>

      <h2 className="text-xl font-medium text-slate-100 mb-2">No Projects Yet</h2>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        Add an existing project folder or create a new one to get started with Tiki Desktop.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onAddProject}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
        >
          <FolderPlusIcon className="w-5 h-5" />
          Add Existing Project
        </button>

        <button
          onClick={onNewFromTemplate}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
        >
          <SparklesIcon className="w-5 h-5" />
          New from Template
        </button>

        <button
          onClick={onNewWithCLI}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-lg transition-colors"
        >
          <TerminalIcon className="w-5 h-5" />
          New with /tiki:new-project
        </button>
      </div>

      <p className="text-xs text-slate-600 mt-8">
        Tip: You can also drag and drop a folder onto the sidebar to add it.
      </p>
    </div>
  )
}
```

### 4.2 Project Status Indicator

**File:** `src/renderer/src/components/sidebar/ProjectStatusBadge.tsx`

```typescript
import { CheckCircleIcon, AlertCircleIcon, CircleIcon } from 'lucide-react'

type ProjectStatus = 'ready' | 'partial' | 'uninitialized'

interface Props {
  status: ProjectStatus
  size?: 'sm' | 'md'
}

export function ProjectStatusBadge({ status, size = 'sm' }: Props) {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  switch (status) {
    case 'ready':
      return (
        <CheckCircleIcon
          className={`${sizeClasses} text-green-500`}
          title="Tiki project ready"
        />
      )
    case 'partial':
      return (
        <AlertCircleIcon
          className={`${sizeClasses} text-amber-500`}
          title="Partial Tiki setup - run /tiki:new-project to complete"
        />
      )
    case 'uninitialized':
      return (
        <CircleIcon
          className={`${sizeClasses} text-slate-500`}
          title="Not a Tiki project - click to initialize"
        />
      )
  }
}
```

---

## File Summary

### New Files to Create

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/main/ipc/projects.ts` (modify) | Add `analyzeFolder` handler | +80 |
| `src/main/ipc/fs.ts` | Filesystem helpers | ~30 |
| `src/main/services/builtin-templates.ts` | Template definitions | ~600 |
| `src/main/services/template-service.ts` | Template processing | ~150 |
| `src/shared/types/templates.ts` | Template type definitions | ~60 |
| `src/preload/index.ts` (modify) | Add new APIs | +30 |
| `src/renderer/.../FolderAnalysisDialog.tsx` | Folder analysis UI | ~250 |
| `src/renderer/.../NewProjectInitShell.tsx` | Terminal shell wrapper | ~350 |
| `src/renderer/.../TemplateSelector.tsx` | Template browser/config | ~400 |
| `src/renderer/.../EmptyProjectState.tsx` | Empty state UI | ~80 |
| `src/renderer/.../ProjectStatusBadge.tsx` | Status indicator | ~40 |
| `src/renderer/.../ProjectList.tsx` (modify) | Integration | +100 |

**Total: ~2,170 lines**

### Dependencies to Add

```json
{
  "dependencies": {
    "handlebars": "^4.7.8"
  }
}
```

---

## Testing Plan

### Phase 1 Tests
- [ ] Folder analysis correctly detects empty folders
- [ ] Folder analysis detects .tiki/ presence
- [ ] Folder analysis detects code files
- [ ] Folder analysis detects manifest files
- [ ] Recommendations are correct for each state

### Phase 2 Tests
- [ ] Terminal shell creates terminal correctly
- [ ] Progress indicators update on phase transitions
- [ ] Artifact indicators update when files are created
- [ ] Close/Cancel works correctly
- [ ] Complete state is detected

### Phase 3 Tests
- [ ] Templates load correctly
- [ ] Search filters templates
- [ ] Category filters work
- [ ] Variable validation works
- [ ] Template application creates correct files
- [ ] Handlebars helpers work (eq, includes, etc.)
- [ ] Post-create commands run

### Phase 4 Tests
- [ ] Empty state shows when no projects
- [ ] Project status badges are accurate
- [ ] Drag-and-drop works (if implemented)

---

## Migration Path

For existing users:
1. No breaking changes to existing projects
2. Projects added before this change will show "uninitialized" status if missing .tiki/
3. Users can re-add projects through the new flow to get proper initialization

---

## Future Enhancements

After this plan is implemented:

1. **Custom Templates** - Let users create/save their own templates
2. **Template Sharing** - GitHub-based template registry
3. **Project Import** - Import from GitHub URL directly
4. **Batch Operations** - Initialize multiple folders at once
5. **Project Health Check** - Periodic validation of project state

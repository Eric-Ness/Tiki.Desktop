# Revised Implementation Plan

## Executive Summary

This document provides a detailed, actionable implementation plan for greenfield project creation in Tiki Desktop, based on the research and analysis conducted.

---

## Timeline Overview

| Week | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| 1 | Phase 1 | Smart Detection | Folder analysis, recommendations dialog |
| 2 | Phase 2 | Terminal Shell | Progress tracking, artifact monitoring |
| 3-4 | Phase 3 | Templates | Gallery, configuration, 6 built-in templates |
| 5 | Phase 4 | Polish | Empty states, status badges, onboarding |

**Total: 5 weeks, ~2,170 lines of code**

---

## Phase 1: Smart Project Detection

### Goal
Fix silent failures and add intelligent folder analysis when adding projects.

### Deliverables

1. **IPC Handler:** `projects:analyze-folder`
2. **Component:** `FolderAnalysisDialog.tsx`
3. **Integration:** Modified `ProjectList.tsx`
4. **API:** Extended preload projects namespace

### File Changes

| File | Action | Lines |
|------|--------|-------|
| `src/main/ipc/projects.ts` | Modify | +80 |
| `src/preload/index.ts` | Modify | +5 |
| `src/renderer/src/components/projects/FolderAnalysisDialog.tsx` | Create | ~250 |
| `src/renderer/src/components/sidebar/ProjectList.tsx` | Modify | +50 |

### Implementation Steps

#### Step 1.1: Add Folder Analysis IPC Handler

**File:** `src/main/ipc/projects.ts`

Add after existing handlers:

```typescript
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'

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

ipcMain.handle('projects:analyze-folder', async (_, { path }: { path: string }): Promise<FolderAnalysis> => {
  // Implementation as specified in approach 1
  // See 05-implementation-approaches.md for full code
})
```

#### Step 1.2: Add Preload API

**File:** `src/preload/index.ts`

Add to projects namespace:

```typescript
projects: {
  // ... existing methods
  analyzeFolder: (path: string) => ipcRenderer.invoke('projects:analyze-folder', { path }),
}
```

#### Step 1.3: Create FolderAnalysisDialog Component

**File:** `src/renderer/src/components/projects/FolderAnalysisDialog.tsx`

Create new file with dialog component that:
- Displays folder analysis results
- Shows detection badges (Git, .tiki/, PROJECT.md)
- Lists detected stack
- Presents action options with recommendations
- Handles keyboard navigation

#### Step 1.4: Integrate into ProjectList

**File:** `src/renderer/src/components/sidebar/ProjectList.tsx`

Modify `handleAddProject`:

```typescript
const handleAddProject = async () => {
  const folder = await window.tikiDesktop.projects.pickFolder()
  if (!folder) return

  // Check if already in list
  if (projects.find(p => p.path === folder.path)) {
    onProjectSwitch(existing)
    return
  }

  // Analyze folder
  const analysis = await window.tikiDesktop.projects.analyzeFolder(folder.path)

  // If complete Tiki project, add directly
  if (analysis.state === 'has-tiki') {
    addProject(folder)
    onProjectSwitch(folder)
    return
  }

  // Show analysis dialog
  setCurrentAnalysis(analysis)
  setAnalysisDialogOpen(true)
}
```

### Testing Checklist

- [ ] Empty folder detected correctly
- [ ] Folder with code detected correctly
- [ ] Folder with .tiki/ detected correctly
- [ ] Partial .tiki/ detected correctly
- [ ] Stack detection works for Node, Python, Go, Rust
- [ ] Recommendations match folder state
- [ ] Dialog opens and closes correctly
- [ ] Actions trigger correct flows
- [ ] Keyboard navigation works

---

## Phase 2: Enhanced Terminal Shell

### Goal
Provide visual progress tracking when running `/tiki:new-project` in terminal.

### Deliverables

1. **Component:** `NewProjectInitShell.tsx`
2. **IPC Handler:** `fs:exists` (filesystem helper)
3. **Integration:** Connection from FolderAnalysisDialog actions

### File Changes

| File | Action | Lines |
|------|--------|-------|
| `src/main/ipc/fs.ts` | Create | ~30 |
| `src/main/index.ts` | Modify | +2 |
| `src/preload/index.ts` | Modify | +10 |
| `src/renderer/src/components/projects/NewProjectInitShell.tsx` | Create | ~350 |
| `src/renderer/src/components/sidebar/ProjectList.tsx` | Modify | +20 |

### Implementation Steps

#### Step 2.1: Add Filesystem IPC Handlers

**File:** `src/main/ipc/fs.ts`

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

#### Step 2.2: Register Handlers

**File:** `src/main/index.ts`

```typescript
import { registerFsHandlers } from './ipc/fs'

// In initialization:
registerFsHandlers()
```

#### Step 2.3: Add Preload API

**File:** `src/preload/index.ts`

```typescript
fs: {
  exists: (path: string) => ipcRenderer.invoke('fs:exists', { path }),
  stat: (path: string) => ipcRenderer.invoke('fs:stat', { path })
}
```

#### Step 2.4: Create NewProjectInitShell Component

**File:** `src/renderer/src/components/projects/NewProjectInitShell.tsx`

Component features:
- Split layout: progress sidebar + terminal
- Phase tracking with status indicators
- Artifact monitoring with file existence checks
- Phase detection from terminal output
- Completion detection
- Cancel/Done button handling

See `05-implementation-approaches.md` Approach 4 for full implementation.

#### Step 2.5: Connect to FolderAnalysisDialog

When user selects "init-full" or "map-first" action:

```typescript
const handleAnalysisAction = async (action: string) => {
  // ... add project ...

  if (action === 'init-full') {
    setInitShellOpen(true)
    setInitShellMode('full')
  } else if (action === 'map-first') {
    setInitShellOpen(true)
    setInitShellMode('map')
  }
}
```

### Testing Checklist

- [ ] Terminal creates and runs command
- [ ] Phase indicators update correctly
- [ ] Artifact indicators update when files created
- [ ] Completion detected correctly
- [ ] Cancel works (with confirmation)
- [ ] Done button appears on completion
- [ ] Phase detection handles edge cases
- [ ] Skip detection works (research, issues)

---

## Phase 3: Template Quickstart

### Goal
Enable instant project creation with pre-defined templates.

### Deliverables

1. **Types:** Template definitions
2. **Service:** Template processing with Handlebars
3. **Data:** 6 built-in templates
4. **Component:** `TemplateSelector.tsx`
5. **IPC Handlers:** Template operations

### File Changes

| File | Action | Lines |
|------|--------|-------|
| `src/shared/types/templates.ts` | Create | ~60 |
| `src/main/services/builtin-templates.ts` | Create | ~600 |
| `src/main/services/template-service.ts` | Create | ~200 |
| `src/main/ipc/templates.ts` | Create | ~80 |
| `src/main/index.ts` | Modify | +2 |
| `src/preload/index.ts` | Modify | +20 |
| `src/renderer/src/components/projects/TemplateSelector.tsx` | Create | ~400 |

### Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "handlebars": "^4.7.8"
  }
}
```

### Implementation Steps

#### Step 3.1: Define Template Types

**File:** `src/shared/types/templates.ts`

```typescript
export interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  tags: string[]
  provides: {
    projectMd: boolean
    requirements: boolean
    scaffold: boolean
    gitInit: boolean
  }
  variables: TemplateVariable[]
  files: Record<string, string>
  postCreate?: string[]
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'string' | 'boolean' | 'select' | 'multiselect'
  required: boolean
  default?: string | boolean | string[]
  options?: Array<{ value: string; label: string }>
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

#### Step 3.2: Create Built-in Templates

**File:** `src/main/services/builtin-templates.ts`

Define templates for:
1. React + Vite
2. Next.js
3. Electron + React
4. Node.js API
5. Node.js CLI
6. Blank Project

See `07-template-specifications.md` for full template definitions.

#### Step 3.3: Create Template Service

**File:** `src/main/services/template-service.ts`

```typescript
import Handlebars from 'handlebars'

// Register helpers
Handlebars.registerHelper('eq', (a, b) => a === b)
Handlebars.registerHelper('neq', (a, b) => a !== b)
Handlebars.registerHelper('includes', (arr, value) => Array.isArray(arr) && arr.includes(value))
Handlebars.registerHelper('json', (obj) => JSON.stringify(obj))
Handlebars.registerHelper('now', () => new Date().toISOString())

export async function applyTemplate(options: ApplyTemplateOptions): Promise<ApplyTemplateResult> {
  // Implementation
}

export function validateTemplateVariables(template, variables): ValidationResult {
  // Implementation
}
```

#### Step 3.4: Create Template IPC Handlers

**File:** `src/main/ipc/templates.ts`

```typescript
ipcMain.handle('templates:get-categories', async () => {
  return getTemplateCategories()
})

ipcMain.handle('templates:get-template', async (_, { id }) => {
  return getTemplateById(id)
})

ipcMain.handle('templates:validate', async (_, { templateId, variables }) => {
  const template = getTemplateById(templateId)
  return validateTemplateVariables(template, variables)
})

ipcMain.handle('templates:apply', async (_, { templateId, targetPath, variables }) => {
  return applyTemplate({ templateId, targetPath, variables })
})
```

#### Step 3.5: Add Preload API

**File:** `src/preload/index.ts`

```typescript
templates: {
  getCategories: () => ipcRenderer.invoke('templates:get-categories'),
  getTemplate: (id: string) => ipcRenderer.invoke('templates:get-template', { id }),
  validate: (templateId: string, variables: Record<string, any>) =>
    ipcRenderer.invoke('templates:validate', { templateId, variables }),
  apply: (templateId: string, targetPath: string, variables: Record<string, any>) =>
    ipcRenderer.invoke('templates:apply', { templateId, targetPath, variables })
}
```

#### Step 3.6: Create TemplateSelector Component

**File:** `src/renderer/src/components/projects/TemplateSelector.tsx`

Two-step dialog:
1. **Browse:** Template gallery with search and category filters
2. **Configure:** Variable form with validation

See `05-implementation-approaches.md` Approach 3 for full implementation.

#### Step 3.7: Connect to FolderAnalysisDialog

When user selects "init-template" action:

```typescript
if (action === 'init-template') {
  setTemplateSelectorOpen(true)
}
```

### Testing Checklist

- [ ] Templates load correctly
- [ ] Category filtering works
- [ ] Search filtering works
- [ ] Variable form renders correctly
- [ ] Required field validation works
- [ ] Pattern validation works
- [ ] Template application creates files
- [ ] Handlebars helpers work
- [ ] Post-create commands run
- [ ] Git initialization works
- [ ] Project added after creation

---

## Phase 4: Polish & Integration

### Goal
Complete the UX with empty states, status indicators, and onboarding.

### Deliverables

1. **Component:** `EmptyProjectState.tsx`
2. **Component:** `ProjectStatusBadge.tsx`
3. **Integration:** Status badges in ProjectList
4. **Integration:** Empty state in main content

### File Changes

| File | Action | Lines |
|------|--------|-------|
| `src/renderer/src/components/projects/EmptyProjectState.tsx` | Create | ~80 |
| `src/renderer/src/components/sidebar/ProjectStatusBadge.tsx` | Create | ~40 |
| `src/renderer/src/components/sidebar/ProjectList.tsx` | Modify | +30 |
| `src/renderer/src/App.tsx` | Modify | +20 |

### Implementation Steps

#### Step 4.1: Create EmptyProjectState Component

**File:** `src/renderer/src/components/projects/EmptyProjectState.tsx`

```typescript
export function EmptyProjectState({ onAddProject, onNewFromTemplate, onNewWithCLI }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Icon */}
      {/* Title and description */}
      {/* Three CTAs: Add, Template, CLI */}
      {/* Tip text */}
    </div>
  )
}
```

#### Step 4.2: Create ProjectStatusBadge Component

**File:** `src/renderer/src/components/sidebar/ProjectStatusBadge.tsx`

```typescript
type ProjectStatus = 'ready' | 'partial' | 'uninitialized'

export function ProjectStatusBadge({ status, size = 'sm' }) {
  // Return appropriate icon based on status
  // ready: green check
  // partial: amber warning
  // uninitialized: gray circle
}
```

#### Step 4.3: Add Status to Project List Items

**File:** `src/renderer/src/components/sidebar/ProjectList.tsx`

Track project status and display badges:

```typescript
const [projectStatuses, setProjectStatuses] = useState<Record<string, ProjectStatus>>({})

// Check status when projects change
useEffect(() => {
  const checkStatuses = async () => {
    const statuses: Record<string, ProjectStatus> = {}
    for (const project of projects) {
      const analysis = await window.tikiDesktop.projects.analyzeFolder(project.path)
      statuses[project.id] = analysis.state === 'has-tiki' ? 'ready' :
                            analysis.state === 'has-tiki-partial' ? 'partial' :
                            'uninitialized'
    }
    setProjectStatuses(statuses)
  }
  checkStatuses()
}, [projects])

// In render:
<ProjectStatusBadge status={projectStatuses[project.id]} />
```

#### Step 4.4: Add Empty State to App

**File:** `src/renderer/src/App.tsx`

Show empty state when no projects and no active project:

```typescript
{!activeProject && projects.length === 0 && (
  <EmptyProjectState
    onAddProject={handleAddProject}
    onNewFromTemplate={handleNewFromTemplate}
    onNewWithCLI={handleNewWithCLI}
  />
)}
```

### Testing Checklist

- [ ] Empty state shows when no projects
- [ ] CTAs in empty state work correctly
- [ ] Status badges display correctly
- [ ] Status updates when projects change
- [ ] Tooltip text is helpful
- [ ] Badge colors are correct

---

## Dependency Installation

Run before starting implementation:

```bash
npm install handlebars
npm install -D @types/handlebars
```

---

## Migration Notes

### For Existing Users

- No breaking changes to existing projects
- Projects added before this change will show status badges
- Status is determined by analyzing folder contents
- Users can re-add projects through new flow if desired

### For New Users

- First launch shows empty state with clear CTAs
- Can start with template, CLI, or add existing folder
- Guided experience reduces confusion

---

## Post-Implementation

### Documentation

- [ ] Update CLAUDE.md with new features
- [ ] Document template format for contributors
- [ ] Add troubleshooting section

### Future Enhancements

1. **Custom Templates** - Let users save their own templates
2. **Template Sharing** - GitHub-based template registry
3. **Project Import** - Import from GitHub URL
4. **Project Health Check** - Periodic validation
5. **Batch Operations** - Initialize multiple folders

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Phase detection breaks | Loose regex patterns, fallback to manual |
| Templates become outdated | Version pinning, update process |
| Terminal sync issues | Event-based updates, retry logic |
| IPC errors | Proper error handling, user feedback |

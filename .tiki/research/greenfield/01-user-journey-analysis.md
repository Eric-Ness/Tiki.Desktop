# User Journey Analysis

## Current State

### Adding a Project - Current Flow

```
User clicks "Add Project" button (ProjectList.tsx)
    │
    ▼
window.tikiDesktop.projects.pickFolder()
    │
    ▼
Electron dialog.showOpenDialog() opens folder picker
    │
    ▼
User selects folder
    │
    ▼
Project object created: { id: "project-${timestamp}", name, path }
    │
    ▼
addProject() stores in Zustand (persisted to localStorage)
    │
    ▼
Auto-switches to new project via onProjectSwitch()
    │
    ▼
handleProjectSwitch() in App.tsx:
  1. setActiveProject(project)
  2. setCwd(project.path)
  3. Clear tikiState, currentPlan, issues
  4. window.tikiDesktop.projects.switchProject(project.path)
    │
    ▼
Main process: projects:switch handler (projects.ts)
  1. stopWatching()
  2. startWatching(path)  ◄── CRITICAL POINT
  3. Send 'projects:switched' event
    │
    ▼
startWatching() in file-watcher.ts:
  - Checks if .tiki directory exists
  - If NO .tiki: logs "No .tiki directory found" and RETURNS
  - If YES .tiki: starts chokidar watching
    │
    ▼
useTikiSync hook receives 'projects:switched' event
    │
    ▼
loadInitialData() fetches:
  - getState()      → returns null if no .tiki
  - getReleases()   → returns [] if no .tiki
  - getQueue()      → returns [] if no .tiki
    │
    ▼
UI renders with empty/null state
```

### Key Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Add Project Button | `src/renderer/src/components/sidebar/ProjectList.tsx` | 14-25 |
| Project Switch Handler | `src/renderer/src/App.tsx` | 100-115 |
| IPC Switch Handler | `src/main/ipc/projects.ts` | 50-67 |
| File Watcher Start | `src/main/services/file-watcher.ts` | 198-214 |
| Tiki Sync Hook | `src/renderer/src/hooks/useTikiSync.ts` | 54-175 |

---

## Critical UX Gaps

### Gap 1: Silent Failure When .tiki Missing

**What happens:**
- User adds folder without `.tiki/`
- File watcher silently returns (line 212-214 in file-watcher.ts)
- No error notification to user
- App shows empty state but appears "working"

**User impact:**
- Confusing - app seems broken
- No indication that initialization is needed
- User doesn't know what to do next

**Evidence:**
```typescript
// file-watcher.ts lines 212-214
if (!existsSync(tikiPath)) {
  log.debug('No .tiki directory found at', tikiPath)
  return  // Silent return - no error thrown
}
```

### Gap 2: No Project State Indicator

**What happens:**
- Project added to list immediately
- Switch works (no error)
- But file watcher doesn't start
- Sidebar shows "No active execution" (correct but misleading)

**User impact:**
- Unclear if project is new/uninitialized or just idle
- No visual distinction between states
- Features that require `.tiki/` fail silently

### Gap 3: No Validation on Add

**What happens:**
- `projects:validate-path` IPC handler EXISTS (line 34-47 in projects.ts)
- But is NEVER called during "Add Project" flow
- ProjectList directly adds without validation
- Could add non-existent paths that fail on switch

**User impact:**
- Error only appears on project switch, not on add
- Can add invalid paths to project list
- Confusing error timing

**Evidence:**
```typescript
// projects.ts - handler exists but unused
ipcMain.handle('projects:validate-path', async (_, { path }) => {
  // This is never called by ProjectList
})
```

### Gap 4: No Onboarding for New Users

**What happens:**
- App launches with no projects
- Empty sidebar, no guidance
- No first-run experience
- No explanation of what Tiki is or how to start

**User impact:**
- New users confused about next steps
- No clear path to "Hello World"
- High friction first experience

### Gap 5: No Distinction Between Project Types

**What happens:**
- All projects look the same in sidebar
- Can't tell: Tiki project vs regular folder vs partial setup
- No status indicators

**User impact:**
- Can't quickly see which projects are "ready"
- No visual feedback about project health

---

## Data Structures

### Project Object

```typescript
// From tiki-store.ts line 5-9
interface Project {
  id: string              // e.g., "project-1735689234567"
  name: string            // folder name extracted from path
  path: string            // absolute folder path
}
```

### Persistence

```typescript
// tiki-store.ts lines 840-852
// Only these fields persist to localStorage as 'tiki-desktop-storage':
{
  projects: Project[]           // Full array
  activeProject: Project | null // Single project
  sidebarCollapsed: boolean
  detailPanelCollapsed: boolean
  activeTab: string
  recentCommands: string[]
  recentSearches: string[]
  terminalLayout: object
  focusedPaneId: string
}

// NOT persisted (reloaded from files):
// - tikiState
// - issues
// - releases
// - plans
```

---

## State Synchronization

### useTikiSync Hook Behavior

**When activeProject changes:**

1. If NO activeProject → clear all state
2. If activeProject exists:
   - Set up listeners for state/plan/queue/release changes
   - On "projects:switched" event → load initial data

**Initial Load Logic (lines 119-136):**
```typescript
// Sophisticated fallback if state.json is stale
if (state.json is stale BUT plan shows active execution) {
  // Derive state from plan data
  // Shows "(from plan)" indicator in sidebar
}
```

**Race Condition Risk:**
- Project added to store
- Auto-switched to project
- useTikiSync listener set up
- But `initialLoadDoneRef.current !== path` check relies on event timing
- If event fires before check is set, initial data might not load

---

## Terminal Integration

### Starting Claude Code (Sidebar.tsx lines 170-204)

**Requirements:**
- `cwd` must be set (requires activeProject)
- Creates new terminal tab
- Requires `.tiki/` directory for Tiki commands to work

**No validation before attempting startup.**

---

## Recommended Fixes

### Fix 1: Add Project Analysis Step

After folder selection, before adding:
1. Analyze folder contents
2. Check for `.tiki/`, `PROJECT.md`, code files
3. Show analysis dialog with recommendations
4. Let user choose action

### Fix 2: Visual State Indicators

Add status badges to project list items:
- 🟢 Ready (has complete `.tiki/`)
- 🟡 Partial (has `.tiki/` but missing state)
- ⚪ Uninitialized (no `.tiki/`)

### Fix 3: Call Validation

Use `projects:validate-path` during add flow:
```typescript
const validation = await window.tikiDesktop.projects.validatePath(folder.path)
if (!validation.valid) {
  showError(validation.error)
  return
}
```

### Fix 4: Empty State Onboarding

When no projects exist, show:
- Welcome message
- Clear CTAs: "Add Project", "New from Template", "New with CLI"
- Brief explanation of what each does

### Fix 5: Project Health Check

Periodically or on-demand:
- Verify `.tiki/` structure is complete
- Check for stale state
- Offer repair options

---

## User Journey - Proposed New Flow

```
User clicks "Add Project"
    │
    ▼
Folder picker opens
    │
    ▼
User selects folder
    │
    ▼
Analyze folder (NEW STEP):
  - Check for .tiki/
  - Check for code files
  - Check for PROJECT.md
  - Check for git
    │
    ├── Has complete .tiki/ ──────────────► Add directly (current behavior)
    │
    ├── Has partial .tiki/ ───────────────► Show dialog: "Complete setup?"
    │                                         - Yes → Open init shell
    │                                         - No → Add anyway
    │
    ├── Has code but no .tiki/ ───────────► Show dialog: "Initialize Tiki?"
    │                                         - Map codebase first (recommended)
    │                                         - Full /tiki:new-project
    │                                         - Just add (no init)
    │
    └── Empty folder ─────────────────────► Show dialog: "Start new project?"
                                             - Use template (recommended)
                                             - Full /tiki:new-project
                                             - Just add (no init)
```

---

## Appendix: File Locations

```
src/
├── main/
│   ├── ipc/
│   │   └── projects.ts          # IPC handlers for project operations
│   └── services/
│       └── file-watcher.ts      # File watching logic
├── renderer/
│   └── src/
│       ├── App.tsx              # Main app, project switch handling
│       ├── components/
│       │   └── sidebar/
│       │       └── ProjectList.tsx  # Project list UI
│       ├── hooks/
│       │   └── useTikiSync.ts   # State synchronization
│       └── stores/
│           └── tiki-store.ts    # Zustand store definition
└── preload/
    └── index.ts                 # IPC API exposure
```

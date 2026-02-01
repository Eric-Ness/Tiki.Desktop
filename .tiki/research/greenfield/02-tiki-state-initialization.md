# Tiki State Initialization Analysis

## Overview

This document analyzes how Tiki state is created, managed, and what the Desktop app can and cannot do regarding initialization.

---

## File Watcher Behavior

### Location
`src/main/services/file-watcher.ts`

### Key Finding: No Bootstrap Capability

The file watcher **does NOT create `.tiki/` directory** - it only watches if it exists.

```typescript
// Lines 212-214
if (!existsSync(tikiPath)) {
  log.debug('No .tiki directory found at', tikiPath)
  return  // Simply returns without error
}
```

**Implications:**
- No error thrown when `.tiki/` is missing
- Calling code doesn't know watching failed to start
- UI shows empty state with no explanation

### Watched Paths

When `.tiki/` exists, the watcher monitors:

```typescript
watcher = chokidar.watch([
  join(tikiPath, 'state', '*.json'),           // Execution state
  join(tikiPath, 'plans', 'issue-*.json'),     // Issue plans
  join(tikiPath, 'queue', 'pending.json'),     // Queue
  join(tikiPath, 'releases', '**.json'),       // Releases
  join(tikiPath, 'branches.json'),             // Branch associations
  join(tikiPath, 'checkpoints.json')           // Checkpoints
], {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 50,
    pollInterval: 10
  }
})
```

---

## IPC Handlers

### Location
`src/main/ipc/tiki.ts`

### Available Handlers

| Handler | Purpose | Can Create Files? |
|---------|---------|-------------------|
| `tiki:watch` | Start watching a path | No |
| `tiki:unwatch` | Stop watching | No |
| `tiki:get-state` | Read state.json | No (read-only) |
| `tiki:get-plan` | Read plan JSON | No (read-only) |
| `tiki:get-queue` | Read queue.json | No (read-only) |
| `tiki:get-releases` | Read release JSONs | No (read-only) |
| `tiki:create-release` | Create release | **Yes** (creates releases/ dir) |
| `tiki:update-release` | Update release | Yes (writes existing) |
| `tiki:delete-release` | Delete release | Yes (removes file) |
| `tiki:get-requirements` | Read requirements.json | No (read-only) |

### Critical Finding: No Init Handler

**There is no `tiki:bootstrap` or `tiki:init` handler.**

The only file creation capability is `tiki:create-release`, which:
```typescript
// Creates releases directory if needed
await mkdir(releasesPath, { recursive: true })
// Creates release JSON file
await writeFile(releaseFile, JSON.stringify(release, null, 2))
```

---

## .tiki/ Directory Structure

### Expected Structure

```
.tiki/
├── state/
│   └── current.json          # TikiState - activeIssue, status, phase
├── plans/
│   └── issue-N.json          # ExecutionPlan - phases, files, verification
├── queue/
│   └── pending.json          # Queue items for batch processing
├── releases/
│   └── v*.json               # Release tracking data
├── branches.json             # Branch-to-issue associations
├── checkpoints.json          # Checkpoint data for rollback
├── config.json               # Project Tiki configuration
├── requirements.json         # Requirements mapping (REQ-IDs)
├── REQUIREMENTS.md           # Human-readable requirements
├── STACK.md                  # Tech stack (from /tiki:map-codebase)
├── research/                 # Domain research artifacts
│   └── project/
│       ├── STACK.md
│       ├── FEATURES.md
│       ├── ARCHITECTURE.md
│       ├── PITFALLS.md
│       └── SUMMARY.md
├── prompts/                  # Tiki framework prompts (readonly)
├── schemas/                  # JSON schemas
├── hooks/                    # Lifecycle hook scripts
├── commands/                 # Custom slash commands
└── knowledge/                # Knowledge base entries
```

### What Desktop CAN Create

| Directory/File | Can Create? | How |
|----------------|-------------|-----|
| `.tiki/releases/` | **Yes** | Via `createRelease()` with `mkdir { recursive: true }` |
| `.tiki/releases/v*.json` | **Yes** | Via `createRelease()` |
| All others | **No** | Must use Tiki CLI |

### What Desktop CANNOT Create

| File | Created By | Notes |
|------|-----------|-------|
| `state/current.json` | Tiki CLI | Created during `/plan-issue` execution |
| `plans/issue-*.json` | Tiki CLI | Created during planning |
| `queue/pending.json` | Tiki CLI | Created by queue management |
| `branches.json` | Tiki CLI | Created by branch operations |
| `checkpoints.json` | Tiki CLI | Created during execution |
| `config.json` | Tiki CLI or manually | Could be created by Desktop |
| `requirements.json` | Tiki CLI | Created by `/tiki:new-project` |
| Parent `.tiki/` directory | Tiki CLI | Not created by Desktop |

---

## Project Selection Flow

### Sequence Diagram

```
User selects project in sidebar
         │
         ▼
┌─────────────────────────────────────┐
│  App.tsx: handleProjectSwitch()     │
│                                     │
│  1. setActiveProject(project)       │
│  2. setCwd(project.path)            │
│  3. setTikiState(null)              │
│  4. switchProject(path) ────────────┼──►  IPC call
└─────────────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────────────────────┐
                                    │  projects.ts: projects:switch       │
                                    │                                     │
                                    │  1. stopWatching()                  │
                                    │  2. startWatching(path) ◄── Key     │
                                    │  3. send('projects:switched')       │
                                    └─────────────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────────────────────┐
                                    │  file-watcher.ts: startWatching()   │
                                    │                                     │
                                    │  if (!existsSync(tikiPath)) {       │
                                    │    log.debug('No .tiki')            │
                                    │    return  ◄── Silent failure       │
                                    │  }                                  │
                                    │  // Otherwise start chokidar        │
                                    └─────────────────────────────────────┘
                                              │
                                              ▼
         ┌────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  useTikiSync: 'projects:switched'   │
│                                     │
│  loadInitialData():                 │
│    getState()    → null             │
│    getReleases() → []               │
│    getQueue()    → []               │
└─────────────────────────────────────┘
```

### What Happens Without .tiki

| Operation | Result |
|-----------|--------|
| File watcher start | Silent return (no error) |
| `getState()` | Returns `null` |
| `getPlan()` | Returns `null` |
| `getQueue()` | Returns `[]` |
| `getReleases()` | Returns `[]` |
| UI rendering | Shows empty state |
| User feedback | None - appears "working" |

---

## Desktop Capabilities Summary

### What Desktop CAN Do Without .tiki

| Capability | Works? | Notes |
|------------|--------|-------|
| Pick and manage projects | ✅ | Store in localStorage |
| View GitHub issues | ✅ | Via GitHub API |
| Open terminals | ✅ | In project directory |
| Create releases | ✅ | Creates `.tiki/releases/` |
| Show empty state UI | ✅ | Graceful degradation |
| Run slash commands | ✅ | Via terminal |

### What Desktop CANNOT Do Without .tiki

| Capability | Works? | Notes |
|------------|--------|-------|
| Display execution plans | ❌ | Needs `plans/` files |
| Track execution progress | ❌ | Needs `state/current.json` |
| Show queue items | ❌ | Needs `queue/pending.json` |
| Display checkpoints | ❌ | Needs `checkpoints.json` |
| Monitor state changes | ❌ | Watcher returns early |
| Show branch associations | ❌ | Needs `branches.json` |

---

## Initialization Responsibility

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tiki CLI                                │
│                                                             │
│  - Creates .tiki/ directory structure                       │
│  - Creates state/current.json                               │
│  - Creates plans/issue-*.json                               │
│  - Creates queue/pending.json                               │
│  - Manages execution lifecycle                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Creates files
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     .tiki/ directory                        │
│                                                             │
│  state/, plans/, queue/, releases/, etc.                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Watches for changes
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tiki Desktop                              │
│                                                             │
│  - Reads and displays state                                 │
│  - Reads and displays plans                                 │
│  - Manages releases (can create)                            │
│  - Provides terminal for CLI                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implication

**Desktop assumes `.tiki/` already exists** (created by Tiki CLI).

To fully initialize a new Tiki project from Desktop:
1. User must run a Tiki CLI command (e.g., `/tiki:new-project` or `/plan-issue`)
2. CLI creates the `.tiki/` directory structure
3. CLI creates `state/current.json` and initial plans
4. Desktop detects these via file watcher and syncs

---

## Potential Bootstrap Implementation

If we wanted Desktop to bootstrap `.tiki/`:

```typescript
// Hypothetical tiki:bootstrap handler
ipcMain.handle('tiki:bootstrap', async (_, { path }) => {
  const tikiPath = join(path, '.tiki')

  // Create directory structure
  await mkdir(join(tikiPath, 'state'), { recursive: true })
  await mkdir(join(tikiPath, 'plans'), { recursive: true })
  await mkdir(join(tikiPath, 'queue'), { recursive: true })
  await mkdir(join(tikiPath, 'releases'), { recursive: true })
  await mkdir(join(tikiPath, 'hooks'), { recursive: true })
  await mkdir(join(tikiPath, 'commands'), { recursive: true })
  await mkdir(join(tikiPath, 'knowledge'), { recursive: true })

  // Create minimal config
  const config = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    tdd: { enabled: true, framework: 'vitest' },
    execution: { autoCommit: true }
  }
  await writeFile(
    join(tikiPath, 'config.json'),
    JSON.stringify(config, null, 2)
  )

  // Create empty state
  const state = {
    activeIssue: null,
    currentPhase: null,
    status: 'idle',
    lastUpdated: new Date().toISOString()
  }
  await writeFile(
    join(tikiPath, 'state', 'current.json'),
    JSON.stringify(state, null, 2)
  )

  return { success: true }
})
```

**However:** This would only create an "empty" Tiki project. The real value comes from `/tiki:new-project` which:
- Conducts deep questioning
- Generates PROJECT.md
- Runs research agents
- Creates requirements
- Generates GitHub issues

---

## Recommendations

### Option A: Bootstrap via CLI (Recommended)

Desktop triggers CLI commands in terminal:
1. Smart detection identifies project state
2. If initialization needed, open terminal
3. Run `/tiki:new-project` or `/tiki:map-codebase`
4. Desktop watches for `.tiki/` creation
5. Once detected, enable full functionality

**Pros:** Leverages existing CLI, no duplication
**Cons:** Requires terminal interaction

### Option B: Minimal Desktop Bootstrap

Desktop creates bare minimum structure:
1. Create `.tiki/` directory
2. Create `config.json` with defaults
3. Create empty `state/current.json`
4. Let user run CLI for full setup

**Pros:** Gets file watcher working immediately
**Cons:** Incomplete setup, user still needs CLI

### Option C: Template-Based Bootstrap

Desktop applies templates that include:
1. Pre-filled `PROJECT.md`
2. Pre-filled `config.json`
3. Pre-filled `requirements.json`
4. Empty state structure

**Pros:** Full setup without conversation
**Cons:** Skips deep questioning phase

---

## File References

| File | Location |
|------|----------|
| File watcher | `src/main/services/file-watcher.ts` |
| IPC handlers | `src/main/ipc/tiki.ts` |
| Project handlers | `src/main/ipc/projects.ts` |
| Sync hook | `src/renderer/src/hooks/useTikiSync.ts` |
| App initialization | `src/renderer/src/App.tsx` |
| Store definitions | `src/renderer/src/stores/tiki-store.ts` |
| Preload API | `src/preload/index.ts` |

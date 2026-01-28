# Tiki Desktop - Research Notes

## Date: 2026-01-28

---

## Part 1: Tiki Framework Analysis

### What is Tiki?

Tiki is a GitHub-issue-centric workflow automation framework for Claude Code (v1.10.0). It solves the problem of large issues overflowing Claude's context windows by breaking them into small, executable phases.

### Core Innovation: Backward Planning

Instead of planning forward from an issue description, Tiki:
1. Extracts **success criteria** from the issue
2. Works **backward** from each criterion to identify required work
3. Groups work into **phases** respecting file/component boundaries
4. Verifies all criteria are covered in a **coverage matrix**

### Directory Structure (`.tiki/`)

```
.tiki/
├── config.json                    # Project settings
├── plans/
│   └── issue-N.json              # Phased execution plan
├── state/
│   └── current.json              # Active execution state
├── queue/
│   └── pending.json              # Discovered items (ADRs, findings)
├── releases/
│   ├── v1.0.json                 # Release definitions
│   └── archive/                  # Shipped releases
├── context/
│   └── issue-N-phase-M.json      # Saved context for resume
├── adr/                          # Architecture Decision Records
├── debug/                        # Debug session logs
├── knowledge/
│   ├── index.json
│   └── entries/                  # Institutional knowledge
├── research/                     # Domain research
├── schemas/                      # JSON Schema validation
├── prompts/                      # Conditional prompt loading (~100 files)
└── test/commands/                # 27 test files
```

### Command System (46 Commands)

All commands are Markdown prompt files with YAML frontmatter in `.claude/commands/tiki/`.

**Core Workflow:**
| Command | Purpose |
|---------|---------|
| `/tiki:yolo <N>` | Full automated pipeline |
| `/tiki:get-issue <N>` | Fetch GitHub issue |
| `/tiki:review-issue <N>` | Pre-planning safety check |
| `/tiki:plan-issue <N>` | Break into phases |
| `/tiki:audit-plan` | Validate plan (6 checks) |
| `/tiki:execute <N>` | Execute phases via sub-agents |
| `/tiki:ship` | Commit, push, close |

**Execution Control:**
| Command | Purpose |
|---------|---------|
| `/tiki:pause` | Save state mid-execution |
| `/tiki:resume` | Resume paused work |
| `/tiki:skip-phase` | Skip and continue |
| `/tiki:redo-phase` | Re-execute phase |
| `/tiki:heal` | Auto-diagnose failures |

**Release Management (9 commands):**
| Command | Purpose |
|---------|---------|
| `/tiki:release-new` | Create release |
| `/tiki:release-status` | Display progress |
| `/tiki:release-add/remove` | Manage issues |
| `/tiki:release-ship` | Tag and archive |
| `/tiki:release-sync` | Sync with GitHub milestones |
| `/tiki:release-yolo` | Automated release execution |

**Other Key Commands:**
- `/tiki:state` - Show current state
- `/tiki:whats-next` - Suggest next action
- `/tiki:pick-issue` - Recommend next issue
- `/tiki:add-issue` - Create GitHub issue
- `/tiki:knowledge` - Manage institutional knowledge
- `/tiki:research` - Domain research
- `/tiki:roadmap` - Visualize releases

### State Management

**Key State Files:**

1. **`current.json`** - Execution State
```json
{
  "activeIssue": 42,
  "currentPhase": 2,
  "status": "executing|paused|idle|failed",
  "completedPhases": [1],
  "lastActivity": "2026-01-21T10:40:00Z"
}
```

2. **`plans/issue-N.json`** - Execution Plan
```json
{
  "issue": { "number": 42, "title": "..." },
  "status": "planned|in_progress|completed",
  "successCriteria": [...],
  "phases": [
    {
      "number": 1,
      "title": "Phase title",
      "status": "pending|in_progress|completed|failed",
      "files": ["src/file.ts"],
      "verification": ["Check 1", "Check 2"],
      "addressesCriteria": ["functional-1"]
    }
  ],
  "coverageMatrix": {...}
}
```

### GitHub Integration

Uses `gh` CLI for all GitHub operations:
- Fetch/create/close issues
- Manage milestones
- Post comments
- Sync releases with milestones

### Execution Flow (YOLO Mode)

```
[1] Fetch Issue (gh issue view)
      ↓
[2] Review Issue (blocking concerns check)
      ↓
[3] Plan Issue (backward from success criteria)
      ↓
[4] Audit Plan (6 validation checks)
      ↓
[5] Execute Phases (sub-agents via Task tool)
      - TDD support (tests first)
      - Auto-fix (3-tier strategy)
      - Knowledge capture
      ↓
[6] Review Queue (discovered items)
      ↓
[7] Ship (commit, push, close)
```

### Configuration (`.tiki/config.json`)

```json
{
  "testing": {
    "createTests": "before|after|ask|never"
  },
  "autoFix": {
    "enabled": true,
    "maxAttempts": 3,
    "strategies": ["direct", "contextual-analysis", "approach-review"]
  },
  "knowledge": {
    "autoCapture": true,
    "captureOnShip": true
  },
  "workflow": {
    "showNextStepMenu": true
  }
}
```

---

## Part 2: Concept Image Analysis

### Image 1: 123234.png - Multi-Column Workflow View

**Layout:**
- **Left Panel**: Project Memory
  - Search functionality
  - Chat history items (Build, Fact, etc.)
  - Memory management interface

- **Center Panel**: Conversation
  - Message thread with timestamps
  - Input area at bottom
  - Status indicators

- **Right Panel**: Content Graph (n8n-style)
  - Connected workflow nodes
  - Status colors (orange=working, green=complete)
  - Node types: n8n-harness, Edit Data, test harness, CLAUDE
  - Shows execution flow and dependencies

**Key Observations:**
- Separates context/memory from conversation
- Visual workflow representation
- Tab-based navigation at top
- Project-level organization on left sidebar

---

### Image 2: 234345.png - Complex Multi-Panel IDE

**Layout (6+ panels):**
- **Top-left**: Terminals (Claude Code, multiple tabs)
- **Middle-left**: Browser/Web view (Google shown)
- **Bottom-left**: System Graph visualization
- **Center columns**:
  - Project Config (pipeline-system.md, CLAUDE.md, etc.)
  - Contact Tools (Claude Code)
  - Tasks (updated/created/context-extras.md)
  - Conversations (chat view)
  - Changes (file modifications)
- **Right**: Workflow diagram + code view

**Key Observations:**
- Multiple terminal instances
- Integrated web browser
- File/config management
- Task tracking with status
- Real-time change tracking
- Workflow visualization

---

### Image 3: 2144444.png - "Frame" Application

**Layout:**
- **Left Sidebar (narrow)**:
  - Project list (ClaudeCodeIDE, cli-ai-query, Framestail)
  - Connected directories
  - Project structure browser
  - "Start Claude Code" button

- **Center**: Multiple Terminal Tabs
  - Terminal 4, Terminal 5, etc.
  - Shows "Project Summary" output
  - Current Tasks table (In Progress, Pending)

- **Right Sidebar**: Tasks Panel
  - In Progress items with priority
  - Completed items
  - Task details with descriptions

**Task Display:**
```
In Progress (3):
ID    Title                Priority
task-02  Search in files      medium
task-01  Resizable sidebar    medium
task-keyboard  System prompt standardization  medium

Pending - High Priority (2):
task-04  Git status integration
```

**Key Observations:**
- Project-centric organization
- Multiple terminal management
- Task tracking with priority levels
- Clean, dark theme UI
- Directory/file browser integration

---

## Part 3: Desktop Application Requirements

### Core Features Needed

1. **Project Management**
   - Multiple project support
   - Project switching
   - Project-level configuration
   - Directory association

2. **Terminal Integration**
   - Multiple terminal instances
   - Claude Code execution
   - Terminal tab management
   - Output streaming

3. **Task/Phase Visualization**
   - Current execution status
   - Phase progress
   - Success criteria tracking
   - Priority display

4. **Workflow Diagram (n8n-style)**
   - Visual phase representation
   - Dependency arrows
   - Status colors (pending/in-progress/completed/failed)
   - Interactive node selection

5. **State Persistence**
   - Read `.tiki/state/current.json`
   - Read `.tiki/plans/issue-N.json`
   - Real-time updates

6. **GitHub Integration**
   - Issue list/detail view
   - Release/milestone tracking
   - Issue creation
   - Comment threading

7. **File Management**
   - Project file browser
   - Config editor
   - Markdown preview
   - JSON viewer/editor

8. **Knowledge/Memory**
   - Institutional knowledge entries
   - Search functionality
   - Context display

---

## Part 4: Technical Considerations

### Technology Options

**Electron-based:**
- Full Node.js access
- Native `gh` CLI integration
- Terminal emulation (xterm.js)
- Cross-platform
- Examples: VS Code, Frame (from image 3)

**Tauri-based:**
- Smaller bundle size
- Rust backend
- Web frontend (React, Vue, etc.)
- Better performance

**React Native Desktop:**
- Shared mobile codebase potential
- macOS/Windows support

### Component Libraries

**For Workflow Diagrams:**
- React Flow (n8n uses this)
- Rete.js
- Custom SVG/Canvas

**For Terminal:**
- xterm.js
- node-pty for process management

**For UI:**
- shadcn/ui
- Radix UI
- Tailwind CSS

### Integration Points

1. **Tiki State Files** → Real-time file watching
2. **Claude Code CLI** → Process spawning/management
3. **GitHub CLI** → Issue/PR operations
4. **Git** → Status, commits, branches

---

## Part 5: Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tiki Desktop                         │
├──────────────┬──────────────────┬──────────────────────┤
│   Sidebar    │   Main Content   │   Detail Panel       │
├──────────────┼──────────────────┼──────────────────────┤
│ - Projects   │ - Terminal(s)    │ - Task Details       │
│ - Files      │ - Conversation   │ - Phase Info         │
│ - Issues     │ - Workflow       │ - Verification       │
│ - Releases   │ - Config         │ - Knowledge          │
└──────────────┴──────────────────┴──────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Backend Services  │
              ├─────────────────────┤
              │ - File Watcher      │
              │ - Process Manager   │
              │ - GitHub Bridge     │
              │ - State Manager     │
              └─────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
      ┌──────────┐              ┌──────────┐
      │ .tiki/   │              │ gh CLI   │
      └──────────┘              └──────────┘
```

### View Modes

1. **Execution Mode**: Terminal + Phase Progress + Workflow
2. **Planning Mode**: Issue Details + Phase Editor + Coverage Matrix
3. **Review Mode**: Code Diff + Verification Checklist
4. **Release Mode**: Roadmap + Issue List + Progress

---

## Questions to Resolve

1. **Framework choice**: Electron vs Tauri? → **Resolved: Electron** (v0.1.0)
   - Chose Electron for full Node.js access and mature xterm.js/node-pty support
2. **Primary workflow**: Which mode is most important? → **Resolved: Execution Mode** (v0.2.0)
   - Terminal + State Overview + Status Bar is the core workflow
3. **Claude Code integration**: Embed or spawn? → **Resolved: Spawn** (v0.1.0)
   - Spawn Claude Code in terminal, interact via stdin/stdout
4. **Multi-project**: Tabs vs sidebar? → **Resolved: Sidebar** (v0.2.0)
   - Project switcher in sidebar, single active project at a time
5. **Collaboration**: Single user or team features? → **Deferred**
   - Single user for now, team features may come later

---

## Implementation Progress

### v0.1.0 - Foundation ✅ (Completed)

- Electron + React + TypeScript scaffolding with electron-vite
- Basic three-panel layout with react-resizable-panels
- Single terminal integration with xterm.js and node-pty
- File watching for `.tiki/` directory with chokidar
- Zustand store for state management
- Tailwind CSS styling with dark theme

### v0.2.0 - Core UI ✅ (Completed)

- **Issue #3**: Multi-terminal tab management
  - Keyboard shortcuts (Ctrl+T new, Ctrl+W close, Ctrl+Tab/Shift+Tab switch)
  - Inline tab renaming (double-click or edit icon)
  - Terminal status indicator (idle/running with colored dot)

- **Issue #5**: Sidebar with state overview
  - Collapsible sidebar with Ctrl+B toggle
  - StateOverview component showing active issue/phase
  - Phase progress visualization with colored bars
  - Smooth collapse animations

- **Issue #12**: Dark theme and visual polish
  - Consistent theme colors across all panels
  - Empty state patterns with helpful messages
  - Active state feedback on interactive elements
  - 150ms micro-interaction timing

- **Issue #15**: Status bar with execution info
  - Project name from cwd
  - Git branch display (via IPC to main process)
  - Execution status with issue/phase info

### v0.3.0 - Workflow Diagram ✅ (Completed)

- **Issue #6**: React Flow workflow diagram
  - WorkflowCanvas with React Flow, controls, minimap, dagre layout
  - Custom PhaseNode with 5 status states (pending, in_progress, completed, failed, skipped)
  - IssueNode (entry point) with GitHub icon, cyan styling
  - ShipNode (completion) with rocket icon, green/gray styling
  - DependencyEdge with animated dashed/solid styling
  - Auto-layout using dagre algorithm (TB direction)
  - Node selection updates selectedNode in store
  - 37 tests added

- **Issue #7**: Context-sensitive detail panel
  - PhaseDetail showing status, files, verification checklist, summary/error
  - IssueDetail showing title, body, labels, state badge
  - ShipDetail showing completion status
  - Collapsible with Ctrl+Shift+B keyboard shortcut
  - Smooth 150ms transitions between views
  - 62 tests added

### v0.4.0 - GitHub Integration ✅ (Completed)

- **Issue #8**: GitHub integration - Issue list and details
  - GitHub Bridge service using `gh` CLI via `execFile`
  - IPC handlers for `github:get-issues`, `github:get-issue`, `github:refresh`, `github:open-in-browser`
  - Preload API exposing GitHub methods to renderer
  - IssueList component in sidebar with loading/error/empty states
  - Plan indicator showing which issues have `.tiki/plans/issue-N.json`
  - IssueDetail component with GitHub-colored labels, state badge, "Open in GitHub" button
  - Auto-refresh on window focus with 30-second throttle
  - useGitHubSync hook for coordinating GitHub data

- **Issue #10**: Release and milestone visualization
  - Expanded Release type to match `.tiki/releases/*.json` structure
  - getReleases IPC handler to load all releases (active first, then by version)
  - ReleaseList component in sidebar with progress bars and status indicators
  - ReleaseDetail component showing version, status, issue progress, requirements coverage
  - Milestone link opens in browser via shell.openExternal
  - Selection priority: selectedRelease > selectedIssue > selectedNode

---

## Next Steps

1. ~~Define MVP feature set~~ ✅
2. ~~Choose technology stack~~ ✅
3. ~~Design UI/UX mockups~~ ✅
4. ~~Set up project scaffolding~~ ✅
5. ~~Implement core components~~ ✅ (Phase 1-2)
6. ~~Implement workflow diagram (React Flow)~~ ✅ (Phase 3)
7. ~~GitHub integration (issue list, details)~~ ✅ (Phase 4)
8. Full Tiki command integration - Phase 5


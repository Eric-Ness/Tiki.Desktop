# Tiki Desktop - Architecture Plan

## Overview

Tiki Desktop is an Electron-based desktop application that provides a visual interface for the Tiki workflow framework. It combines terminal management, workflow visualization, and GitHub integration into a unified development experience.

---

## Technology Stack

### Core
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Electron 28+ | Desktop shell, Node.js integration |
| Frontend | React 18 + TypeScript | UI components |
| Build | Vite | Fast builds, HMR |
| Styling | Tailwind CSS | Utility-first styling |
| Components | shadcn/ui | Polished, accessible components |

### Key Libraries
| Library | Purpose |
|---------|---------|
| React Flow | n8n-style workflow diagrams |
| xterm.js | Terminal emulation |
| node-pty | PTY process management |
| chokidar | File system watching |
| zustand | State management |
| react-resizable-panels | Resizable panel layouts |
| @tanstack/react-query | Data fetching/caching |
| cmdk | Command palette |

### Development
| Tool | Purpose |
|------|---------|
| electron-builder | Packaging/distribution |
| electron-vite | Vite integration for Electron |
| TypeScript | Type safety |
| ESLint + Prettier | Code quality |

---

## Application Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                    │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ File Watcher │  │ Process Mgr  │  │ GitHub Bridge        │  │
│  │ (chokidar)   │  │ (node-pty)   │  │ (gh CLI wrapper)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Tiki State   │  │ IPC Handler  │  │ Window Manager       │  │
│  │ Manager      │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │ IPC (contextBridge)
┌─────────────────────────────▼──────────────────────────────────┐
│                      Electron Renderer Process                  │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React Application                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Zustand     │  │ React Query │  │ React Flow      │  │   │
│  │  │ Store       │  │ Cache       │  │ Graph State     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                      Components                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │   │
│  │  │ Sidebar  │ │ Terminal │ │ Workflow │ │ Detail    │   │   │
│  │  │ Panel    │ │ Panel    │ │ Canvas   │ │ Panel     │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## UI Layout Design

Based on the reference images (123234.png, 234345.png), the layout follows a flexible multi-panel design:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Logo] Tiki Desktop    │ Project: MyApp ▼ │ ⚙ Settings │ 🔔 │ ─ □ ✕   │
├────────────────────────────────────────────────────────────────────────┬─┤
│ ┌─────────────────┐ ┌────────────────────────────────┐ ┌─────────────┐ │ │
│ │ SIDEBAR         │ │ MAIN CONTENT                   │ │ DETAIL      │ │ │
│ │                 │ │                                │ │ PANEL       │ │ │
│ │ 📁 Projects     │ │ ┌────────────────────────────┐ │ │             │ │ │
│ │   ▶ MyApp      │ │ │ Terminals  │ Workflow │ ... │ │ │ Phase 2     │ │ │
│ │   ▷ OtherProj  │ │ ├────────────────────────────┤ │ │ ─────────── │ │ │
│ │                 │ │ │                            │ │ │             │ │ │
│ │ 📋 Issues       │ │ │   [Terminal or Workflow    │ │ │ Status:     │ │ │
│ │   #42 Auth...  │ │ │    content displayed       │ │ │ ⚡ Running   │ │ │
│ │   #43 API...   │ │ │    based on active tab]    │ │ │             │ │ │
│ │                 │ │ │                            │ │ │ Files:      │ │ │
│ │ 📦 Releases     │ │ │                            │ │ │ • api.ts    │ │ │
│ │   v1.1 (active)│ │ │                            │ │ │ • routes.ts │ │ │
│ │   v1.0 ✓       │ │ │                            │ │ │             │ │ │
│ │                 │ │ │                            │ │ │ Verify:     │ │ │
│ │ 🧠 Knowledge    │ │ │                            │ │ │ ☐ Tests pass│ │ │
│ │                 │ │ │                            │ │ │ ☐ No errors │ │ │
│ │ 📊 State        │ │ └────────────────────────────┘ │ │             │ │ │
│ │   Issue: #42   │ │                                │ │             │ │ │
│ │   Phase: 2/5   │ │                                │ │             │ │ │
│ │   ⚡ Executing  │ │                                │ │             │ │ │
│ └─────────────────┘ └────────────────────────────────┘ └─────────────┘ │ │
├────────────────────────────────────────────────────────────────────────┴─┤
│ Status: Executing phase 2 of 5 for issue #42          │ CPU: 23% │ 2.1GB │
└──────────────────────────────────────────────────────────────────────────┘
```

### Panel Descriptions

**1. Sidebar (Left)**
- Project switcher
- Issue list (from GitHub)
- Release list
- Knowledge entries
- Current state summary
- Collapsible sections

**2. Main Content (Center)**
Tabbed interface with:
- **Terminals**: Multiple terminal instances
- **Workflow**: React Flow diagram of phases
- **Conversation**: Chat-like view of execution log
- **Config**: Editor for `.tiki/config.json`
- **Files**: Modified files during execution

**3. Detail Panel (Right)**
Context-sensitive panel showing:
- Phase details when node selected
- Issue details when issue selected
- Verification checklist
- Success criteria mapping
- Error details when failed

---

## Workflow Diagram Design

### Node Types

```typescript
type NodeType =
  | 'phase'        // Execution phase
  | 'criteria'     // Success criteria
  | 'issue'        // GitHub issue (entry point)
  | 'ship'         // Ship/completion node

interface PhaseNode {
  id: string;
  type: 'phase';
  data: {
    number: number;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    files: string[];
    verification: string[];
    dependencies: number[];
    summary?: string;
    error?: string;
  };
  position: { x: number; y: number };
}
```

### Visual States

| Status | Color | Border | Icon |
|--------|-------|--------|------|
| pending | gray-600 | dashed | ○ |
| in_progress | amber-500 | solid, animated | ⚡ |
| completed | green-500 | solid | ✓ |
| failed | red-500 | solid | ✗ |
| skipped | gray-400 | dotted | ⊘ |

### Layout Algorithm

Phases are auto-arranged using:
1. Dagre layout for dependency-based positioning
2. Success criteria nodes below their connected phases
3. Issue node at top, ship node at bottom

```
                    ┌─────────┐
                    │ Issue   │
                    │   #42   │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Phase 1 │    │ Phase 2 │    │ Phase 3 │
    │   ✓     │───▶│   ⚡    │    │   ○     │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         ▼              │              │
    ┌─────────┐         │              │
    │Criteria │         │              │
    │   1     │◀────────┴──────────────┘
    └─────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  Ship   │
                    └─────────┘
```

### Interactions

1. **Click node** → Show details in right panel
2. **Double-click phase** → Open terminal with phase context
3. **Right-click phase** → Context menu (skip, redo, etc.)
4. **Hover** → Show tooltip with quick info
5. **Zoom/pan** → Standard React Flow controls

---

## Terminal Management

### Architecture

```typescript
interface TerminalInstance {
  id: string;
  name: string;
  cwd: string;
  process: IPty;  // node-pty process
  terminal: Terminal;  // xterm.js instance
  status: 'idle' | 'running' | 'exited';
}

// Main process manages PTY
class TerminalManager {
  terminals: Map<string, TerminalInstance>;

  create(cwd: string, name?: string): string;
  write(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  kill(id: string): void;
  onData(id: string, callback: (data: string) => void): void;
}
```

### Features

- Multiple terminal tabs
- Split terminal view
- Terminal per phase execution
- Output search/filter
- Copy/paste support
- Custom color schemes

### Claude Code Integration

```typescript
// Start Claude Code in a terminal
async function startClaudeCode(projectPath: string, command?: string) {
  const terminal = await terminalManager.create(projectPath, 'Claude Code');

  // Run claude command
  terminalManager.write(terminal.id, `claude ${command || ''}\n`);

  return terminal.id;
}

// Execute Tiki command
async function executeTikiCommand(command: string) {
  const terminal = getActiveTerminal();
  terminalManager.write(terminal.id, `/tiki:${command}\n`);
}
```

---

## State Management

### Zustand Store Structure

```typescript
interface TikiDesktopStore {
  // Projects
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;

  // Tiki State (from .tiki/state/current.json)
  tikiState: TikiState | null;
  setTikiState: (state: TikiState) => void;

  // Current Plan (from .tiki/plans/issue-N.json)
  currentPlan: ExecutionPlan | null;
  setCurrentPlan: (plan: ExecutionPlan) => void;

  // UI State
  selectedNode: string | null;
  setSelectedNode: (nodeId: string | null) => void;

  activeTab: 'terminal' | 'workflow' | 'conversation' | 'config';
  setActiveTab: (tab: string) => void;

  sidebarCollapsed: boolean;
  detailPanelCollapsed: boolean;

  // Terminals
  terminals: TerminalInstance[];
  activeTerminal: string | null;

  // GitHub
  issues: GitHubIssue[];
  releases: Release[];
}
```

### File Watching

```typescript
// Main process watches .tiki directory
const watcher = chokidar.watch('.tiki/**/*.json', {
  persistent: true,
  ignoreInitial: false,
});

watcher.on('change', (path) => {
  if (path.includes('state/current.json')) {
    // Notify renderer of state change
    mainWindow.webContents.send('tiki:state-changed', readJsonSync(path));
  }

  if (path.includes('plans/')) {
    // Notify renderer of plan change
    mainWindow.webContents.send('tiki:plan-changed', readJsonSync(path));
  }
});
```

---

## GitHub Integration

### gh CLI Wrapper

```typescript
class GitHubBridge {
  async getIssues(state: 'open' | 'closed' | 'all' = 'open'): Promise<Issue[]> {
    const result = await exec(`gh issue list --state ${state} --json number,title,body,labels,state`);
    return JSON.parse(result.stdout);
  }

  async getIssue(number: number): Promise<Issue> {
    const result = await exec(`gh issue view ${number} --json number,title,body,labels,state,comments`);
    return JSON.parse(result.stdout);
  }

  async createIssue(title: string, body: string, labels?: string[]): Promise<Issue> {
    const labelArgs = labels?.map(l => `--label "${l}"`).join(' ') || '';
    const result = await exec(`gh issue create --title "${title}" --body "${body}" ${labelArgs}`);
    // Parse issue URL from output
    return this.getIssue(extractIssueNumber(result.stdout));
  }

  async closeIssue(number: number, comment?: string): Promise<void> {
    const commentArg = comment ? `--comment "${comment}"` : '';
    await exec(`gh issue close ${number} ${commentArg}`);
  }

  async getMilestones(): Promise<Milestone[]> {
    const result = await exec(`gh api repos/{owner}/{repo}/milestones`);
    return JSON.parse(result.stdout);
  }
}
```

### Issue List Component

```tsx
function IssueList() {
  const { issues } = useTikiStore();
  const { data, isLoading } = useQuery(['issues'], () => github.getIssues());

  return (
    <div className="issue-list">
      {data?.map(issue => (
        <IssueItem
          key={issue.number}
          issue={issue}
          isActive={tikiState?.activeIssue === issue.number}
          onClick={() => selectIssue(issue.number)}
        />
      ))}
    </div>
  );
}
```

---

## IPC Communication

### Channels

```typescript
// Main → Renderer
type MainToRenderer = {
  'tiki:state-changed': TikiState;
  'tiki:plan-changed': ExecutionPlan;
  'tiki:queue-changed': QueueItem[];
  'terminal:data': { id: string; data: string };
  'terminal:exit': { id: string; code: number };
  'github:issues-updated': Issue[];
};

// Renderer → Main
type RendererToMain = {
  'terminal:create': { cwd: string; name?: string };
  'terminal:write': { id: string; data: string };
  'terminal:resize': { id: string; cols: number; rows: number };
  'terminal:kill': { id: string };
  'tiki:execute-command': { command: string };
  'github:refresh-issues': void;
  'project:open': { path: string };
  'project:switch': { id: string };
};
```

### Preload Script

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tikiDesktop', {
  // Terminal
  terminal: {
    create: (cwd: string, name?: string) =>
      ipcRenderer.invoke('terminal:create', { cwd, name }),
    write: (id: string, data: string) =>
      ipcRenderer.send('terminal:write', { id, data }),
    onData: (callback: (id: string, data: string) => void) =>
      ipcRenderer.on('terminal:data', (_, { id, data }) => callback(id, data)),
  },

  // Tiki State
  tiki: {
    onStateChange: (callback: (state: TikiState) => void) =>
      ipcRenderer.on('tiki:state-changed', (_, state) => callback(state)),
    onPlanChange: (callback: (plan: ExecutionPlan) => void) =>
      ipcRenderer.on('tiki:plan-changed', (_, plan) => callback(plan)),
    executeCommand: (command: string) =>
      ipcRenderer.invoke('tiki:execute-command', { command }),
  },

  // GitHub
  github: {
    getIssues: () => ipcRenderer.invoke('github:get-issues'),
    getIssue: (number: number) => ipcRenderer.invoke('github:get-issue', number),
    refreshIssues: () => ipcRenderer.send('github:refresh-issues'),
  },

  // Project
  project: {
    open: (path: string) => ipcRenderer.invoke('project:open', { path }),
    switch: (id: string) => ipcRenderer.invoke('project:switch', { id }),
  },
});
```

---

## Directory Structure

```
tiki-desktop/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
│
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Entry point
│   │   ├── window.ts              # Window management
│   │   ├── ipc/
│   │   │   ├── terminal.ts        # Terminal IPC handlers
│   │   │   ├── tiki.ts            # Tiki state handlers
│   │   │   └── github.ts          # GitHub IPC handlers
│   │   ├── services/
│   │   │   ├── terminal-manager.ts
│   │   │   ├── file-watcher.ts
│   │   │   ├── tiki-state.ts
│   │   │   └── github-bridge.ts
│   │   └── utils/
│   │
│   ├── preload/                   # Preload scripts
│   │   └── index.ts
│   │
│   └── renderer/                  # React application
│       ├── index.html
│       ├── main.tsx               # React entry
│       ├── App.tsx                # Root component
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── MainContent.tsx
│       │   │   ├── DetailPanel.tsx
│       │   │   └── StatusBar.tsx
│       │   │
│       │   ├── terminal/
│       │   │   ├── Terminal.tsx
│       │   │   ├── TerminalTabs.tsx
│       │   │   └── TerminalManager.tsx
│       │   │
│       │   ├── workflow/
│       │   │   ├── WorkflowCanvas.tsx
│       │   │   ├── nodes/
│       │   │   │   ├── PhaseNode.tsx
│       │   │   │   ├── CriteriaNode.tsx
│       │   │   │   ├── IssueNode.tsx
│       │   │   │   └── ShipNode.tsx
│       │   │   └── edges/
│       │   │       └── DependencyEdge.tsx
│       │   │
│       │   ├── sidebar/
│       │   │   ├── ProjectList.tsx
│       │   │   ├── IssueList.tsx
│       │   │   ├── ReleaseList.tsx
│       │   │   ├── KnowledgeList.tsx
│       │   │   └── StateOverview.tsx
│       │   │
│       │   ├── detail/
│       │   │   ├── PhaseDetail.tsx
│       │   │   ├── IssueDetail.tsx
│       │   │   ├── VerificationChecklist.tsx
│       │   │   └── ErrorDetail.tsx
│       │   │
│       │   └── ui/                # shadcn/ui components
│       │       ├── button.tsx
│       │       ├── tabs.tsx
│       │       └── ...
│       │
│       ├── hooks/
│       │   ├── useTikiState.ts
│       │   ├── useTerminal.ts
│       │   ├── useWorkflow.ts
│       │   └── useGitHub.ts
│       │
│       ├── stores/
│       │   └── tiki-store.ts      # Zustand store
│       │
│       ├── lib/
│       │   ├── workflow-layout.ts  # Dagre layout
│       │   └── utils.ts
│       │
│       └── styles/
│           └── globals.css
│
├── resources/                     # App icons, etc.
│   └── icon.png
│
└── build/                         # Build output
```

---

## Development Phases

### Phase 1: Foundation ✅ (v0.1.0)
- [x] Project scaffolding (electron-vite + React + TypeScript)
- [x] Basic window with resizable panels
- [x] Tailwind + shadcn/ui setup
- [x] Basic terminal integration (single terminal)
- [x] File watcher for `.tiki/` directory
- [x] Zustand state management

### Phase 2: Core UI ✅ (v0.2.0)

- [x] Sidebar with collapsible sections (Ctrl+B toggle, collapse/expand)
- [x] Terminal tabs and management (rename, close, status indicators)
- [x] State display from `current.json` (StateOverview component)
- [x] Status bar with execution info (project, branch, issue/phase)
- [ ] Basic plan display from `plans/issue-N.json` (partial - sidebar shows phases)
- [ ] Command palette (cmdk) - deferred to Phase 5

### Phase 3: Workflow Diagram ✅ (v0.3.0)

- [x] React Flow integration (@xyflow/react v12)
- [x] Phase nodes with status colors (pending/in_progress/completed/failed/skipped)
- [x] IssueNode (entry) and ShipNode (completion)
- [x] Dependency edges with animated styling
- [x] Auto-layout with Dagre
- [x] Node selection → detail panel integration
- [x] Context-sensitive detail panel (PhaseDetail, IssueDetail, ShipDetail)
- [x] Collapsible detail panel (Ctrl+Shift+B)
- [ ] CriteriaNode - deferred to Phase 4

### Phase 4: GitHub Integration ✅ (v0.4.0)

- [x] Issue list from `gh` CLI
- [x] Issue detail view
- [x] Release list
- [x] Milestone visualization
- [ ] Create issue from UI (deferred to Phase 5)

### Phase 5: Full Integration
- [ ] Execute Tiki commands from UI
- [ ] Real-time workflow updates during execution
- [ ] Verification checklist interaction
- [ ] Knowledge panel
- [ ] Error handling and recovery UI

### Phase 6: Polish
- [ ] Themes (dark/light)
- [ ] Keyboard shortcuts
- [ ] Settings panel
- [ ] Multi-project support
- [ ] Window state persistence

---

## Commands/Actions

### Quick Actions (Command Palette)

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+Shift+P` | Run Tiki command |
| `Cmd+T` | New terminal |
| `Cmd+W` | Close terminal tab |
| `Cmd+1-9` | Switch terminal tab |
| `Cmd+B` | Toggle sidebar |
| `Cmd+Shift+B` | Toggle detail panel |
| `Cmd+Enter` | Execute current phase |

### Context Menu Actions

**On Phase Node:**
- View Details
- Skip Phase
- Redo Phase
- Open in Terminal

**On Issue:**
- View in GitHub
- Start Planning
- Execute (YOLO)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Actions                              │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Components                             │
│  (Sidebar, Terminal, Workflow, Detail)                          │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand Store                               │
│  (tikiState, currentPlan, terminals, selectedNode)              │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                        ▼                 ▼                 ▼
                  ┌───────────┐    ┌───────────┐    ┌───────────┐
                  │ IPC:      │    │ IPC:      │    │ IPC:      │
                  │ Terminal  │    │ Tiki      │    │ GitHub    │
                  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                        │                │                 │
                        ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Main Process Services                        │
│  (TerminalManager, FileWatcher, TikiState, GitHubBridge)        │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                        ▼                 ▼                 ▼
                  ┌───────────┐    ┌───────────┐    ┌───────────┐
                  │ node-pty  │    │ .tiki/    │    │ gh CLI    │
                  │ (shells)  │    │ (files)   │    │           │
                  └───────────┘    └───────────┘    └───────────┘
```

---

## Next Steps

1. **Initialize Project**
   ```bash
   npm create electron-vite@latest tiki-desktop -- --template react-ts
   cd tiki-desktop
   npm install
   ```

2. **Install Dependencies**
   ```bash
   npm install @xyflow/react node-pty xterm xterm-addon-fit
   npm install chokidar zustand @tanstack/react-query cmdk
   npm install tailwindcss postcss autoprefixer
   npm install react-resizable-panels
   npx shadcn-ui@latest init
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

---

## Open Questions

1. **Persistence**: Where to store app settings? (electron-store vs .tiki/desktop-config.json)
2. **Multi-window**: Should each project get its own window?
3. **Plugins**: Should we support extensions/plugins?
4. **Cloud sync**: Any plans for team features?


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tiki Desktop is an Electron-based desktop application for managing Claude Code workflows. It provides a visual interface for the Tiki workflow framework with terminal integration, workflow visualization, and GitHub integration.

## Build & Development Commands

```bash
npm run dev          # Development with hot reload (Electron Vite)
npm run build        # Build for production
npm run build:win    # Build Windows installer (NSIS)
npm run build:mac    # Build macOS DMG
npm run build:linux  # Build Linux AppImage
npm run lint         # ESLint check
npm run typecheck    # TypeScript type validation
npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once (CI mode)
```

## Architecture

### Process Model (Electron)

The app follows Electron's multi-process architecture:

- **Main Process** (`src/main/`): Node.js backend handling IPC, file system, terminal management, and system APIs
- **Preload** (`src/preload/index.ts`): Context bridge exposing `window.tikiDesktop` API with 20+ namespaced modules
- **Renderer** (`src/renderer/`): React frontend

### IPC Communication Pattern

All renderer-to-main communication goes through the preload context bridge:

```typescript
// Preload exposes typed API
window.tikiDesktop.terminal.create(options)
window.tikiDesktop.tiki.getState()
window.tikiDesktop.github.listIssues()

// Main registers handlers in src/main/ipc/*.ts
ipcMain.handle('terminal:create', handler)
```

IPC handlers are organized by domain in `src/main/ipc/`:
- `terminal.ts` - PTY terminal management
- `tiki.ts` - Tiki state, queue, releases
- `github.ts` - GitHub API via `gh` CLI
- `git.ts`, `branch.ts` - Git operations
- `commands.ts`, `hooks.ts` - Custom slash commands and lifecycle hooks
- `knowledge.ts` - Knowledge base CRUD
- And ~20 more domain-specific handlers

### Frontend State Management

- **Zustand stores** in `src/renderer/src/stores/`:
  - `tiki-store.ts` - Central Tiki state (executions, plans, issues, releases)
  - `activity-store.ts` - Activity log events
  - `layout-presets.ts` - UI layout management

- **Sync hooks** keep renderer state in sync with main process:
  - `useTikiSync` - Watches `.tiki/` directory for state changes
  - `useGitHubSync` - Periodic GitHub data refresh
  - `useSearchIndexSync` - Cross-content search indexing

### Key Services (Main Process)

Located in `src/main/services/`:
- `terminal-manager.ts` - PTY-based terminal sessions with node-pty
- `file-watcher.ts` - Chokidar-based `.tiki/` directory watching
- `github-bridge.ts` - GitHub CLI wrapper
- `settings-store.ts` - electron-store persistence
- `cost-predictor.ts`, `failure-analyzer.ts` - ML-based analysis

### UI Component Organization

Components in `src/renderer/src/components/` follow domain-based organization:
- `layout/` - Main layout (Sidebar, MainContent, DetailPanel, TitleBar, StatusBar)
- `workflow/` - React Flow diagram with custom nodes/edges
- `terminal/` - xterm.js terminal emulator
- `settings/` - Settings sections and controls
- `ui/` - Base shadcn-style components

### Workflow Visualization

Uses React Flow (`@xyflow/react`) with:
- Custom node types in `workflow/nodes/` (PhaseNode, IssueNode, ShipNode)
- Custom edge types in `workflow/edges/`
- Dagre layout for automatic positioning

## Code Style

- **Prettier**: 2 spaces, single quotes, no semicolons, 100 char width
- **TypeScript**: Strict mode, ES2022 target
- **React**: Function components with hooks, React 18 JSX transform
- **Naming**: camelCase for files/functions, PascalCase for components
- **Unused vars**: Prefix with underscore (`_unusedParam`)

## Testing

Tests use Vitest with jsdom environment. Test files are colocated:
```
src/renderer/src/components/diff/__tests__/DiffView.test.tsx
```

Run a single test file:
```bash
npx vitest run src/renderer/src/components/diff/__tests__/DiffView.test.tsx
```

Path alias available: `@renderer` → `src/renderer/src`

## Tailwind Theme

Custom dark theme with status colors defined in `tailwind.config.js`:
- `background.DEFAULT` (#0f0f0f), `background.secondary` (#1a1a1a)
- `status.pending`, `status.running`, `status.completed`, `status.failed`, `status.skipped`

## Tiki Integration

The app interfaces with the Tiki framework through:
- `.tiki/` directory - Runtime state (state.json, plans/, queue.json, releases/)
- `.claude/commands/tiki/` - Custom slash commands
- File watching to sync UI with Tiki execution state

Tiki-specific types are defined in `src/renderer/src/stores/tiki-store.ts` (TikiState, ExecutionPlan, etc.)

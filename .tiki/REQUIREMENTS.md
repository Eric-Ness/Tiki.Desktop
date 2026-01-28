# Requirements

## Coverage Summary

Tiki Desktop is an Electron-based desktop application that provides a visual interface for the Tiki workflow framework. Requirements are organized into three categories: Core Functionality, User Interface, and GitHub Integration.

**Total Requirements:** 18
- **Implemented:** 5 (28%)
- **Pending:** 13 (72%)

---

## v0.1.0 Requirements (Completed)

### Core Functionality

- **CORE-01**: Application provides Electron-based desktop shell with React UI
  - *Verify: manual* - Electron app launches with React renderer
  - *Implemented by: #1*

- **CORE-02**: Terminal emulation with xterm.js and node-pty integration
  - *Verify: manual* - Terminal renders and accepts input via PTY
  - *Implemented by: #2*

- **CORE-03**: Real-time file watching of .tiki/ directory
  - *Verify: manual* - Changes to .tiki/ files trigger UI updates
  - *Implemented by: #4*

- **CORE-04**: Zustand-based state management with IPC synchronization
  - *Verify: manual* - State persists and syncs between main and renderer
  - *Implemented by: #11*

### User Interface

- **UI-01**: Three-panel resizable layout (Sidebar, Main, Detail)
  - *Verify: manual* - All three panels render and resize correctly
  - *Implemented by: #1*

---

## v0.2.0 Requirements (Completed)

### Core Functionality

- **CORE-05**: Multi-terminal tab management with create/close/switch
  - *Verify: manual* - Can create, switch, and close multiple terminal tabs
  - *Implemented by: #3* ✅

### User Interface

- **UI-02**: Sidebar with collapsible sections and state overview
  - *Verify: manual* - Sidebar sections collapse/expand with state display
  - *Implemented by: #5* ✅

- **UI-05**: Dark theme with consistent visual polish
  - *Verify: manual* - App matches reference images with smooth animations
  - *Implemented by: #12* ✅

- **UI-06**: Status bar with execution info and indicators
  - *Verify: manual* - Status bar shows current issue, phase, and git info
  - *Implemented by: #15* ✅

---

## v0.3.0 Requirements (Pending)

- **CORE-06**: React Flow workflow diagram showing execution phases
  - *Verify: manual* - Phases render as connected nodes with status colors
  - *Status: Pending* - #6

- **UI-03**: Detail panel showing phase/issue context information
  - *Verify: manual* - Clicking nodes shows relevant details in right panel
  - *Status: Pending* - #7

---

## Future Requirements

- **CORE-07**: Real-time workflow updates during phase execution
  - *Verify: manual* - Workflow diagram updates within 200ms of state change
  - *Status: Pending* - #13

- **CORE-08**: Project management with multi-project switching
  - *Verify: manual* - Can add, switch, and remove projects
  - *Status: Pending* - #14

### User Interface

- **UI-04**: Command palette for quick Tiki command access
  - *Verify: manual* - Cmd+K opens palette with searchable commands
  - *Status: Pending* - #9

### GitHub Integration

- **GITHUB-01**: GitHub Bridge service using gh CLI
  - *Verify: manual* - gh CLI commands execute successfully from main process
  - *Status: Pending* - #8

- **GITHUB-02**: Issue list display with planned/unplanned indicators
  - *Verify: manual* - Issues show in sidebar with plan status indicators
  - *Status: Pending* - #8

- **GITHUB-03**: Issue detail view with body, labels, status
  - *Verify: manual* - Clicking issue shows full details in panel
  - *Status: Pending* - #8

- **GITHUB-04**: Release and milestone visualization
  - *Verify: manual* - Releases display with progress and milestone links
  - *Status: Pending* - #10

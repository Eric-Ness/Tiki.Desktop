# Implementation Approaches Analysis

## Overview

This document analyzes five distinct approaches for implementing greenfield project creation in Tiki Desktop, with detailed pros, cons, and implementation considerations.

---

## Approach 1: Smart Folder Picker with Detection

### Concept

Enhance the existing "Add Project" flow to detect folder state and offer appropriate actions based on what's found.

### Flow Diagram

```
User clicks "Add Project"
         │
         ▼
┌─────────────────────────┐
│   Folder Picker Opens   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   User Selects Folder   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Analyze Folder        │
│                         │
│   - Check .tiki/        │
│   - Check for code      │
│   - Check PROJECT.md    │
│   - Check git           │
│   - Detect stack        │
└───────────┬─────────────┘
            │
    ┌───────┼───────┬──────────────┐
    │       │       │              │
    ▼       ▼       ▼              ▼
┌───────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│ Has   │ │ Has    │ │ Has code │ │    Empty     │
│.tiki/ │ │partial │ │ no .tiki │ │    folder    │
└───┬───┘ └───┬────┘ └────┬─────┘ └──────┬───────┘
    │         │           │              │
    ▼         ▼           ▼              ▼
  Add      Dialog:     Dialog:        Dialog:
directly   Complete    Map first?     Template?
           setup?      Init?          Full flow?
```

### Detection Logic

```typescript
interface FolderAnalysis {
  path: string
  name: string
  state: 'empty' | 'has-code' | 'has-tiki' | 'has-tiki-partial'
  details: {
    isEmpty: boolean
    hasTiki: boolean
    hasTikiState: boolean      // .tiki/state/current.json
    hasTikiConfig: boolean     // .tiki/config.json
    hasProjectMd: boolean
    hasGit: boolean
    hasCode: boolean
    codeFileCount: number
    manifestFiles: string[]    // package.json, etc.
    detectedStack: string[]    // ['node', 'react', etc.]
  }
  recommendations: {
    primary: 'add' | 'init-full' | 'init-template' | 'map-first'
    reason: string
    alternatives: Array<{ action: string; label: string; description: string }>
  }
}
```

### Recommendation Logic

| Folder State | Primary Recommendation | Reason |
|--------------|------------------------|--------|
| Has complete `.tiki/` | Add directly | Already initialized |
| Has partial `.tiki/` | Add (with warning) | Can complete later |
| Empty | Template quickstart | Fastest path |
| Has code, unmapped | Map codebase first | Better understanding |
| Has code, mapped | Full `/tiki:new-project` | Ready for project setup |

### Implementation Requirements

| Component | Effort |
|-----------|--------|
| IPC handler: `projects:analyze-folder` | ~80 lines |
| Dialog: `FolderAnalysisDialog.tsx` | ~250 lines |
| Integration in `ProjectList.tsx` | ~30 lines |
| Preload API addition | ~5 lines |
| **Total** | **~365 lines** |

### Pros

- Minimal new UI surface
- Intelligent defaults reduce decision fatigue
- Fixes silent failure problem
- Quick to implement (1-2 days)
- Non-breaking change

### Cons

- Still relies on terminal for actual initialization
- No visual progress tracking
- User must understand CLI commands
- Doesn't address template needs

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stack detection inaccurate | Medium | Low | Can always override |
| User confused by options | Low | Medium | Clear descriptions |
| Edge cases not handled | Medium | Low | "Just add" fallback |

---

## Approach 2: Integrated New Project Wizard

### Concept

A native multi-step wizard that wraps `/tiki:new-project` phases with Desktop UI, while the terminal runs in the background for Phase 2.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NewProjectWizard                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Step Indicator (1 of 7)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                   Step Content                            │  │
│  │                   (varies by step)                        │  │
│  │                                                           │  │
│  │   Step 1: LocationStep      - Folder picker               │  │
│  │   Step 2: VisionStep        - Chat interface (terminal)   │  │
│  │   Step 3: ProjectMdStep     - Preview generated docs      │  │
│  │   Step 4: ResearchStep      - Progress cards (optional)   │  │
│  │   Step 5: FeaturesStep      - Multi-select lists          │  │
│  │   Step 6: IssuesStep        - Issue preview (optional)    │  │
│  │   Step 7: CompletionStep    - Summary dashboard           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         [Back]              [Skip]           [Next]       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step Details

| Step | UI Type | Source | Can Skip? |
|------|---------|--------|-----------|
| 1. Location | Form | Desktop native | No |
| 2. Vision | Terminal embed | CLI (Phase 2) | No |
| 3. PROJECT.md | Preview | File read | No |
| 4. Research | Progress cards | CLI (Phase 4) | Yes |
| 5. Features | Multi-select | File read + input | No |
| 6. Issues | Issue cards | GitHub API | Yes |
| 7. Done | Summary | File read | No |

### Critical Challenge: Phase 2

**Problem:** Phase 2 (Deep Questioning) is a real conversation with Claude that cannot be automated.

**Solutions:**

| Option | Approach | Feasibility |
|--------|----------|-------------|
| A | Embed terminal in wizard for Step 2 | ✅ Feasible |
| B | Direct Claude API calls | ❌ Requires API key, duplicates logic |
| C | Skip Phase 2 entirely | ❌ Defeats purpose |
| D | Pre-fill from template | ✅ For templates only |

**Recommended:** Option A - Embed terminal for Step 2, with visual wrapper.

### Implementation Requirements

| Component | Effort |
|-----------|--------|
| Wizard shell + navigation | ~200 lines |
| LocationStep | ~100 lines |
| VisionStep (terminal embed) | ~300 lines |
| ResearchStep | ~200 lines |
| FeaturesStep | ~250 lines |
| ReviewStep | ~150 lines |
| IssuesStep | ~200 lines |
| CompletionStep | ~100 lines |
| Terminal integration | ~300 lines |
| **Total** | **~1,800 lines** |

### Pros

- Native, polished experience
- Visual progress tracking
- Better feature selection UX
- Can show research results inline
- Consistent with Desktop aesthetics

### Cons

- Significant development effort (2-3 weeks)
- Duplicates some CLI logic
- Terminal integration is complex
- Maintenance burden (two implementations)
- Phase 2 still requires terminal

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Terminal sync issues | High | High | Thorough testing |
| Phase detection fragile | High | Medium | Robust patterns |
| Scope creep | Medium | High | Fixed feature set |
| CLI changes break wizard | Medium | High | Version lock |

---

## Approach 3: Template Quickstart

### Concept

Pre-built project templates for common patterns that skip the conversational deep questioning phase entirely.

### Template Categories

| Category | Templates |
|----------|-----------|
| Web Applications | React+Vite, Next.js, Vue, SvelteKit |
| Desktop | Electron+React, Tauri |
| Backend | Node API, Python FastAPI, Go |
| CLI Tools | Node CLI, Python CLI |
| Other | Blank (minimal) |

### Template Structure

```
template/
├── template.json           # Metadata and variables
├── PROJECT.md.template     # Handlebars template
├── requirements.json       # Pre-defined requirements
├── .tiki/
│   ├── config.json         # Tiki configuration
│   └── project-config.json # Project metadata
└── scaffold/               # Optional starter files
    ├── package.json
    └── src/
```

### Template Metadata

```json
{
  "id": "react-vite",
  "name": "React + Vite",
  "description": "Modern React app with Vite, TypeScript, and TailwindCSS",
  "icon": "Atom",
  "tags": ["react", "vite", "typescript", "tailwind", "frontend"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  },
  "variables": [
    {
      "name": "projectName",
      "label": "Project Name",
      "type": "string",
      "required": true
    },
    {
      "name": "styling",
      "label": "Styling Solution",
      "type": "select",
      "options": [
        { "value": "tailwind", "label": "TailwindCSS" },
        { "value": "css-modules", "label": "CSS Modules" }
      ]
    },
    {
      "name": "features",
      "label": "Include Features",
      "type": "multiselect",
      "options": [
        { "value": "routing", "label": "React Router" },
        { "value": "state", "label": "State Management" },
        { "value": "testing", "label": "Testing Setup" }
      ]
    }
  ],
  "postCreate": [
    "git init",
    "git add -A",
    "git commit -m \"chore: initialize from template\""
  ]
}
```

### User Flow

```
User selects "New from Template"
         │
         ▼
┌─────────────────────────┐
│   Template Gallery      │
│                         │
│   - Search/filter       │
│   - Category tabs       │
│   - Template cards      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Configuration Form    │
│                         │
│   - Folder location     │
│   - Template variables  │
│   - Feature toggles     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Apply Template        │
│                         │
│   - Create files        │
│   - Run post-create     │
│   - Add to projects     │
└───────────┬─────────────┘
            │
            ▼
        Project Ready
```

### Implementation Requirements

| Component | Effort |
|-----------|--------|
| Template type definitions | ~60 lines |
| Built-in templates (5-6) | ~500 lines |
| Template service | ~200 lines |
| TemplateGallery UI | ~250 lines |
| TemplateConfigDialog | ~200 lines |
| IPC handlers | ~50 lines |
| **Total** | **~1,260 lines** |

### Pros

- Fastest path to working project
- Consistent, tested configurations
- Reduces "blank page" paralysis
- No conversation required
- Community can contribute templates

### Cons

- Templates can go stale
- May not match exact user needs
- Less flexibility than full flow
- Maintenance of template library
- Skips valuable deep questioning

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Templates outdated | High | Medium | Version pinning, updates |
| Wrong template chosen | Medium | Low | Easy to start over |
| Variable validation | Low | Medium | Robust validation |
| Template bugs | Medium | Medium | Testing, community feedback |

---

## Approach 4: Hybrid Terminal Shell

### Concept

Desktop provides a "project creation shell" - a specialized UI that launches `/tiki:new-project` in an embedded terminal with visual enhancements overlaid.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  New Project Shell                                        [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Progress Sidebar   │  │                                 │  │
│  │                      │  │     Terminal (xterm.js)         │  │
│  │   ◉ Setup            │  │                                 │  │
│  │   ○ Deep Questioning │  │   $ claude /tiki:new-project    │  │
│  │   ○ PROJECT.md       │  │                                 │  │
│  │   ○ Research         │  │   What do you want to build?    │  │
│  │   ○ Requirements     │  │   > _                           │  │
│  │   ○ Issues           │  │                                 │  │
│  │                      │  │                                 │  │
│  │  ─────────────────   │  │                                 │  │
│  │                      │  │                                 │  │
│  │  Artifacts:          │  │                                 │  │
│  │   ○ PROJECT.md       │  │                                 │  │
│  │   ○ config.json      │  │                                 │  │
│  │   ○ requirements     │  │                                 │  │
│  │                      │  │                                 │  │
│  └──────────────────────┘  └─────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Detection

Monitor terminal output for phase transition patterns:

```typescript
const PHASE_PATTERNS = {
  setup: [/Checking for existing/, /Initializing git/],
  questioning: [/What do you want to build/i, /Tell me about/i],
  projectMd: [/Creating PROJECT\.md/i, /docs: initialize project/i],
  research: [/Research the domain/i, /Spawning.*agent/i],
  requirements: [/Requirements Scoping/i, /Which.*features/i],
  issues: [/Create GitHub issues/i, /gh issue create/i],
  complete: [/## Project Initialized/i, /Next Steps/i]
}
```

### Artifact Monitoring

Watch `.tiki/` directory for file creation:

```typescript
const ARTIFACTS = [
  { name: 'PROJECT.md', path: 'PROJECT.md' },
  { name: 'project-config.json', path: '.tiki/project-config.json' },
  { name: 'requirements.json', path: '.tiki/requirements.json' },
  { name: 'REQUIREMENTS.md', path: '.tiki/REQUIREMENTS.md' },
  { name: 'STACK.md', path: '.tiki/research/project/STACK.md' },
  { name: 'FEATURES.md', path: '.tiki/research/project/FEATURES.md' }
]

// Poll every 2 seconds
setInterval(async () => {
  for (const artifact of artifacts) {
    artifact.exists = await fs.exists(join(projectPath, artifact.path))
  }
}, 2000)
```

### Implementation Requirements

| Component | Effort |
|-----------|--------|
| NewProjectInitShell component | ~350 lines |
| Phase detection logic | ~100 lines |
| Artifact watcher | ~50 lines |
| Terminal integration | ~100 lines |
| **Total** | **~600 lines** |

### Pros

- Leverages existing CLI completely
- Visual progress without duplicating logic
- Real-time artifact tracking
- User learns the CLI workflow
- Single source of truth (CLI)

### Cons

- Phase detection is fragile
- Mixed UX (native UI + terminal)
- Terminal must stay visible
- Can't enhance individual phases
- Depends on CLI output format

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase detection fails | High | Medium | Fallback to manual |
| CLI output changes | Medium | High | Loose pattern matching |
| Terminal sync issues | Medium | Medium | Event-based updates |
| User closes early | Low | Low | Warning dialog |

---

## Approach 5: GitHub/Cloud Integration

### Concept

Integrate with GitHub to create repos from templates, or clone existing Tiki-enabled repos as starting points.

### Features

1. **GitHub Template Repos** - Create repo from GitHub template
2. **Clone & Adapt** - Clone any repo with `.tiki/` and customize
3. **Team Templates** - Org-specific templates on GitHub
4. **Template Registry** - Discover community templates

### User Flow

```
User selects "New from GitHub"
         │
         ▼
┌─────────────────────────┐
│   Source Selection      │
│                         │
│   ○ GitHub Template     │
│   ○ Clone Repository    │
│   ○ Template Registry   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Search/Browse         │
│                         │
│   [Search templates...] │
│                         │
│   ┌─────────────────┐   │
│   │ template-repo   │   │
│   │ ⭐ 234          │   │
│   └─────────────────┘   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Configure             │
│                         │
│   New repo name: ____   │
│   Local path: ____      │
│   [ ] Private repo      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Create                │
│                         │
│   - gh repo create      │
│   - git clone           │
│   - Post-clone setup    │
└─────────────────────────┘
```

### Implementation Requirements

| Component | Effort |
|-----------|--------|
| GitHub template service | ~200 lines |
| Clone & adapt service | ~150 lines |
| Registry integration | ~100 lines |
| GitHubProjectDialog UI | ~300 lines |
| IPC handlers | ~100 lines |
| **Total** | **~850 lines** |

### Pros

- Git-native workflow
- Teams can share templates via GitHub
- Community template ecosystem
- No local template maintenance
- Leverages existing infrastructure

### Cons

- Requires GitHub authentication
- Internet dependency
- More complex setup
- Template discovery can be noisy
- Version control overhead

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub auth issues | Medium | High | Clear error messages |
| Network failures | Medium | Medium | Retry logic |
| Template quality | High | Low | Ratings/reviews |
| API rate limits | Low | Medium | Caching |

---

## Comparison Matrix

| Aspect | Approach 1 | Approach 2 | Approach 3 | Approach 4 | Approach 5 |
|--------|------------|------------|------------|------------|------------|
| **Name** | Smart Picker | Full Wizard | Templates | Hybrid Shell | GitHub |
| **Effort** | 1-2 days | 2-3 weeks | 1-2 weeks | 3-5 days | 1 week |
| **Lines of Code** | ~365 | ~1,800 | ~1,260 | ~600 | ~850 |
| **Native UX** | Low | High | Medium | Medium | Medium |
| **CLI Dependency** | High | Medium | Low | High | Low |
| **Flexibility** | High | High | Low | High | Medium |
| **Learning Curve** | Low | Low | Low | Medium | Medium |
| **Maintenance** | Low | High | Medium | Medium | Low |
| **Team Sharing** | No | No | Partial | No | Yes |
| **Offline Support** | Yes | Yes | Yes | Yes | No |
| **Fixes Silent Failures** | Yes | Yes | Yes | Yes | Yes |
| **Skips Conversation** | No | No | Yes | No | Partial |

---

## Recommendation

### Phased Implementation

| Phase | Approach | Timeline | Value |
|-------|----------|----------|-------|
| 1 | Smart Picker (#1) | Week 1 | Fixes UX gaps, quick win |
| 2 | Hybrid Shell (#4) | Week 2 | Visual progress |
| 3 | Templates (#3) | Weeks 3-4 | Instant setup |
| 4 | Polish | Week 5 | Onboarding, empty states |

### Rationale

1. **Start with #1** - Quick win that fixes the worst UX problems
2. **Add #4** - Enhances CLI experience without replacing it
3. **Build #3** - Addresses "blank page" problem for new projects
4. **Skip #2** - Too much effort for marginal improvement over #4
5. **Defer #5** - Nice to have, but not essential for MVP

### Dependencies

```
┌─────────────┐
│  Approach 1 │ ◄── Foundation: Detection & Analysis
└──────┬──────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│  Approach 4 │  │  Approach 3 │
│  (Shell)    │  │  (Templates)│
└─────────────┘  └─────────────┘
       │                │
       └────────┬───────┘
                │
                ▼
        ┌─────────────┐
        │   Polish    │
        │   & UX      │
        └─────────────┘
```

# /tiki:new-project Command Analysis

## Overview

This document provides a comprehensive analysis of the `/tiki:new-project` CLI command, including all phases, outputs, decision points, and artifacts.

---

## Command Location

`.claude/commands/tiki/new-project.md`

---

## Phase Summary

| Phase | Name | Required | User Interaction | Artifacts |
|-------|------|----------|------------------|-----------|
| 1 | Setup | Yes | Conditional | `.git/` |
| 2 | Deep Questioning | Yes | **Conversational** | None |
| 3 | Generate PROJECT.md | Yes | None | `PROJECT.md`, `.tiki/project-config.json` |
| 4 | Research | **Optional** | Single choice | `.tiki/research/project/*.md` |
| 5 | Requirements Scoping | Yes | Multi-select per category | `.tiki/requirements.json`, `.tiki/REQUIREMENTS.md` |
| 6 | Issue Generation | **Optional** | Single choice | GitHub issues |
| 7 | Completion | Yes | None | None (display only) |

---

## Phase 1: Setup (Pre-interactive)

### Purpose
Validate environment and handle existing artifacts.

### Checks Performed

1. **Check for existing PROJECT.md**
   - If exists: Offer View / Overwrite / Cancel
   - Overwrite creates backup at `PROJECT.md.backup`

2. **Detect brownfield projects (existing code)**
   - Searches for: `.ts`, `.js`, `.py`, `.go` files
   - Ignores: `node_modules/`, `venv/`, `.git/`
   - Checks for manifest files: `package.json`, `requirements.txt`, `go.mod`

3. **Check for existing codebase mapping**
   - Looks for `.tiki/STACK.md`
   - If code exists but unmapped: Offers `/tiki:map-codebase` first

4. **Git initialization**
   - If no `.git/`: Initializes git repository

### Console Output Patterns

```
# Checking for existing project files...
PROJECT_EXISTS or NO_PROJECT

# Checking for existing code...
HAS_MANIFEST (if package.json/requirements.txt/go.mod exists)
CODEBASE_MAPPED (if .tiki/STACK.md exists)

# Git status...
Initializing git repository...
```

### User Interactions

- **If PROJECT.md exists:**
  ```
  AskUserQuestion:
    header: "Existing Project"
    question: "PROJECT.md already exists. What would you like to do?"
    options:
      - "View existing PROJECT.md"
      - "Overwrite (backup will be created)"
      - "Cancel"
  ```

- **If code detected AND not mapped:**
  ```
  AskUserQuestion:
    header: "Existing Code"
    question: "This folder contains code. Would you like to map it first?"
    options:
      - "Map codebase first (recommended)"
      - "Continue without mapping"
  ```

### Artifacts Created
- `.git/` directory (if not present)
- No files written yet

### Skippable
No - this is a gate phase

---

## Phase 2: Deep Questioning (Conversational)

### Purpose
Gather comprehensive understanding of the project through conversation.

### Key Characteristic
**This phase CANNOT be automated or skipped.**

It's a true back-and-forth conversation with Claude, not a form or questionnaire.

### Opening Prompt
```
"What do you want to build? Tell me about your vision."
```

### Questioning Techniques Used

| Technique | Example |
|-----------|---------|
| Challenge vagueness | "A platform for X" → "What's the core action users take?" |
| Make abstract concrete | Ask for specific scenarios |
| Surface assumptions | "What auth method were you thinking?" |
| Find edges | "What's the smallest version?" "What would failure look like?" |
| Reveal motivation | "Why this? Who needs it most?" |

### Coverage Checklist (Internal)

The command tracks whether these topics have been covered:

- [ ] Vision (big picture)
- [ ] Core problem being solved
- [ ] Target users
- [ ] Key constraints
- [ ] Tech preferences (optional)
- [ ] Success criteria
- [ ] Non-goals / out of scope

### Decision Gate

```
"I think I understand what you're building. Ready to create PROJECT.md, or want to explore more?"

AskUserQuestion:
  header: "Ready?"
  question: "Ready to generate PROJECT.md?"
  options:
    - "Create PROJECT.md"
    - "Keep exploring"
```

### Console Output Patterns

No specific phase markers - purely conversational. Detection must rely on:
- Initial prompt: `"What do you want to build?"`
- Follow-up patterns: `"Tell me about..."`, `"What if..."`, `"How would..."`

### Artifacts Created
None - context stored in conversation memory

### Skippable
**No** - Core to project understanding. No flags can bypass this.

---

## Phase 3: Generate PROJECT.md

### Purpose
Create the project charter document and configuration.

### Triggered
Automatically after Phase 2 decision gate.

### PROJECT.md Structure

```markdown
# [Project Name]

## Vision
[1-2 sentences from conversation]

## Core Problem
[2-3 sentences describing the problem]

## Target Users & User Needs
[Bullet list of user types and their needs]

## Technical Constraints
[List of constraints: performance, security, compatibility, etc.]

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| [layer] | [choice] | [why] |

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] [Requirement from conversation]
- [ ] [Requirement from conversation]

### Out of Scope (for now)
- [Thing explicitly excluded]
- [Thing explicitly excluded]

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [decision] | [choice] | [why] |

## Success Criteria
- [ ] [Measurable outcome]
- [ ] [Measurable outcome]
```

### .tiki/project-config.json Structure

```json
{
  "createdAt": "2026-02-01T12:00:00.000Z",
  "updatedAt": "2026-02-01T12:00:00.000Z",
  "version": "1.0",
  "project": {
    "name": "Project Name",
    "vision": "Vision statement",
    "coreProblem": "Problem description"
  },
  "users": {
    "targetUsers": ["User type 1", "User type 2"],
    "needs": ["Need 1", "Need 2"]
  },
  "technical": {
    "constraints": ["Constraint 1", "Constraint 2"],
    "techStack": {
      "frontend": "React",
      "backend": "Node.js"
    }
  },
  "scope": {
    "successCriteria": ["Criterion 1", "Criterion 2"],
    "outOfScope": ["Excluded 1", "Excluded 2"]
  },
  "research": {
    "completed": false,
    "path": null
  }
}
```

### Git Commit
```bash
git add PROJECT.md .tiki/project-config.json
git commit -m "docs: initialize project - [project name]"
```

### Console Output Patterns
```
Creating PROJECT.md...
Created PROJECT.md

git add PROJECT.md .tiki/project-config.json
git commit -m "docs: initialize project - [project name]"
```

### Artifacts Created
- `PROJECT.md` (at repo root)
- `.tiki/project-config.json`

### Skippable
No - Required for subsequent phases

---

## Phase 4: Research Decision (Optional)

### Purpose
Research the domain ecosystem before defining requirements.

### User Choice

```
AskUserQuestion:
  header: "Research"
  question: "Research the domain ecosystem before defining requirements?"
  options:
    - "Research first (Recommended)" → Spawns 4 parallel agents
    - "Skip research" → Jump to Phase 5
```

### Skip Flag
`--skip-research` flag bypasses this phase entirely.

### If Research Selected

Spawns **4 parallel Task agents**:

| Agent | Purpose | Output File |
|-------|---------|-------------|
| Stack Research | Technology recommendations for 2026 | `STACK.md` |
| Features Research | Table stakes vs differentiators | `FEATURES.md` |
| Architecture Research | System structure patterns | `ARCHITECTURE.md` |
| Pitfalls Research | Common mistakes & prevention | `PITFALLS.md` |

### Agent Behavior

Each agent:
1. Uses `WebSearch` for current research
2. Uses `WebFetch` to validate sources
3. Marks findings with confidence: HIGH / MEDIUM / LOW
4. Writes structured markdown output

### Synthesis

After all agents complete:
- Reads all 4 output files
- Creates `SUMMARY.md` synthesizing key findings
- Updates `.tiki/project-config.json` with `research.completed: true`

### Output Directory
```
.tiki/research/project/
├── STACK.md
├── FEATURES.md
├── ARCHITECTURE.md
├── PITFALLS.md
└── SUMMARY.md
```

### Git Commit
```bash
git add .tiki/research/project/
git commit -m "docs: add project research"
```

### Console Output Patterns
```
Research the domain ecosystem before defining requirements?
> Research first (Recommended)

Spawning Stack Research agent...
Spawning Features Research agent...
Spawning Architecture Research agent...
Spawning Pitfalls Research agent...

[Agent outputs...]

Synthesizing research findings...
Created SUMMARY.md
```

### Artifacts Created
- `.tiki/research/project/STACK.md`
- `.tiki/research/project/FEATURES.md`
- `.tiki/research/project/ARCHITECTURE.md`
- `.tiki/research/project/PITFALLS.md`
- `.tiki/research/project/SUMMARY.md`

### Skippable
**Yes** - via `--skip-research` flag or user choice

---

## Phase 5: Requirements Scoping

### Purpose
Define v1 requirements with REQ-IDs.

### Two Modes

**Mode A: With Research (from Phase 4)**
- Presents features by category from FEATURES.md
- Uses multi-select for each category

**Mode B: Without Research**
- Conversational gathering: "What are the main things users need to do?"
- Pushes for specificity
- Groups into categories

### With Research - Flow

For each category in FEATURES.md:

```
AskUserQuestion:
  header: "[Category Name]"
  question: "Which [category] features are in v1?"
  multiSelect: true
  options:
    - "[Table stake 1]"
    - "[Table stake 2]"
    - "[Differentiator 1]"
    - "[Differentiator 2]"
```

### Selection Logic

| Selection | Version Assignment |
|-----------|-------------------|
| Selected | v1 |
| Unselected table stake | v2 |
| Unselected differentiator | out-of-scope |

### REQ-ID Format

```
[CATEGORY]-[NUMBER]

Categories:
- AUTH  (Authentication)
- CORE  (Core functionality)
- DATA  (Data management)
- UI    (User interface)
- INT   (Integrations)
- SEC   (Security)
- PERF  (Performance)
- DOC   (Documentation)

Examples:
- AUTH-01
- CORE-02
- UI-03
```

### Requirement Quality Rules

- Must be specific & testable
- User-centric phrasing
- Atomic (one capability per requirement)
- Minimal dependencies

**Bad:** "Handle authentication"
**Good:** "User can log in with email and password"

### Confirmation Step

```
## v1 Requirements

### Authentication (AUTH)
- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in with existing credentials

### Core (CORE)
- [ ] **CORE-01**: User can create a new post
- [ ] **CORE-02**: User can edit their own posts

Does this capture what you're building?

AskUserQuestion:
  header: "Confirm"
  question: "Does this look correct?"
  options:
    - "Looks good"
    - "Adjust"
```

### Output Files

**.tiki/requirements.json:**
```json
{
  "version": "1.0",
  "createdAt": "2026-02-01T12:00:00.000Z",
  "updatedAt": "2026-02-01T12:00:00.000Z",
  "categories": [
    {
      "code": "AUTH",
      "name": "Authentication",
      "requirements": [
        {
          "id": "AUTH-01",
          "description": "User can create account with email/password",
          "status": "pending",
          "version": "v1",
          "linkedIssue": null
        }
      ]
    }
  ],
  "versions": {
    "v1": ["AUTH-01", "AUTH-02", "CORE-01"],
    "v2": ["AUTH-03"]
  },
  "outOfScope": [
    {
      "description": "OAuth social login",
      "reason": "Complexity for MVP, revisit post-launch"
    }
  ]
}
```

**.tiki/REQUIREMENTS.md:**
```markdown
# v1 Requirements

## Authentication (AUTH)
- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in with existing credentials

## Core (CORE)
- [ ] **CORE-01**: User can create a new post

# v2 Requirements
- [ ] **AUTH-03**: User can log in with Google OAuth

# Out of Scope
- **OAuth social login** — Complexity for MVP, revisit post-launch
```

### Git Commit
```bash
git add .tiki/requirements.json .tiki/REQUIREMENTS.md
git commit -m "docs: define v1 requirements - [count] requirements"
```

### Console Output Patterns
```
## Requirements Scoping

Which Authentication features are in v1?
> [x] User can create account
> [x] User can log in
> [ ] OAuth social login

Which Core features are in v1?
...

## Confirmation

Does this capture what you're building?
> Looks good

Creating requirements files...
Created .tiki/requirements.json
Created .tiki/REQUIREMENTS.md

git commit -m "docs: define v1 requirements - 12 requirements"
```

### Artifacts Created
- `.tiki/requirements.json`
- `.tiki/REQUIREMENTS.md`

### Skippable
No - Required for issue generation

---

## Phase 6: Issue Generation (Optional)

### Purpose
Create GitHub issues from requirements.

### User Choice

```
AskUserQuestion:
  header: "GitHub Issues"
  question: "Create GitHub issues from requirements?"
  options:
    - "Create issues (Recommended)" → Generate issues
    - "Skip for now" → Jump to Phase 7
```

### Skip Flag
`--skip-issues` flag bypasses this phase entirely.

### Issue Grouping Logic

- Group tightly-coupled requirements (same feature area)
- Keep separate if independently valuable or parallelizable
- Not 1:1 with requirements (can be grouped)

### Issue Template

```markdown
## Summary
[1-2 sentence description]

## Requirements
- [ ] **[REQ-ID]**: [description]
- [ ] **[REQ-ID]**: [description]

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

## Dependencies
- Depends on #[number]: [reason]

## Notes
[Context from research/decisions]
```

### Labels Applied

| Label Type | Values |
|------------|--------|
| Category | `auth`, `core`, `data`, `ui`, `integration`, `security`, `performance`, `documentation` |
| Version | `v1`, `v2` |
| Type | `enhancement` |

### Creation Process

1. Create all issues first (via `gh issue create`)
2. Capture issue numbers from output
3. Update issue bodies with dependency references (via `gh issue edit`)
4. Optionally create v1 milestone and assign

### Milestone Option

```
AskUserQuestion:
  header: "Milestone"
  question: "Create a v1 milestone and assign issues?"
  options:
    - "Create milestone"
    - "Skip milestone"
```

### Update requirements.json

After creation, adds `linkedIssue` field:
```json
{
  "id": "AUTH-01",
  "description": "...",
  "linkedIssue": 42
}
```

### Summary Display

```
## Issues Created

| # | Title | Requirements | Labels |
|---|-------|--------------|--------|
| 1 | Setup authentication | AUTH-01, AUTH-02 | auth, v1 |
| 2 | Create post functionality | CORE-01, CORE-02 | core, v1 |

Total: 8 issues created
Milestone: v1 (if created)

Dependency Graph:
#1 (auth) ← #2 (posts depend on auth)
```

### Error Handling

If issue creation fails:
```
AskUserQuestion:
  header: "Error"
  question: "Issue creation failed: [error]. What would you like to do?"
  options:
    - "Retry"
    - "Skip this issue"
    - "Cancel remaining"
```

### Console Output Patterns
```
Create GitHub issues from requirements?
> Create issues (Recommended)

Creating issue: Setup authentication...
gh issue create --title "Setup authentication" --body "..." --label "auth,v1"
Created issue #1

Creating issue: Create post functionality...
gh issue create --title "Create post functionality" --body "..." --label "core,v1"
Created issue #2

...

## Issues Created
| # | Title | Requirements | Labels |
...
```

### Artifacts Created
- GitHub issues (remote only)
- Updated `.tiki/requirements.json` with `linkedIssue` fields
- Optional: v1 milestone on GitHub

### Skippable
**Yes** - via `--skip-issues` flag or user choice

---

## Phase 7: Completion Summary

### Purpose
Display summary and next steps.

### Output Format

```
## Project Initialized

**[Project Name]**

| Artifact | Location |
|----------|----------|
| Project | PROJECT.md |
| Config | .tiki/project-config.json |
| Research | .tiki/research/project/ (if created) |
| Requirements | .tiki/REQUIREMENTS.md |
| Issues | [count] created (if created) |

## Next Steps

- `/tiki:pick-issue` — See which issue to start with
- `/tiki:yolo [number]` — Execute an issue end-to-end
- `/tiki:plan-issue [number]` — Plan an issue manually
```

### Console Output Patterns
```
## Project Initialized
## Next Steps
```

These are reliable markers for detecting completion.

### Artifacts Created
None - display only

### Skippable
No - terminal display

---

## Command-Line Flags

| Flag | Effect |
|------|--------|
| (none) | Full flow with all phases |
| `--skip-research` | Skip Phase 4 |
| `--skip-issues` | Skip Phase 6 |
| `--skip-research --skip-issues` | Minimal flow (still requires Phase 2) |

---

## Phase Detection Summary

For UI integration, these are the reliable detection patterns:

| Phase | Detection Pattern |
|-------|-------------------|
| Phase 1 | `"Checking for existing"`, `"Initializing git"` |
| Phase 2 | `"What do you want to build?"`, conversational patterns |
| Phase 3 | `"Creating PROJECT.md"`, `"docs: initialize project"` |
| Phase 4 | `"Research the domain"`, `"Spawning.*agent"` |
| Phase 5 | `"Requirements Scoping"`, `"Which.*features"` |
| Phase 6 | `"Create GitHub issues"`, `"gh issue create"` |
| Phase 7 | `"## Project Initialized"`, `"## Next Steps"` |
| Skip Research | `"Skip research"` selection |
| Skip Issues | `"Skip.*issues"` selection |

---

## Key Constraints for Desktop Integration

1. **Phase 2 cannot be automated** - Must run in terminal with real conversation
2. **Phase transitions driven by AskUserQuestion** - Modal, waits for user input
3. **No headless mode** - Flags only skip optional phases
4. **Minimum viable requires Phase 2** - Even with all flags, conversation is needed

---

## File Creation Timeline

| When | Files Created |
|------|---------------|
| Phase 1 | `.git/` (if missing) |
| Phase 2 | Nothing (conversational) |
| Phase 3 | `PROJECT.md`, `.tiki/project-config.json` + git commit |
| Phase 4 | `.tiki/research/project/{STACK,FEATURES,ARCHITECTURE,PITFALLS,SUMMARY}.md` + git commit |
| Phase 5 | `.tiki/requirements.json`, `.tiki/REQUIREMENTS.md` + git commit |
| Phase 6 | GitHub issues + updated `.tiki/requirements.json` |
| Phase 7 | Nothing (display only) |

# Greenfield Project Creation Research

## Overview

This research folder contains comprehensive analysis and planning documents for implementing greenfield project creation in Tiki Desktop. The research was conducted on 2026-02-01.

## Document Index

| File | Description |
|------|-------------|
| `00-index.md` | This file - overview and navigation |
| `01-user-journey-analysis.md` | Current user journey, gaps, and pain points |
| `02-tiki-state-initialization.md` | How Tiki state is created and managed |
| `03-new-project-command-analysis.md` | Deep dive into `/tiki:new-project` phases |
| `04-ui-patterns-analysis.md` | Existing UI patterns for dialogs and wizards |
| `05-implementation-approaches.md` | Five approaches with pros/cons analysis |
| `06-revised-implementation-plan.md` | Final detailed implementation plan |
| `07-template-specifications.md` | Built-in template definitions |
| `08-complete-code-samples.md` | Full code samples for all components |

## Key Findings Summary

### Critical Constraints

1. **Desktop cannot fully initialize Tiki** - The `.tiki/` directory structure must be created by the CLI. Desktop can only create the `releases/` subdirectory.

2. **Phase 2 (Deep Questioning) cannot be automated** - It requires real Claude conversation. No flags or workarounds can skip it.

3. **Current UX has silent failures** - Adding a project without `.tiki/` results in no error, just empty state.

4. **File watcher is conditional** - Only activates if `.tiki/` directory exists.

### Recommended Approach

A phased implementation:
1. **Phase 1:** Smart folder detection and analysis
2. **Phase 2:** Enhanced terminal shell with progress tracking
3. **Phase 3:** Template quickstart (skips conversation)
4. **Phase 4:** Polish, empty states, onboarding

### Estimated Scope

- ~2,170 lines of code
- 5 weeks timeline
- 11 new/modified files
- 1 new dependency (Handlebars)

## Related Files

- Main plan copy: `..\..\greenfield-project-plan.md`
- Existing UI components: `src\renderer\src\components\`
- IPC handlers: `src\main\ipc\`
- Services: `src\main\services\`

## Next Steps

1. Review documents in order (01 through 07)
2. Decide on implementation priority
3. Create GitHub issues for each phase
4. Begin implementation with Phase 1

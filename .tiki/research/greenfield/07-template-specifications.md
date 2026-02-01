# Template Specifications

## Overview

This document provides detailed specifications for the built-in project templates, including their structure, variables, and generated content.

---

## Template Architecture

### Template Data Structure

```typescript
interface ProjectTemplate {
  // Identity
  id: string                    // Unique identifier (kebab-case)
  name: string                  // Display name
  description: string           // Short description (1-2 sentences)
  icon: string                  // Lucide icon name
  tags: string[]                // Searchable tags

  // Capabilities
  provides: {
    projectMd: boolean          // Generates PROJECT.md
    requirements: boolean       // Generates requirements.json
    scaffold: boolean           // Creates starter code files
    gitInit: boolean            // Initializes git repository
  }

  // Configuration
  variables: TemplateVariable[] // User-configurable options
  files: Record<string, string> // File templates (Handlebars)
  postCreate?: string[]         // Commands to run after creation
}
```

### Variable Types

| Type | UI Control | Value Type |
|------|------------|------------|
| `string` | Text input | `string` |
| `boolean` | Toggle switch | `boolean` |
| `select` | Dropdown | `string` |
| `multiselect` | Checkbox group | `string[]` |

### Handlebars Helpers

| Helper | Usage | Example |
|--------|-------|---------|
| `eq` | Equality check | `{{#if (eq styling 'tailwind')}}` |
| `neq` | Not equal check | `{{#if (neq database 'none')}}` |
| `includes` | Array contains | `{{#if (includes features 'routing')}}` |
| `json` | JSON stringify | `{{json features}}` |
| `now` | Current ISO timestamp | `{{now}}` |

---

## Template 1: React + Vite

### Metadata

```json
{
  "id": "react-vite",
  "name": "React + Vite",
  "description": "Modern React app with Vite, TypeScript, and TailwindCSS",
  "icon": "Atom",
  "tags": ["react", "vite", "typescript", "tailwind", "frontend", "spa"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default | Options |
|------|-------|------|----------|---------|---------|
| `projectName` | Project Name | string | Yes | - | - |
| `description` | Description | string | Yes | - | - |
| `styling` | Styling Solution | select | Yes | `tailwind` | tailwind, css-modules, styled-components, none |
| `features` | Include Features | multiselect | No | `['routing', 'state']` | routing, state, forms, testing, storybook |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a modern, performant web application with excellent developer experience and user interface.

## Target Users
- End users of the web application
- Development team maintaining the codebase

## Technical Constraints
- Browser support: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- Performance: Initial load under 200KB, LCP under 2.5s
- Accessibility: WCAG 2.1 AA compliance

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18 | Component-based UI with hooks |
| Build | Vite | Fast HMR, optimized production builds |
| Language | TypeScript | Type safety and better DX |
{{#if (eq styling 'tailwind')}}
| Styling | TailwindCSS | Utility-first, rapid prototyping |
{{/if}}
{{#if (eq styling 'styled-components')}}
| Styling | Styled Components | CSS-in-JS, component scoping |
{{/if}}
{{#if (eq styling 'css-modules')}}
| Styling | CSS Modules | Scoped CSS, no runtime |
{{/if}}
{{#if (includes features 'routing')}}
| Routing | React Router v6 | Declarative routing |
{{/if}}
{{#if (includes features 'state')}}
| State | Zustand | Lightweight, hooks-based state |
{{/if}}
{{#if (includes features 'forms')}}
| Forms | React Hook Form | Performant form handling |
{{/if}}
{{#if (includes features 'testing')}}
| Testing | Vitest + Testing Library | Fast unit and component tests |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users need a responsive, mobile-friendly interface
- [ ] Fast page loads improve user engagement
{{#if (includes features 'routing')}}
- [ ] Multi-page navigation improves content organization
{{/if}}
{{#if (includes features 'state')}}
- [ ] Centralized state simplifies data flow
{{/if}}

### Out of Scope (for now)
- Server-side rendering
- Native mobile apps
- Offline support (PWA)

## Success Criteria
- [ ] Lighthouse performance score > 90
- [ ] All pages load in under 3 seconds
- [ ] Zero accessibility violations
```

**.tiki/project-config.json**
```json
{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "react-vite",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  },
  "technical": {
    "stack": {
      "framework": "react",
      "build": "vite",
      "language": "typescript",
      "styling": "{{styling}}"
    },
    "features": {{json features}}
  }
}
```

**.tiki/config.json**
```json
{
  "tdd": {
    "enabled": true,
    "framework": "vitest"
  },
  "execution": {
    "autoCommit": true,
    "requireTests": {{#if (includes features 'testing')}}true{{else}}false{{/if}}
  }
}
```

### Post-Create Commands
```
git init
git add -A
git commit -m "chore: initialize project from react-vite template"
```

---

## Template 2: Next.js

### Metadata

```json
{
  "id": "nextjs",
  "name": "Next.js App",
  "description": "Full-stack React with Next.js 14, App Router, and Server Components",
  "icon": "Triangle",
  "tags": ["react", "nextjs", "typescript", "fullstack", "ssr", "vercel"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default | Options |
|------|-------|------|----------|---------|---------|
| `projectName` | Project Name | string | Yes | - | - |
| `description` | Description | string | Yes | - | - |
| `database` | Database | select | No | `none` | none, prisma-postgres, prisma-sqlite, drizzle |
| `auth` | Authentication | select | No | `none` | none, nextauth, clerk |
| `features` | Include Features | multiselect | No | `[]` | api-routes, middleware, analytics, testing |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a production-ready full-stack web application with server-side rendering and API routes.

## Target Users
- End users accessing the application
- Developers extending functionality

## Technical Constraints
- Edge-compatible where possible
- SEO-friendly with SSR/SSG
- Type-safe from database to UI
- Deployable to Vercel or self-hosted

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 (App Router) | Server components, streaming |
| Language | TypeScript | Type safety end-to-end |
| Styling | TailwindCSS | Utility-first, rapid development |
{{#if (neq database 'none')}}
| Database | {{database}} | {{#if (eq database 'prisma-postgres')}}PostgreSQL with Prisma ORM{{/if}}{{#if (eq database 'prisma-sqlite')}}SQLite for local development{{/if}}{{#if (eq database 'drizzle')}}Drizzle ORM for type-safe queries{{/if}} |
{{/if}}
{{#if (neq auth 'none')}}
| Auth | {{auth}} | {{#if (eq auth 'nextauth')}}NextAuth.js for flexible auth{{/if}}{{#if (eq auth 'clerk')}}Clerk for managed auth{{/if}} |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users need fast, SEO-friendly page loads
- [ ] Server components reduce client bundle size
{{#if (neq database 'none')}}
- [ ] Data persistence is required for user content
{{/if}}
{{#if (neq auth 'none')}}
- [ ] Secure authentication is required for user data
{{/if}}
{{#if (includes features 'api-routes')}}
- [ ] API routes enable third-party integrations
{{/if}}

### Out of Scope (for now)
- Native mobile app
- Real-time features (WebSockets)
- Multi-tenant architecture

## Success Criteria
- [ ] Core Web Vitals in green
- [ ] Time to first byte < 200ms
- [ ] SEO score > 95
```

---

## Template 3: Electron + React

### Metadata

```json
{
  "id": "electron-react",
  "name": "Electron + React",
  "description": "Cross-platform desktop app with Electron, React, and TypeScript",
  "icon": "Monitor",
  "tags": ["electron", "react", "typescript", "desktop", "cross-platform"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default | Options |
|------|-------|------|----------|---------|---------|
| `projectName` | Project Name | string | Yes | - | - |
| `description` | Description | string | Yes | - | - |
| `features` | Include Features | multiselect | No | `['ipc', 'store']` | ipc, store, auto-update, tray, notifications, multi-window |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a native-feeling desktop application that works across Windows, macOS, and Linux.

## Target Users
- Desktop users on Windows, macOS, and Linux
- Power users who prefer native applications

## Technical Constraints
- Must work offline
- Native OS integration (file system, notifications, tray)
- Reasonable memory footprint (< 200MB idle)
- Fast startup time (< 3s)
- Code signing for distribution

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Electron 28+ | Cross-platform desktop |
| UI | React 18 | Component-based UI |
| Build | electron-vite | Fast builds, HMR |
| Language | TypeScript | Type safety |
| Styling | TailwindCSS | Rapid UI development |
{{#if (includes features 'store')}}
| Storage | electron-store | Persistent settings |
{{/if}}
{{#if (includes features 'auto-update')}}
| Updates | electron-updater | Auto-update support |
{{/if}}

## Architecture

\`\`\`
┌─────────────────────────────────────┐
│           Main Process              │
│  (Node.js - system access, IPC)     │
├─────────────────────────────────────┤
│           Preload Scripts           │
│  (Context bridge, secure IPC)       │
├─────────────────────────────────────┤
│          Renderer Process           │
│  (React UI, no direct Node access)  │
└─────────────────────────────────────┘
\`\`\`

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
{{#if (includes features 'ipc')}}
- [ ] IPC layer provides secure main-renderer communication
{{/if}}
{{#if (includes features 'store')}}
- [ ] Settings persist across app restarts
{{/if}}
{{#if (includes features 'auto-update')}}
- [ ] Users receive updates automatically
{{/if}}
{{#if (includes features 'tray')}}
- [ ] System tray provides quick access
{{/if}}
{{#if (includes features 'notifications')}}
- [ ] Native notifications improve engagement
{{/if}}
- [ ] App launches quickly and feels responsive

### Out of Scope (for now)
- Mobile versions
- Web version
- Plugin/extension system

## Success Criteria
- [ ] Cold start < 3 seconds
- [ ] Memory usage < 200MB idle
- [ ] Works on Windows 10+, macOS 11+, Ubuntu 20.04+
```

---

## Template 4: Node.js API

### Metadata

```json
{
  "id": "node-api",
  "name": "Node.js API",
  "description": "REST API with Express/Fastify, TypeScript, and database integration",
  "icon": "Server",
  "tags": ["node", "api", "typescript", "rest", "backend", "express", "fastify"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default | Options |
|------|-------|------|----------|---------|---------|
| `projectName` | Project Name | string | Yes | - | - |
| `description` | Description | string | Yes | - | - |
| `framework` | Framework | select | Yes | `fastify` | fastify, express, hono |
| `database` | Database | select | Yes | `prisma-postgres` | prisma-postgres, prisma-mysql, drizzle-postgres, mongodb |
| `features` | Include Features | multiselect | No | `['validation', 'auth']` | validation, auth, swagger, rate-limit, testing, logging |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a reliable, scalable API service with proper authentication, validation, and documentation.

## Target Users
- Frontend applications consuming the API
- Third-party integrations
- Mobile applications

## Technical Constraints
- Response time: p95 < 200ms
- Availability: 99.9% uptime target
- Security: OWASP Top 10 compliance
- Scalability: Handle 1000 req/s

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js 20 LTS | Long-term support |
| Framework | {{framework}} | {{#if (eq framework 'fastify')}}High performance, schema validation{{/if}}{{#if (eq framework 'express')}}Mature ecosystem, middleware{{/if}}{{#if (eq framework 'hono')}}Edge-ready, minimal{{/if}} |
| Language | TypeScript | Type safety |
| Database | {{database}} | {{#if (eq database 'prisma-postgres')}}PostgreSQL with Prisma{{/if}}{{#if (eq database 'prisma-mysql')}}MySQL with Prisma{{/if}}{{#if (eq database 'drizzle-postgres')}}PostgreSQL with Drizzle{{/if}}{{#if (eq database 'mongodb')}}MongoDB for documents{{/if}} |
{{#if (includes features 'validation')}}
| Validation | Zod | Runtime type checking |
{{/if}}
{{#if (includes features 'auth')}}
| Auth | JWT | Stateless authentication |
{{/if}}
{{#if (includes features 'swagger')}}
| Docs | OpenAPI/Swagger | API documentation |
{{/if}}
{{#if (includes features 'logging')}}
| Logging | Pino | Structured logging |
{{/if}}

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] RESTful endpoints serve client needs
{{#if (includes features 'auth')}}
- [ ] JWT auth secures protected routes
{{/if}}
{{#if (includes features 'validation')}}
- [ ] Input validation prevents bad data
{{/if}}
{{#if (includes features 'swagger')}}
- [ ] API docs enable third-party integration
{{/if}}
{{#if (includes features 'rate-limit')}}
- [ ] Rate limiting prevents abuse
{{/if}}

### Out of Scope (for now)
- GraphQL
- WebSocket real-time features
- File uploads (S3)
- Background job processing

## Success Criteria
- [ ] All endpoints respond < 200ms p95
- [ ] 100% input validation coverage
- [ ] Zero security vulnerabilities in audit
```

---

## Template 5: Node.js CLI

### Metadata

```json
{
  "id": "node-cli",
  "name": "Node.js CLI",
  "description": "Command-line tool with TypeScript, Commander, and beautiful output",
  "icon": "Terminal",
  "tags": ["node", "cli", "typescript", "terminal", "command-line"],
  "provides": {
    "projectMd": true,
    "requirements": true,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default | Options |
|------|-------|------|----------|---------|---------|
| `projectName` | CLI Name | string | Yes | - | - |
| `description` | Description | string | Yes | - | - |
| `binName` | Binary Name | string | Yes | - | - |
| `features` | Include Features | multiselect | No | `['config', 'colors']` | config, colors, interactive, progress, ink |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
Building a developer-friendly command-line tool that's easy to install, use, and extend.

## Target Users
- Developers using the CLI in their workflow
- CI/CD pipelines
- Automation scripts

## Technical Constraints
- Single binary distribution via npm
- Works on Windows, macOS, Linux
- Startup time < 500ms
- Minimal runtime dependencies
- No native modules

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js | Universal availability |
| Language | TypeScript | Type safety, better tooling |
| CLI Framework | Commander | Battle-tested, intuitive API |
| Build | tsup | Bundle to single file |
{{#if (includes features 'colors')}}
| Output | chalk | Cross-platform colors |
{{/if}}
{{#if (includes features 'interactive')}}
| Prompts | inquirer | Interactive input |
{{/if}}
{{#if (includes features 'progress')}}
| Progress | ora | Spinners and progress |
{{/if}}
{{#if (includes features 'ink')}}
| UI | Ink | React-based terminal UI |
{{/if}}
{{#if (includes features 'config')}}
| Config | cosmiconfig | Flexible config loading |
{{/if}}

## Distribution

\`\`\`bash
# Global install
npm install -g {{projectName}}

# Run
{{binName}} --help
{{binName}} <command> [options]
\`\`\`

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
- [ ] Users can install globally via npm
- [ ] Help text is clear and useful
- [ ] Exit codes are meaningful for scripts
{{#if (includes features 'config')}}
- [ ] Config file reduces repetitive flags
{{/if}}
{{#if (includes features 'interactive')}}
- [ ] Interactive mode improves UX for complex inputs
{{/if}}
{{#if (includes features 'progress')}}
- [ ] Progress indicators improve perceived performance
{{/if}}

### Out of Scope (for now)
- GUI version
- Web interface
- Plugin/extension system
- Auto-updates

## Success Criteria
- [ ] Cold start < 500ms
- [ ] npm install succeeds on all platforms
- [ ] All commands have --help documentation
```

---

## Template 6: Blank Project

### Metadata

```json
{
  "id": "blank",
  "name": "Blank Project",
  "description": "Minimal setup - just PROJECT.md and .tiki config",
  "icon": "File",
  "tags": ["minimal", "custom", "blank"],
  "provides": {
    "projectMd": true,
    "requirements": false,
    "scaffold": false,
    "gitInit": true
  }
}
```

### Variables

| Name | Label | Type | Required | Default |
|------|-------|------|----------|---------|
| `projectName` | Project Name | string | Yes | - |
| `description` | Description | string | Yes | - |

### Generated Files

**PROJECT.md**
```markdown
# {{projectName}}

## Vision
{{description}}

## Core Problem
_Define the core problem this project solves_

## Target Users
_Who will use this?_

## Technical Constraints
_Any technical limitations or requirements_

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| _layer_ | _choice_ | _why_ |

## Requirements

### Validated
_None yet — ship to validate_

### Active Hypotheses
_What you believe users need_

### Out of Scope (for now)
_What you're explicitly not building_

## Success Criteria
- [ ] _Measurable outcome 1_
- [ ] _Measurable outcome 2_
```

**.tiki/project-config.json**
```json
{
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}",
  "version": "1.0",
  "template": "blank",
  "project": {
    "name": "{{projectName}}",
    "vision": "{{description}}"
  }
}
```

**.tiki/config.json**
```json
{
  "tdd": {
    "enabled": false
  },
  "execution": {
    "autoCommit": true
  }
}
```

---

## Template Validation Rules

### String Fields

```typescript
interface StringValidation {
  pattern?: string     // Regex pattern
  minLength?: number   // Minimum characters
  maxLength?: number   // Maximum characters
}

// Example: Project name validation
{
  name: 'projectName',
  type: 'string',
  validation: {
    pattern: '^[a-z][a-z0-9-]*$',
    minLength: 2,
    maxLength: 50
  }
}
```

### Required Fields

All required fields must have a non-empty value:
- String: `value.trim().length > 0`
- Boolean: Always valid (has default)
- Select: Value must be in options
- Multiselect: Array (can be empty if not required)

### Select Validation

Value must match one of the defined options:

```typescript
const validValues = variable.options.map(o => o.value)
if (!validValues.includes(value)) {
  errors.push(`${variable.label} has invalid selection`)
}
```

### Multiselect Validation

All values must match defined options:

```typescript
if (!Array.isArray(value)) {
  errors.push(`${variable.label} must be an array`)
} else {
  const validValues = variable.options.map(o => o.value)
  for (const v of value) {
    if (!validValues.includes(v)) {
      errors.push(`${variable.label} contains invalid selection: ${v}`)
    }
  }
}
```

---

## Adding New Templates

### Checklist

- [ ] Define unique `id` (kebab-case)
- [ ] Choose appropriate `icon` (Lucide)
- [ ] Add relevant `tags` for search
- [ ] Define all variables with types
- [ ] Create PROJECT.md template with conditionals
- [ ] Create project-config.json template
- [ ] Optionally create config.json template
- [ ] Define postCreate commands
- [ ] Test all variable combinations
- [ ] Update template index

### Template File Structure

```
src/main/services/builtin-templates.ts
  └── BUILTIN_TEMPLATES[]
        └── categories[]
              └── templates[]
                    ├── id
                    ├── name
                    ├── description
                    ├── icon
                    ├── tags[]
                    ├── provides{}
                    ├── variables[]
                    ├── files{}
                    └── postCreate[]
```

### Testing Templates

```typescript
// Unit test for template
describe('react-vite template', () => {
  it('generates valid PROJECT.md', async () => {
    const result = await applyTemplate({
      templateId: 'react-vite',
      targetPath: tempDir,
      variables: {
        projectName: 'test-app',
        description: 'Test description',
        styling: 'tailwind',
        features: ['routing', 'state']
      }
    })

    expect(result.success).toBe(true)
    expect(result.filesCreated).toContain('PROJECT.md')

    const content = await readFile(join(tempDir, 'PROJECT.md'), 'utf-8')
    expect(content).toContain('# test-app')
    expect(content).toContain('TailwindCSS')
    expect(content).toContain('React Router')
  })
})
```

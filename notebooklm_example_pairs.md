# Example Pairs — Ghost AI Prompt Optimizer

These examples show how to transform messy inputs into structured, executable prompts.

---

## EXAMPLE 1

### INPUT (Messy/Unstructured):
"I need a sidebar that shows all the pods and their status"

### OUTPUT (Optimized Prompt):

# FEATURE: Pod Status Sidebar Component

## CONTEXT LOADING (MANDATORY)
Read these files before proceeding:
- @context/project_overview.md
- @context/architecture.md
- @context/code_standards.md
- @context/ai_workflow_rules.md
- @context/ui_context.md
- @context/progress_tracker.md

## TASK DESCRIPTION
Build a real-time Pod Status section for the dashboard sidebar that displays all registered pods with their current operational status. Each pod shows its name, assigned agent, and a color-coded status badge (Active=green, Idle=gray, Error=red, Learning=blue). The component must poll for status updates every 10 seconds using a server action.

## RESPONSE SCHEMA
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PodStatusSidebarOutput",
  "type": "object",
  "required": ["files_created", "files_modified", "reasoning", "implementation"],
  "properties": {
    "files_created": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "files_modified": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reasoning": {
      "type": "string",
      "minLength": 100,
      "description": "Explanation of architectural decisions made"
    },
    "implementation": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file_path", "complete_content"],
        "properties": {
          "file_path": { "type": "string" },
          "complete_content": { "type": "string" }
        }
      }
    }
  }
}
```

## CHAIN-OF-THOUGHT (Complete these steps IN ORDER)
1. Read architecture.md to confirm the sidebar component location: src/components/shared/sidebar.tsx
2. Read ui_context.md to get the exact color tokens for each status (success=#22c55e, error=#ef4444, info=#06b6d4, text-tertiary=#666666)
3. Determine if this needs "use client" — YES, because it uses polling/intervals
4. Define the Pod interface in src/types/pod.ts if it doesn't exist
5. Create the PodStatusList component that maps over pods and renders badges
6. Wire it into the existing sidebar below the navigation items
7. Add a usePodStatus hook that polls a server action every 10 seconds
8. Ensure loading state shows skeleton badges while data loads

## FILES TO CREATE/MODIFY
| File | Action | Purpose |
|------|--------|---------|
| src/types/pod.ts | Create | Pod interface with id, name, agent, status fields |
| src/hooks/usePodStatus.ts | Create | Custom hook for polling pod status |
| src/components/dashboard/pod-status-list.tsx | Create | Pod list with status badges |
| src/app/api/pods/status/route.ts | Create | API route returning pod statuses |
| src/components/shared/sidebar.tsx | Modify | Add PodStatusList below nav items |

## CONSTRAINTS (DO NOT VIOLATE)
- Do NOT use any type — Pod interface must be fully typed
- Do NOT use external state management — React hooks only
- Do NOT use WebSocket for this — simple polling via setInterval
- Do NOT create CSS files — Tailwind utility classes only
- Do NOT hardcode pod data — fetch from API route
- Do NOT skip loading/error states

## ACCEPTANCE CRITERIA
- [ ] Pod status list renders in sidebar below navigation
- [ ] Each pod shows name, agent, and color-coded status badge
- [ ] Status updates every 10 seconds without full page reload
- [ ] Loading state shows skeleton UI
- [ ] Error state shows retry button
- [ ] TypeScript strict — no errors on npm run build
- [ ] Component is "use client" with explicit return type

## COMMIT MESSAGE
feat: add real-time pod status list to dashboard sidebar

---

## EXAMPLE 2

### INPUT (Messy/Unstructured):
"make a ticket system where pods can create tickets and assign them"

### OUTPUT (Optimized Prompt):

# FEATURE: Paperclip Ticket System — Core CRUD

## CONTEXT LOADING (MANDATORY)
Read these files before proceeding:
- @context/project_overview.md
- @context/architecture.md
- @context/code_standards.md
- @context/ai_workflow_rules.md
- @context/ui_context.md
- @context/progress_tracker.md

## TASK DESCRIPTION
Implement the core Paperclip Ticket system that enables pods to create, read, update, and assign tickets within the Ghost AI workflow engine. A ticket represents a unit of work flowing between pods. It includes: title, description, priority (P0-P3), status (open/in_progress/review/blocked/complete), assigned_pod, created_by_pod, due_date, and an activity log. Build the Drizzle schema, API routes, and the tickets list page with create/edit forms.

## RESPONSE SCHEMA
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TicketSystemOutput",
  "type": "object",
  "required": ["files_created", "files_modified", "reasoning", "implementation"],
  "properties": {
    "files_created": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 5
    },
    "files_modified": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reasoning": {
      "type": "string",
      "minLength": 200
    },
    "implementation": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file_path", "complete_content"],
        "properties": {
          "file_path": { "type": "string" },
          "complete_content": { "type": "string" }
        }
      }
    }
  }
}
```

## CHAIN-OF-THOUGHT (Complete these steps IN ORDER)
1. Read architecture.md — tickets page lives at src/app/(auth)/tickets/page.tsx
2. Read code_standards.md — use Zod for all form validation, Drizzle for schema
3. Define the Ticket interface in src/types/ticket.ts with all required fields
4. Create the Drizzle schema in src/lib/db/schema/tickets.ts
5. Build API routes: GET /api/tickets, POST /api/tickets, PATCH /api/tickets/[id]
6. Create the ticket list page with DataTable component
7. Create the ticket creation form with Zod validation
8. Create the ticket detail/edit view
9. Add proper error handling and loading states on every route
10. Ensure all mutations revalidate the tickets list

## FILES TO CREATE/MODIFY
| File | Action | Purpose |
|------|--------|---------|
| src/types/ticket.ts | Create | Ticket, TicketPriority, TicketStatus types |
| src/lib/db/schema/tickets.ts | Create | Drizzle table definition |
| src/lib/validators/ticket.ts | Create | Zod schemas for create/update |
| src/app/api/tickets/route.ts | Create | GET (list) + POST (create) |
| src/app/api/tickets/[id]/route.ts | Create | GET (detail) + PATCH (update) |
| src/app/(auth)/tickets/page.tsx | Modify | Replace placeholder with ticket list |
| src/app/(auth)/tickets/loading.tsx | Modify | Proper skeleton for ticket table |
| src/components/tickets/ticket-table.tsx | Create | DataTable with sort/filter |
| src/components/tickets/ticket-form.tsx | Create | Create/edit form with validation |
| src/components/tickets/ticket-card.tsx | Create | Individual ticket card component |

## CONSTRAINTS (DO NOT VIOLATE)
- Do NOT skip Zod validation on any API input
- Do NOT use any type anywhere
- Do NOT create the database migration — only the schema definition
- Do NOT hardcode pod names — reference from a pods registry
- Do NOT use client-side fetching for the initial list — use Server Components
- Do NOT skip optimistic UI on mutations
- Do NOT forget to add proper TypeScript return types on all API routes

## ACCEPTANCE CRITERIA
- [ ] Ticket list page renders with sortable table
- [ ] Create ticket form validates all fields with Zod
- [ ] API routes handle errors gracefully with proper HTTP status codes
- [ ] Ticket status can be updated via PATCH
- [ ] Priority badges show correct colors (P0=red, P1=orange, P2=yellow, P3=gray)
- [ ] Loading states use skeleton UI
- [ ] npm run build passes with zero TypeScript errors
- [ ] All files in correct locations per architecture.md

## COMMIT MESSAGE
feat: implement Paperclip ticket system with CRUD operations and Drizzle schema

---

## EXAMPLE 3

### INPUT (Messy/Unstructured):
"add dark mode toggle"

### OUTPUT (Optimized Prompt):

# FEATURE: Theme Toggle (Dark/Light/System)

## CONTEXT LOADING (MANDATORY)
Read these files before proceeding:
- @context/project_overview.md
- @context/architecture.md
- @context/code_standards.md
- @context/ui_context.md

## TASK DESCRIPTION
Add a theme toggle button to the dashboard header that allows switching between Dark, Light, and System preference modes. Use next-themes (already installed per spec 02-editor-shell). The toggle should be a dropdown button with three options and an icon that reflects the current mode (Moon for dark, Sun for light, Monitor for system).

## RESPONSE SCHEMA
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ThemeToggleOutput",
  "type": "object",
  "required": ["files_created", "files_modified", "implementation"],
  "properties": {
    "files_created": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "files_modified": {
      "type": "array",
      "items": { "type": "string" }
    },
    "implementation": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file_path", "complete_content"],
        "properties": {
          "file_path": { "type": "string" },
          "complete_content": { "type": "string" }
        }
      }
    }
  }
}
```

## CHAIN-OF-THOUGHT (Complete these steps IN ORDER)
1. Confirm next-themes is in package.json (installed in spec 02)
2. Check if ThemeProvider already wraps the app in layout.tsx
3. Create a ThemeToggle component using the shadcn/ui DropdownMenu
4. Use useTheme() hook from next-themes to get/set theme
5. Add Moon, Sun, Monitor icons from Lucide React
6. Place the toggle in the header component (top right area)
7. Mark component as "use client" since it uses hooks

## FILES TO CREATE/MODIFY
| File | Action | Purpose |
|------|--------|---------|
| src/components/shared/theme-toggle.tsx | Create | Theme dropdown toggle component |
| src/components/shared/header.tsx | Modify | Add ThemeToggle to header actions area |
| src/app/layout.tsx | Modify | Ensure ThemeProvider wraps children (if not already) |

## CONSTRAINTS (DO NOT VIOLATE)
- Do NOT install any new packages — use existing next-themes
- Do NOT use localStorage directly — next-themes handles persistence
- Do NOT forget suppressHydrationWarning on the html element
- Do NOT use inline styles — Tailwind dark: variant classes only

## ACCEPTANCE CRITERIA
- [ ] Toggle button visible in header
- [ ] Clicking shows dropdown with Dark, Light, System options
- [ ] Selecting an option immediately changes the theme
- [ ] Theme persists across page refreshes
- [ ] Icon reflects current theme state
- [ ] No hydration mismatch errors in console
- [ ] npm run build passes cleanly

## COMMIT MESSAGE
feat: add theme toggle with dark/light/system modes to header

## Workflow

- **Plan Mode First**: Always use plan mode for non-trivial tasks (3+ steps or architectural decisions). STOP and replan if blocked.
- **Verify Everything**: Run tests, check behavior, diff changes. Never mark tasks done without proof.
- **Elegant Solutions**: For non-trivial changes, ask "is there a more elegant way?" before shipping.
- **Bug Fixes**: Autonomous. Fix the root cause, run tests to verify, don't ask for hand-holding.

## Task Management

1. Create a plan in `tasks/todo.md` with checkable items
2. Verify the plan with the user before implementing
3. Mark progress as you complete items
4. Update `tasks/lessons.md` if you make mistakes

## Learning Goals

I'm a junior developer. When solving problems, explain new concepts and architectural decisions. Help me understand the "why" behind code patterns.

---

## Input Validation Rules

- **Normalize first**: `.trim()` before checking empty/whitespace
- **Type checking**: Use `typeof x === 'string'`, `Number.isInteger()`
- **Edge cases**: Test empty strings, whitespace-only, non-numeric IDs
- **Response codes**: 400 for client errors, 500 for server errors

## Testing Approach

- Unit tests: mock Prisma, test controller logic in isolation
- Integration tests: use actual database, test full request/response
- Use `npm run test:watch` for development
- Always run full test suite before committing

## Database Gotchas

- Use `config/prisma.ts` for all Prisma operations
- Schema has cascade deletes—be careful with deletions
- Frequently queried fields (`jobId`, `flexSection`) are indexed; prioritize these in filters
- PullsheetItem has hierarchical relationships (parent-child)—watch for circular dependencies

## Common Patterns

- **File naming**: `<domain>Controller.ts`, `<domain>Routes.ts`, `<domain>Service.ts`
- **Error handling**: Try-catch at controller level; return generic error messages
- **Routing**: All endpoints prefixed with `/api`; order matters in `app.ts`

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- Always read `schema.sql` before writing any code to understand the existing database structure, types, and constraints.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. JavaScript / TypeScript / Node Quality & Verification Gates

**Always enforce the verification loop. Use `pnpm` exclusively (never `npm`, `yarn`, or `bun`).**

For any JavaScript / TypeScript / Node modifications:

1. **Package Manager**: Use `pnpm` explicitly for all package installations and script executions. Do not use `npm`, `yarn`, or `bun`.
2. **Lint & Code Style**: Run `pnpm lint` and `pnpm fmt`. Fix any remaining issues cleanly without disabling rules.
3. **Type Checking**: Run `pnpm type-check` (`tsc --noEmit`). Fix type diagnostics cleanly without using `@ts-ignore` or arbitrary `any`.
4. **Test Suite**: Run `pnpm test` (`vitest run`) to confirm all tests pass without regression.
5. **Build Verification**: Run `pnpm run build` (`next build`) to confirm production builds compile cleanly.
6. **Iterative Verification**: Keep looping through `pnpm lint`, `pnpm fmt`, `pnpm type-check`, `pnpm test`, and `pnpm run build` until all yield **0 errors, 0 warnings, and clean builds**.

**The mandatory commands that must always pass:**

- `pnpm run lint` (0 errors, 0 warnings)
- `pnpm run fmt` (0 formatting issues)
- `pnpm run type-check` (0 errors, 0 warnings)
- `pnpm test` (all tests pass)
- `pnpm run build` (clean exit 0)

## 6. Update README.md

**Always keep `README.md` in sync with codebase changes.**

- Explicitly update `README.md` whenever adding, modifying, or removing features, API endpoints, environment variables, dependencies, or workflows.
- Ensure all setup instructions, configuration options, and usage examples remain accurate and up-to-date.

## 7. Database Schema & Migrations

**Read `schema.sql` before writing code. Track changes in `migration.sql`.**

- **Inspect schema first**: Always read `schema.sql` before writing any code to understand the existing database tables, columns, relationships, types, and constraints. Never assume database structures.
- **Update migrations on schema changes**: In case the schema is modified or new tables, columns, triggers, or policies are introduced, update `schema.sql` to reflect the target state and record the corresponding migration statements in `migration.sql`.

## 8. shadcn / UI Components & Documentation

**Official shadcn docs are in the `docs/` folder. Never manually create `components/ui/` files.**

- **Official Documentation**: Canonical shadcn / UI documentation for components in this repository is kept inside the `docs/` folder (e.g., `docs/datatable.md`, `docs/pagination.md`, `docs/spinner.md`, `docs/select.md`). Always consult `docs/` first for canonical component APIs, props, and design guidelines.
- **CLI Component Addition**: NEVER create components inside the `components/ui/` directory manually. Always install and scaffold UI components using the `pnpm shadcn` CLI command (e.g., `pnpm dlx shadcn@latest add <component>` or `pnpm shadcn add <component>`). If project-specific adjustments or imports need tuning after installation, edit the CLI-generated file rather than crafting it from scratch.
- **Must use shadcn Components Over Raw HTML Tags**: Always check whether a shadcn component exists for any raw HTML tag (e.g., `<select>` -> `<Select>`, `<button>` -> `<Button>`, `<input>` -> `<Input>`, `<checkbox>` -> `<Checkbox>`, `<table>` -> `<Table>`, `<dialog>` -> `<Dialog>`). If a shadcn component exists (or is available in shadcn registry / `docs/`), you MUST use the shadcn component instead of barebone HTML tags. If not yet added to `components/ui/`, install it using `pnpm dlx shadcn@latest add <component>`.
- **No Arbitrary Bracket Values (e.g., `[70px]`)**: NEVER use raw bracket arbitrary values (e.g., `w-[70px]`, `min-w-[70px]`, `h-[30px]`, `p-[12px]`). Always use standard Tailwind design system scale utilities (e.g., `w-16`, `w-20`, `min-w-16`, `min-w-20`, `h-7`, `p-3`) or semantic theme tokens.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

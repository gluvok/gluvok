# Antigravity System Directives & Standards

## Verification & Tool Commands
Always use **pnpm** (never raw npm or yarn) for all CLI checks, test executions, linting, type checks, and builds in this codebase. **You MUST always run unit tests (`pnpm test`) after modifying code**:
- **Unit Testing (Mandatory)**: `pnpm test`
- **TypeScript Type Checking**: `pnpm exec tsc --noEmit`
- **Linting**: `pnpm lint`
- **Production Build Validation**: `pnpm build`

## Codebase Standards
1. **DRY & Reusable Helpers**: Extract repetitive database query filters, search ID extraction logic, and shared UI controls into clean utility functions/components.
2. **STRICT ENUM USAGE (NO RAW STRINGS)**:
   - **Database Schemas & Query Params**: 
     - Always use `snakeCase.table(TableName.XYZ, { ... })` with `TableName` enum for table names instead of raw string literals.
     - Always use `EntityKey` enums as keys on Drizzle ORM schema definitions (e.g., `[EntityKey.USER_ID]`, `[EntityKey.AADHAR_NUMBER]`, `[EntityKey.FATHER_NAME]`, `[EntityKey.CREATED_AT]`).
   - **Filter Options & URL Query Params**: Use `FilterValue.ALL` (instead of `"all"`) and `QueryParam.SEARCH` / `QueryParam.PAGE` / `QueryParam.LIMIT` (instead of `"search"`, `"page"`, `"limit"`).
   - **Permissions & Headers**: Use `PermissionKey` (e.g., `PermissionKey.CREATE`, `PermissionKey.WRITE`) and `RequestHeader` (e.g., `RequestHeader.USER_ID`).
   - **Form & Input Attributes**: Use `FieldType`, `AutoComplete`, and `InputStep` enums.
   - **NEVER** pass or compare raw string literals for any schema key, API parameter, header, or filter in backend routes or frontend components.
3. **DYNAMIC SORTING (NO MANUAL ORDER BY SWITCH BLOCKS)**:
   - Do NOT write manual `switch (sortColumn)` statements in API route handlers.
   - Always use the central `getOrderByClause(target, sortColumn, sortDesc, defaultColumn)` helper from `@/db/helpers` with direct `target[sortColumn]` property lookups.

## Streamlined Tenant Architecture & No Super Admin
1. **NO SUPER ADMIN ROLE**:
   - `Role.SUPER_ADMIN` is strictly forbidden and removed across the entire codebase. `Role.ADMIN` is the top-level role for a tenant.
   - Do NOT write `user.role === Role.SUPER_ADMIN` or `isSuperAdmin` anywhere in backend routes, components, or stores.
2. **NO FACTORY COLUMNS OR FACTORY FILTERS IN UI**:
   - No `Factory ID` or `Factory Name` columns in any DataTables (`configs`, `centers`, `profiles`, `customers`, `rates`, `weighments`).
   - No factory comboboxes ("All Factories") or factory filter dropdowns in table toolbars.
3. **NO FACTORIES ROUTE, API ENDPOINTS, OR STORE STATE**:
   - Factory creation/management is an out-of-band onboarding responsibility performed directly in DB tools (DataGrip/Supabase).
   - No `/api/factories` endpoints exist. `ProjectSlug.FACTORIES` is removed.
   - No `factories` array exists in the Zustand entity store, option extractors, or preloaded filters payload.
4. **AUTOMATIC FACTORY CREATION FOR SEEDING**:
   - `scripts/seed.ts` automatically creates/fetches a factory by name when seeding in Shared mode (`FACTORY_NAME="Factory A" pnpm seed --shared`). Defaults to `"Default Factory"` if omitted.
5. **STRICT SHARED VS DEDICATED ARCHITECTURE**:
   - **Shared Mode**: Queries use `sharedSchema` and automatically filter by `user.factory_id` (`where(eq(schema.factoryId, user.factory_id))`).
   - **Dedicated Mode**: Queries use `standaloneSchema` operating without `factory_id` conditions or joins.

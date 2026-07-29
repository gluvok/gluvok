# Antigravity System Directives & Standards

## Verification & Tool Commands
Always use **pnpm** (never raw npm or yarn) for all CLI checks, test executions, linting, type checks, and builds in this codebase:
- **Unit Testing**: `pnpm test`
- **TypeScript Type Checking**: `pnpm exec tsc --noEmit`
- **Linting**: `pnpm lint`
- **Production Build Validation**: `pnpm build`

## Codebase Standards
1. **DRY & Reusable Helpers**: Extract repetitive database query filters, search ID extraction logic, and shared UI controls into clean utility functions/components.
2. **STRICT ENUM USAGE (NO RAW STRINGS)**:
   - **Database Columns & Query Params**: Always import and use `EntityKey` (e.g., `EntityKey.COMMODITY_ID`, `EntityKey.ROLE`, `EntityKey.CENTER_ID`, `EntityKey.FACTORY_ID`) instead of raw strings like `"commodity_id"`, `"role"`, `"center_id"`.
   - **Filter Options & URL Query Params**: Use `FilterValue.ALL` (instead of `"all"`) and `QueryParam.SEARCH` / `QueryParam.PAGE` / `QueryParam.LIMIT` (instead of `"search"`, `"page"`, `"limit"`).
   - **Permissions & Headers**: Use `PermissionKey` (e.g., `PermissionKey.CREATE`, `PermissionKey.WRITE`) and `RequestHeader` (e.g., `RequestHeader.USER_ID`).
   - **Form & Input Attributes**: Use `FieldType`, `AutoComplete`, and `InputStep` enums.
   - **NEVER** pass or compare raw string literals for any schema key, API parameter, header, or filter in backend routes or frontend components.


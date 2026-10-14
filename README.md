This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Application Navigation

The application features a responsive sidebar (`AppSidebar`) driven by a centralized navigation registry in [`lib/navigation.ts`](lib/navigation.ts) and rendered via the unified [`NavGroup`](components/nav-group.tsx) component across main and secondary sections:

- **Main Navigation** (`mainNavItems`):
  - `Centers` (`/centers`)
  - `Entries` (`/entries`)
  - `Weighments` (`/weighments`)
  - `Customers` (`/customers`)
  - `Users` (`/users`)
  - `Settings` (`/settings`)
- **Secondary Navigation** (`secondaryNavItems`):
  - `Tickets` (`/tickets`)
  - `Support` (`/support`)
  - `Services` (`/services`)
- **User Navigation** (`NavUser`):
  - User avatar with interactive dropdown menu (Account, Notifications, Log out).

Navigation routes, metadata, and icons are centrally defined in [`lib/navigation.ts`](lib/navigation.ts) and [`lib/icons.ts`](lib/icons.ts).

The layout integrates `SidebarProvider` and `SidebarInset` with a collapsible sidebar trigger and a dynamic header page title (`AppBreadcrumb`) that reflects the current route without breadcrumb arrows. The sidebar's collapsed/expanded state is persisted across route navigations and page reloads via server-read cookies (`sidebar_state`).

## Centers Module & Data Table

The `/centers` route provides a full-featured data table built with **TanStack Table v9** powered by server-side execution directly against Supabase:

- **Backend Endpoint**: `GET /api/centers`
  - Slicing and exact counting: `?page=<N>&pageSize=<N>` (`.range()` + `{ count: "exact" }`)
  - Server-side text search: `?search=<text>` (`.ilike("name", ...)`)
  - Server-side created date range: `?from=<ISO>&to=<ISO>` (`.gte("created_at", ...)`, `.lte("created_at", ...)`)
  - Server-side multi-column sorting: `?sort=col1.asc,col2.desc` (defaults to `id.desc`, sequentially executed via `.order()`)
- **Schema Mapping**: Maps directly to `centers` table in `schema.sql` (`id`, `name`, `created_at`, `updated_at`).
- **Features**:
  - **Server-Side Multi-Column Sorting**: Support for sorting across multiple columns simultaneously with defined precedence (e.g., `Name` -> `Created At` -> `ID`).
  - **Draggable Sort Priority Reordering (`@dnd-kit`)**: When 2 or more sorts are active, sorting chips in the Unified Criteria Bar display drag handles and can be reordered via drag-and-drop powered by `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. Dropping a chip immediately reorders sort priority indices (`#1`, `#2`, `#3`), re-queries the backend with the updated precedence (`?sort=...`), and persists to `localStorage`. Fully touch-ready for mobile/tablet with press-and-hold activation constraints (`TouchSensor`: 250ms hold, 5px tolerance) so swiping to scroll horizontally remains smooth, and desktop pointer distance thresholds (`PointerSensor`: 5px).
  - **Default Backend Ordering**: The backend endpoint defaults to ordering by `id` descending (newest ID first) when no explicit sorting criteria is provided. The frontend initializes with an empty sort state (displaying no default sort chips or header badges) to eliminate user confusion; sort badges and criteria chips appear only when columns are actively sorted.
  - **Unified Active Criteria Bar**: Filters and active sort badges render together in a single compact bar (`Filters: [📅 Date Range (x)] | Sorts: [#1 # ID: ↓ Desc (x)] [#2 📅 Created At: ↑ Asc (x)] Clear all`) with individual dismiss controls and full reset actions. Filter chips display column and option icons, and sort chips display column and directional sort icons (`ArrowUp01Icon`, `ArrowDown01Icon`).
  - **Scoped Datatable Loading**: Toolbar (search, combobox, datepicker), active criteria badges, and pagination remain permanently mounted; the loading spinner is scoped exclusively to the table card area, eliminating focus loss and toolbar flicker during searches or pagination.
  - **Comfortable Density & Clean Layout**: Streamlined table rows (`h-9` rows with `py-1.5 px-3 text-xs` cell padding; `h-8 px-3` header; `px-2 py-1` criteria bar; `gap-4` and `gap-2.5` container spacing), providing comfortable breathing room and legibility while maintaining a compact vertical footprint.
  - **Unified Page Header (`components/page-header.tsx`)**: Centralized reusable header component providing standard title, description, and right-aligned reload action (`PageRefreshButton`), delivering layout consistency across all entity pages (`/centers`, `/settings`, etc.).
  - **Axios API Client**: Native `fetch` replaced with typed `axios.get()` requests.
  - **Centralized API Query Engine (`lib/api-query.ts`) & `http-status-codes`**: Standardized server-side pagination, multi-column sorting (`parseSorting`), date range filtering with inclusive end-of-day normalization (`applyDateRange`), and response formatting (`formatPaginatedResponse`) across all datatable endpoints, along with strict HTTP status code enums (`StatusCodes` from `http-status-codes`) eliminating magic numbers and duplicate routines.
  - **Modular Scalable Data Table Layer (`components/data-table/`)**: Extracted a fully reusable component layer designed to support any current or future entity data tables (`centers`, `factories`, `users`, `tickets`, etc.) while keeping `components/ui/` primitives completely untouched:
    - `useDataTable`: Generic, strongly-typed custom hook managing Zustand store persistence, date range conversion, debounced search (300ms), API query serialization, error handling, auto-fetching, and TanStack Table (`useTable`) instantiation. Eliminates hundreds of lines of duplicate data table setup across pages.
    - `DataTableHydrationCard`: Centered spinner fallback component displayed while `localStorage` state rehydrates.
    - `DataTableSearchInput`: Search input with search icon, clear button, and micro-typography.
    - `DataTableFacetedFilter`: Reusable single-select combobox filter powered by `kibo-ui/combobox` with matched option-to-input labels, leading option icons, styled at a compact `sm:w-44` width with single-line option rendering (`whitespace-nowrap`).
    - `DataTableCriteriaBar`: Unified active criteria bar encapsulating `@dnd-kit` multi-column drag-and-drop sort priority reordering and custom filter badge slots.
    - `DataTableContent`: Reusable TanStack Table container with built-in scoped loading, error/retry, and empty states.
    - `DataTablePagination`: Responsive pagination with row selection count, searchable `kibo-ui/combobox` rows-per-page selector, and connected `ButtonGroup` Previous/Next navigation controls.
    - `DataTableViewOptions`: Column visibility dropdown menu.
  - **Clear Typography, Icons & Legibility**: Toolbar controls maintain clean compact sizing, while `kibo-ui` combobox popover options and trigger render leading circular status icons (`size-3.5`) alongside `text-xs` option labels for effortless scanning and selection.
  - **Strict shadcn `<Button>` Compliance**: All interactive buttons—including search clear crosses, date range dismiss buttons, sortable chip remove triggers, and `ButtonGroup` navigation items—strictly utilize shadcn `<Button>` primitives (`variant="ghost" size="icon-xs"` or `variant="outline" size="sm"`) with zero raw `<button>` HTML elements.
  - **Clean Responsive Toolbar Layout**: Pure Tailwind CSS responsive stacking with zero JS hooks (`sm:flex-row`): on mobile (`< sm`), Search input occupies full-width (`w-full`), followed by responsive Date Picker / Columns action controls; automatically aligns to clean left-vs-right split on tablet/desktop.
  - **Date Range Picker with Responsive Dual-Calendar & Presets**: Pure Tailwind CSS adaptive popover layout with zero JS hooks: on mobile screens (`< sm`), displays a single-month calendar (`numberOfMonths={1}`) with top horizontal scrollable preset chips; on tablet/desktop (`sm+`), displays a dual-month calendar (`numberOfMonths={2}`) with left vertical preset sidebar. Eliminates horizontal popover clipping and layout shifts during hydration.
  - **Horizontally Scrollable Criteria Bar**: Active filter and multi-sort criteria chips scroll horizontally in a single sleek line (`overflow-x-auto no-scrollbar whitespace-nowrap`) on mobile with `shrink-0` chips and pin-right "Clear all", preventing multi-row badge stacking and keeping the table visible above the fold.
  - **Fluid Responsive Pagination with ButtonGroup**: Clean 2-row layout on mobile viewports: selection summary on row 1 and spaced rows-per-page, page count, and icon-only previous/next controls connected in a unified `ButtonGroup` on row 2, smoothly transitioning to single-line on desktop.
  - **Server-Side Pagination**: TanStack Table `manualPagination` with `kibo-ui/combobox` rows-per-page selector (`10, 20, 30, 40, 50`) and connected Previous/Next buttons via `ButtonGroup`.
  - **Accurate Selection Counter**: Selection count displays `{selectedCount} of {currentRowsCount} row(s) selected.` representing the number of rows currently in the datatable on this page.
  - **Unified Multi-Table State Persistence**: Powered by Zustand (`stores/use-data-table-store.ts`) with `persist` middleware storing all entity tables (`centers`, `entries`, etc.) under a single `localStorage` key (`gluvok-tables-state`). Retains `search`, `filters`, `dateRange`, `sorting`, `pagination`, and `columnVisibility` across browser restarts and route transitions.
  - **Zero Layout Shift Hydration Guard**: Utilizes `useTableHydrated` hook to render a centered spinner card until `localStorage` rehydration completes, ensuring zero layout shift, zero flash of default state, and zero duplicate API requests.
  - **Column Visibility & Actions**: Columns dropdown toggle, indeterminate select-all checkbox, and row actions dropdown (`Copy Center ID`, `Copy Center Name`).

## Settings Module & Factory Configuration

The `/settings` route provides facility configuration controls powered by the unified `/api/factories` endpoint:

- **Backend Endpoint**: `GET /api/factories` and `PATCH /api/factories`
  - Current-tenant preview hardcoded to Factory ID `1` (architected for seamless migration to session-based authentication).
  - Strict validation using **Zod** (`updateFactorySchema.strict()`): validates `name` (min 1 character) and `receipt_images_per_row` (integer between 1 and 6). Strict rejection with HTTP 400 on unexpected or invalid keys.
- **Schema Mapping**: Maps to `factories` table in `schema.sql` (`id`, `name`, `receipt_images_per_row`, `created_at`, `updated_at`). `camera_crops` and `check_center_on_merge` have been removed from the schema and recorded in `migration.sql`.
- **Features & UX**:
  - **Cohesive Constrained Layout (`max-w-3xl`)**: Constrained layout width prevents overly stretched form fields on wide displays and aligns `<PageRefreshButton>` directly with the top right of `<FactoryCard>`.
  - **Unified Page Header & Reload**: Standard `<PageHeader>` with "Settings" title, descriptive subtitle, and integrated `PageRefreshButton`.
  - **Clean Loading State**: Renders a centered `<Spinner />` with status message during initial data fetching, eliminating empty card shells.
  - **Dedicated Iconography**: Factory card uses `Factory01Icon` (distinct from Center's `Building01Icon`), Receipt Images uses `ImagesIcon` in the field label (distinct from the 1 per row option `Image01Icon`), and each receipt image row option (1–6) renders specialized layout/grid icons (`Image01Icon`, `LayoutTwoColumnIcon`, `LayoutThreeColumnIcon`, `Grid2x2Icon`, `Layout05Icon`, `Grid3x2Icon`) with dynamic trigger synchronization.
  - **Input Controls**: `<Input>` for factory name and searchable `kibo-ui/combobox` (values 1–6) for receipt snapshot row layout.
  - **Base UI Toast Feedback**: Integrated notification system powered by `@base-ui/react/toast` with `<Toaster />` anchored at the **top-right** (`top-4 right-4`), featuring fluid downward stack animations, upward swipe dismiss, custom typography (`font-heading` for titles and `font-sans` for descriptions), and semantic status colors (Emerald for success, Amber for warning, Destructive red for error, and Sky blue for info).
  - **Client-Side Zod Validation**: Form validates against `updateFactorySchema` before dispatching updates.
  - **Dirty State Tracking**: Save Changes and Reset buttons detect client form changes with disabled controls when pristine, `<Spinner>` indicators during requests, and inline timestamp tracking.

## Users & Customers Administration

Administrative users (`/users`) and agricultural customers (`/customers`) are powered by the unified `/api/users` endpoint and single-source `UsersDataTable` architecture (`roleScope="staff" | "customer"`):

- **Backend Endpoints**: `GET`, `POST`, `PATCH`, `DELETE /api/users`
  - **`GET /api/users`**: Multi-column sorting (`id`, `username`, `name`, `role`, `created_at`, `updated_at`), search (across `name` and `username`), role filter, date range filter, and server-side pagination with exact total counts. Defaults to factory staff accounts (`role NOT IN ('customer', 'hardware')`) unless a specific role filter like `?role=customer` is requested. Excludes `password_hash` from the response.
  - **`POST /api/users`**: Strict Zod validation (`username`, `name`, `role`, `password`), enforces username uniqueness across active accounts (`deleted_at IS NULL`), hashes passwords with Argon2id, and provisions the user for Factory ID 1. Supports creating staff as well as customer accounts.
  - **`PATCH /api/users`**: Validates input, verifies username uniqueness if updated, optionally resets and re-hashes passwords with Argon2id when provided, and updates user profile and role with strict role safety (customer accounts cannot be upgraded to staff roles, and staff accounts cannot become customer accounts).
  - **`DELETE /api/users`**: Supports single (`id`) and bulk (`ids`) deletion. Performs constant O(1) batched pre-flight integrity checks partitioned by role:
    - **Staff Users**: verified against `entries.created_by` and `tickets.user_id`.
    - **Customer Users**: verified against `entries.customer_id`.
      Blocks deletion with HTTP 409 Conflict if linked historical records exist. Soft-deletes (`deleted_at: NOW()`) when safe.
  - **Unified Page Layout (`components/page-layout.tsx`)**: Consolidated repeated page container wrappers (`<div className="flex flex-col gap-4">`) across all datatable and settings pages (`/users`, `/customers`, `/centers`, `/settings`) with standardized header and metadata presentation.
  - **Optional & Co-Dependent Customer Credentials**: Customers (`role = 'customer'`) can be registered with or without portal login credentials:
    - **Direct Portal Access Switch**: Defaults cleanly to an "Enable Customer Portal Access" switch, displaying username and password fields only when enabled.
    - **Flexible Co-Dependent Validation**: If a portal username is set, a password is mandatory; if a password is set, a username is mandatory; if neither is provided, only the customer's full name is required for delivery ticket tracking. Staff accounts retain strictly mandatory credentials.
    - **Database Integrity**: Backed by `chk_staff_credentials` check constraint (`role = 'customer' OR (username IS NOT NULL AND password_hash IS NOT NULL)`) and partial unique index `idx_users_username_active` on non-null usernames.
  - **Modular Architecture & Service Extraction**: Decomposed large files into single-responsibility modules:
    - `app/api/users/service.ts`: Centralizes database queries, Argon2id hashing, and constant O(1) batched conflict checks, keeping `app/api/users/route.ts` as a sleek HTTP routing controller.
    - `app/settings/factory-form.tsx`: Encapsulates the 2-column configuration grid and a clean 2-column metadata strip (Created On, Last Modified).
  - **Design System & Japanese Aesthetic Theme (Rikyū-cha 利休茶)**:
    - Root primary accent uses authentic **Rikyū-cha** roasted matcha / tea moss green (`#66684F` / `rgb(102, 104, 79)`) with pure white text (`#FFFFFF`) and dark hover state (`#52543D`).
    - Dark mode dynamically switches to luminous tea moss (`#8A8D6E`) with charcoal foreground (`#1A1C14`) ensuring optimal readability and contrast across all card and modal surfaces.
    - Synchronized across buttons, sidebar active navigation pills, focus rings, and action highlights.
  - **Shared Form Dirty State Indicator (`components/form-dirty-indicator.tsx`)**:
    - Extracted a reusable, zero-prop-bloat indicator component encapsulating the pulsing status dot (`bg-amber-500 animate-pulse` when dirty vs `bg-emerald-500` when clean) and status label (`"You have unsaved changes."` vs `"All changes saved."`).
    - Standardized across `app/settings/factory-card.tsx` and `app/users/user-dialog-primitives.tsx` (`UserDialogShell`).
  - **Standardized Centered Loading State (`components/loading-state.tsx`)**:
    - Extracted a reusable loading pane (`<LoadingState message="..." className="..." />`) encapsulating the centered `Spinner` (`size-6 text-muted-foreground`) and text caption (`text-xs text-muted-foreground`).
    - Consistently used across `components/data-table/data-table-content.tsx`, `components/data-table/data-table-hydration-card.tsx`, and `app/settings/factory-card.tsx`.
  - **Service Layer Deduplication (`app/api/users/service.ts`)**:
    - Single-source column projection constant (`USER_SELECT_PROJECTION = "id, username, name, role, factory_id, created_at, updated_at"`).
    - Unified username availability assertion helper (`assertUsernameAvailable(username, excludeId)`), eliminating ~35 lines of duplicated query logic and error-handling boilerplate.
    - Generalized relational frequency counting helper (`countOccurrences(items, key)`), eliminating 3 repetitive counting loops in `deleteUserAccounts`.
    - Enforced `StatusCodes` from `http-status-codes` across all error paths, eliminating raw numeric status literals.
  - **Zero-Branching Component & Type Architecture (Strict DRY Compliance)**:
    - **Atomic Form Primitives (`app/users/user-dialog-primitives.tsx`)**: Extracted `UserDialogShell`, `FullNameField`, `CredentialsFields`, `CustomerPortalSwitch`, and `SystemRoleSelect`.
    - **Dedicated Dialogs**: Eliminated the redundant `user-form-dialog.tsx` wrapper; callers consume dedicated dialogs directly via `ENTITY_CONFIG`:
      - `StaffUserDialog`: Renders Full Name & System Role side-by-side, plus Username & Password side-by-side (`sm:grid-cols-2`), validated by `createStaffUserSchema` / `updateStaffUserSchema`.
      - `CustomerUserDialog`: Renders Full Name full-width, Customer Portal Access toggle, and credentials conditionally, validated by `createCustomerUserSchema` / `updateCustomerUserSchema`.
    - **Zod Discriminated Unions (`app/users/types.ts`)**:
      - Separated schemas into `createStaffUserSchema` (strictly requires username and password) and `createCustomerUserSchema` (handles customer portal access rules).
      - Combined via `createUserSchema = z.discriminatedUnion("role", [...])` and `updateUserSchema = z.discriminatedUnion("role", [...])`, completely eliminating runtime `if (isCustomer)` checks in schema validation.
    - **Declarative API Routing & Domain Services**:
      - `app/api/users/route.ts`: Replaced ternary message checks with a typed lookup dictionary (`ROLE_ENTITY_LABELS`).
      - `app/api/users/service.ts`: Enforces domain tier conversions with domain predicate comparisons and standardized `StatusCodes` from `http-status-codes`.
    - **Configuration-Driven Data Table (`ENTITY_CONFIG`)**: `UsersDataTable` consumes a centralized typed configuration dictionary mapping table IDs, singular/plural labels, search placeholders, add labels, role filter flags, and dialog constructors, eliminating all inline conditionals from the table render tree.
  - **Universal Comboboxes & Subtle Role Iconography**:
    - System Role dropdown utilizes `kibo-ui/combobox` with search and leading role icons (`Admin`: `CrownIcon`, `Manager`: `Briefcase01Icon`, `Operator`: `HeadsetIcon`, `Base User`: `UserIcon`).
    - Subtly tinted badges in the data table: Admin uses refined Slate/Neutral (violet/purple removed), and Manager, Operator, Base User use gentle 5% background tints and soft muted borders.
    - Hardware accounts are completely hidden from filter dropdowns and strictly rejected/ignored in backend filtering.
  - **Modal Ergonomics, Form Validation & Credential Revocation Safeguards**:
    - **Visual Mandatory Asterisks (`*`) & Notice**: Required fields display `<span className="text-destructive font-semibold">*</span>`, accompanied by `"Fields marked with * are required."` in the dialog header.
    - **Direct Zod-Driven Button State (`isValid`)**: The Save Changes button remains visible in modal footers to prevent jarring layout shifts, but is strictly disabled (`disabled={!isDirty || !isValid || isSubmitting}`) until `schema.safeParse(payload).success` evaluates to true.
    - **Customer Portal Revocation Safeguards**:
      - Toggling OFF portal access on an existing active portal user displays an amber warning banner informing the user that login credentials will be revoked.
      - In `app/api/users/service.ts`, clearing a customer's `username` (`null`) automatically clears `password_hash` (`null`), preventing orphan password hashes from persisting.
    - **Responsive Side-by-Side Layout (`sm:grid-cols-2`)**: Full Name + System Role side-by-side, and Username + Password side-by-side on desktop/tablet, stacking naturally on mobile (`sm:max-w-lg` container).
    - Far-left pinned dirty state badge using `<FormDirtyIndicator>` in modal footers.
    - Error banner renders leading `AlertCircleIcon` with accessible alert styling.
    - `Cancel01Icon` leading icon on all modal Cancel buttons.
    - Compact, single-line field descriptions designed for clear scanning without wrapping.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database Seeding

To seed the database with test data matching `schema.sql`:

```bash
# Onboard a new client (provisions a new Factory, auto-indexed Admin, Center, and 1:1 Hardware Pi)
pnpm run seed

# Onboard a client with options (custom factory name, multiple centers, etc.)
pnpm run seed -- --factory "Acme Logistics" --centers 2

# Seed full test demo fixtures (idempotent / additive)
pnpm run seed:test

# Clean reset and re-seed all tables & sequence counters with test fixtures
pnpm run seed:test:clean
```

### High-Volume Test Data & Pagination

Running `pnpm run seed:test` or `pnpm run seed:test:clean` provisions high-volume fixtures specifically tailored for testing TanStack Table pagination, column sorting, and filtering:

- **Zero N+1 Batch Architecture**: All database seeding routines strictly enforce constant O(1) batched lookups (`.in(...)`) and bulk insertions (`.insert([...])`) across factories, users, centers, commodities, customers, entries, weighments, and tickets.
- **Factories**: 2 (`Default Factory`, `Apex Agro Logistics`)
- **Users**: Staff, hardware, and customer accounts in users table
- **Centers**: 50 (35 in Factory 1, 15 in Factory 2) with staggered `created_at` dates (ideal for testing 10, 20, 30, 40, and 50 page sizes)
- **Commodities**: 20 bulk agricultural commodities
- **Customers**: 50 customer accounts (`role: customer` in `users` table)
- **Entries**: 100 entries (60 paired for weighment cycles + 40 standalone entries)
- **Weighments**: 30 linked inbound/outbound cycles
- **Tickets**: 40 support tickets (20 linked to entries, 20 linked to weighments)

### Seeded Test Credentials

**Factory 1 (`Default Factory`)**:

- **Admin**: `admin1` / `admin123`
- **Manager**: `manager1` / `manager123`
- **Operator**: `operator1`, `operator3`, `operator4`, `operator5` / `operator123`
- **Customer**: `customer1`, `customer2`, `customer3`, `customer4`, `customer5` / `user123`
- **Hardware (Edge Scale)**: `pi1`, `pi3`, `pi4`, `pi5`, `pi6` / `hardware123`

**Factory 2 (`Apex Agro Logistics`)**:

- **Admin**: `admin2` / `admin123`
- **Manager**: `manager2` / `manager123`
- **Operator**: `operator2`, `operator6` / `operator123`
- **Customer**: `customer6`, `customer7`, `customer8`, `customer9`, `customer10` / `user123`
- **Hardware (Edge Scale)**: `pi2`, `pi7`, `pi8` / `hardware123`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

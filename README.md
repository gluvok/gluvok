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
  - Server-side auto-approve filter: `?auto_approve=true|false|all` (`.eq("auto_approve", ...)`)
  - Server-side created date range: `?from=<ISO>&to=<ISO>` (`.gte("created_at", ...)`, `.lte("created_at", ...)`)
  - Server-side multi-column sorting: `?sort=col1.asc,col2.desc` (defaults to `id.desc`, sequentially executed via `.order()`)
- **Schema Mapping**: Maps directly to `centers` table in `schema.sql` (`id`, `name`, `auto_approve`, `created_at`, `updated_at`).
- **Features**:
  - **Server-Side Multi-Column Sorting**: Support for sorting across multiple columns simultaneously with defined precedence (e.g., `Auto Approve` -> `Created At` -> `Name`).
  - **Draggable Sort Priority Reordering (`@dnd-kit`)**: When 2 or more sorts are active, sorting chips in the Unified Criteria Bar display drag handles and can be reordered via drag-and-drop powered by `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. Dropping a chip immediately reorders sort priority indices (`#1`, `#2`, `#3`), re-queries the backend with the updated precedence (`?sort=...`), and persists to `localStorage`. Fully touch-ready for mobile/tablet with press-and-hold activation constraints (`TouchSensor`: 250ms hold, 5px tolerance) so swiping to scroll horizontally remains smooth, and desktop pointer distance thresholds (`PointerSensor`: 5px).
  - **Default Backend Ordering**: The backend endpoint defaults to ordering by `id` descending (newest ID first) when no explicit sorting criteria is provided. The frontend initializes with an empty sort state (displaying no default sort chips or header badges) to eliminate user confusion; sort badges and criteria chips appear only when columns are actively sorted.
  - **Unified Active Criteria Bar**: Filters and active sort badges render together in a single compact bar (`Filters: [⏻ Auto Approve: ✓ Enabled (x)] | Sorts: [#1 # ID: ↓ Desc (x)] [#2 📅 Created At: ↑ Asc (x)] Clear all`) with individual dismiss controls and full reset actions. Filter chips display column and option icons, and sort chips display column and directional sort icons (`ArrowUp01Icon`, `ArrowDown01Icon`).
  - **Scoped Datatable Loading**: Toolbar (search, combobox, datepicker), active criteria badges, and pagination remain permanently mounted; the loading spinner is scoped exclusively to the table card area, eliminating focus loss and toolbar flicker during searches or pagination.
  - **Comfortable Density & Clean Layout**: Streamlined table rows (`h-9` rows with `py-1.5 px-3 text-xs` cell padding; `h-8 px-3` header; `px-2 py-1` criteria bar; `gap-4` and `gap-2.5` container spacing), providing comfortable breathing room and legibility while maintaining a compact vertical footprint.
  - **Unified Page Header (`components/page-header.tsx`)**: Centralized reusable header component providing standard title, description, and right-aligned reload action (`PageRefreshButton`), delivering layout consistency across all entity pages (`/centers`, `/settings`, etc.).
  - **Axios API Client**: Native `fetch` replaced with typed `axios.get()` requests.
  - **Modular Scalable Data Table Layer (`components/data-table/`)**: Extracted a fully reusable component layer designed to support any current or future entity data tables (`centers`, `factories`, `users`, `tickets`, etc.) while keeping `components/ui/` primitives completely untouched:
    - `DataTableSearchInput`: Search input with search icon, clear button, and micro-typography.
    - `DataTableFacetedFilter`: Reusable single-select combobox filter powered by `kibo-ui/combobox` with matched option-to-input labels (`All Auto Approve`, `Enabled`, `Disabled`), leading option icons (`ToggleOnIcon` matching Auto Approve, `CheckmarkCircle02Icon` for Enabled, `CancelCircleIcon` for Disabled), styled at a compact `sm:w-44` width with single-line option rendering (`whitespace-nowrap`).
    - `DataTableCriteriaBar`: Unified active criteria bar encapsulating `@dnd-kit` multi-column drag-and-drop sort priority reordering and custom filter badge slots.
    - `DataTableContent`: Reusable TanStack Table container with built-in scoped loading, error/retry, and empty states.
    - `DataTablePagination`: Responsive pagination with row selection count, Base UI rows-per-page selector, and connected `ButtonGroup` Previous/Next navigation controls.
    - `DataTableViewOptions`: Column visibility dropdown menu.
  - **Clear Typography, Icons & Legibility**: Toolbar controls maintain clean compact sizing (`sm:w-44` combobox width), while `kibo-ui` combobox popover options and trigger render leading circular status icons (`size-3.5`) alongside `text-xs` option labels for effortless scanning and selection.
  - **Refined Status Badges**: `Enabled` and `Disabled` badges in the Auto Approve column are styled at `text-2xs` font size with compact `px-1.5 py-0.5` padding, standard `h-5` height, and `size-2.5` enclosed circular status icons (`CheckmarkCircle02Icon`, `CancelCircleIcon`), integrating harmoniously into table rows.
  - **Strict shadcn `<Button>` Compliance**: All interactive buttons—including search clear crosses, date range dismiss buttons, sortable chip remove triggers, and `ButtonGroup` navigation items—strictly utilize shadcn `<Button>` primitives (`variant="ghost" size="icon-xs"` or `variant="outline" size="sm"`) with zero raw `<button>` HTML elements.
  - **Clean Responsive Toolbar Layout**: Pure Tailwind CSS responsive stacking with zero JS hooks (`sm:flex-row`): on mobile (`< sm`), Search input occupies full-width (`w-full`), followed by full-width Auto Approve combobox, and responsive Date Picker / Columns action controls; automatically aligns to clean left-vs-right split on tablet/desktop.
  - **Date Range Picker with Responsive Dual-Calendar & Presets**: Pure Tailwind CSS adaptive popover layout with zero JS hooks: on mobile screens (`< sm`), displays a single-month calendar (`numberOfMonths={1}`) with top horizontal scrollable preset chips; on tablet/desktop (`sm+`), displays a dual-month calendar (`numberOfMonths={2}`) with left vertical preset sidebar. Eliminates horizontal popover clipping and layout shifts during hydration.
  - **Horizontally Scrollable Criteria Bar**: Active filter and multi-sort criteria chips scroll horizontally in a single sleek line (`overflow-x-auto no-scrollbar whitespace-nowrap`) on mobile with `shrink-0` chips and pin-right "Clear all", preventing multi-row badge stacking and keeping the table visible above the fold.
  - **Fluid Responsive Pagination with ButtonGroup**: Clean 2-row layout on mobile viewports: selection summary on row 1 and spaced rows-per-page, page count, and icon-only previous/next controls connected in a unified `ButtonGroup` on row 2, smoothly transitioning to single-line on desktop.
  - **Server-Side Pagination**: TanStack Table `manualPagination` with Base UI `Select` rows-per-page selector (`10, 20, 30, 40, 50`) and connected Previous/Next buttons via `ButtonGroup`.
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
  - **Unified Page Header & Reload**: Standard `<PageHeader>` with "Settings" title, descriptive subtitle, and integrated `PageRefreshButton`.
  - **Unified Full-Width Card**: Spans full width (`w-full`) matching datatable page breadths, featuring a balanced 2-column responsive form grid on desktop viewports (`grid-cols-1 md:grid-cols-2`) and a 3-column facility metadata stat strip (`grid-cols-1 sm:grid-cols-3`).
  - **Clean Loading State**: Renders a centered `<Spinner />` with status message during initial data fetching, eliminating empty card shells.
  - **Dedicated Iconography**: Factory card uses `Factory01Icon` (distinct from Center's `Building01Icon`), Receipt Images uses `Image01Icon` (distinct from combobox All icon), and registered in `lib/icons.ts`.
  - **Input Controls**: `<Input>` for factory name and Base UI `<Select>` (values 1–6) for receipt snapshot row layout.
  - **Base UI Toast Feedback**: Integrated notification system powered by `@base-ui/react/toast` with `<Toaster />` in the root layout, delivering instant alerts on settings save and error events.
  - **Client-Side Zod Validation**: Form validates against `updateFactorySchema` before dispatching updates.
  - **Dirty State Tracking**: Save Changes and Reset buttons detect client form changes with disabled controls when pristine, `<Spinner>` indicators during requests, and inline timestamp tracking.

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

- **Factories**: 2 (`Default Factory`, `Apex Agro Logistics`)
- **Users**: 28 across all 5 roles (`admin`, `manager`, `operator`, `base`, `hardware`)
- **Centers**: 50 (35 in Factory 1, 15 in Factory 2) with varied `auto_approve` flags and staggered `created_at` dates (ideal for testing 10, 20, 30, 40, and 50 page sizes)
- **Commodities**: 20 bulk agricultural commodities
- **Customers**: 50 customer profiles
- **Entries**: 100 entries (60 paired for weighment cycles + 40 standalone with `pending`, `approved`, and `rejected` statuses)
- **Weighments**: 30 linked inbound/outbound cycles
- **Tickets**: 40 support tickets (20 linked to entries, 20 linked to weighments)

### Seeded Test Credentials

**Factory 1 (`Default Factory`)**:

- **Admin**: `admin1` / `admin123`
- **Manager**: `manager1` / `manager123`
- **Operator**: `operator1`, `operator3`, `operator4`, `operator5` / `operator123`
- **Customer (Base)**: `customer1`, `customer2`, `customer3`, `customer4`, `customer5` / `user123`
- **Hardware (Edge Scale)**: `pi1`, `pi3`, `pi4`, `pi5`, `pi6` / `hardware123`

**Factory 2 (`Apex Agro Logistics`)**:

- **Admin**: `admin2` / `admin123`
- **Manager**: `manager2` / `manager123`
- **Operator**: `operator2`, `operator6` / `operator123`
- **Customer (Base)**: `customer6`, `customer7`, `customer8`, `customer9`, `customer10` / `user123`
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

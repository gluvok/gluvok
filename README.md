This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Application Navigation

The application features a responsive sidebar (`AppSidebar`) composed of three main navigation sections:

- **Nav Main**:
  - `Centers` (`/centers`)
  - `Entries` (`/entries`)
  - `Weighments` (`/weighments`)
  - `Customers` (`/customers`)
  - `Users` (`/users`)
  - `Settings` (`/settings`)
- **Nav Secondary**:
  - `Tickets` (`/tickets`)
  - `Support` (`/support`)
  - `Services` (`/services`)
- **Nav User**:
  - User avatar with interactive dropdown menu (Account, Notifications, Log out).

Navigation and module icons are centrally mapped in [`lib/icons.ts`](lib/icons.ts).

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
  - **Priority Indicators & Contextual Headers**: Column headers display directional arrows (`ArrowUp01Icon`, `ArrowDown01Icon`) alongside circular priority index badges (`#1`, `#2`, `#3`). Shift+click toggles multi-sorting directly; dropdown menus offer contextual actions ("Sort only: Asc/Desc", "Add to sort (Asc/Desc)", "Remove from sort").
  - **Default Sort**: Tables default to `id: desc` (highest/newest ID first) for deterministic ordering.
  - **Unified Active Criteria Bar**: Filters and active sort badges render together in a single compact bar (`Filters: [...] | Sorts: [#1 Auto Approve: Asc (x)] [#2 Created At: Desc (x)] Clear all`) with individual dismiss controls and full reset actions.
  - **Scoped Datatable Loading**: Toolbar (search, combobox, datepicker), active criteria badges, and pagination remain permanently mounted; the loading spinner is scoped exclusively to the table card area, eliminating focus loss and toolbar flicker during searches or pagination.
  - **Compact Density & Zero-Scroll Fit**: Ultra-streamlined table rows (`h-8` rows with `py-1 px-3 text-xs` cell padding; `h-8 px-3` header; `px-2 py-1` criteria bar; `gap-4` and `gap-2.5` container spacing), ensuring all rows, active criteria badges, and pagination controls fit comfortably within standard viewports with zero vertical page scrolling.
  - **Page Header Refresh Button**: Dedicated reload button (`CentersRefreshButton`) located on the complete right side of the "Centers" heading, invoking a full page reload (`window.location.reload()`).
  - **Axios API Client**: Native `fetch` replaced with typed `axios.get()` requests.
  - **Micro-Filter Typography & Density (`text-2xs`)**: Toolbar filter controls (Search input, Auto Approve combobox, Date Range Picker trigger, Columns view options) are uniformly styled with `text-2xs` (10px / 0.625rem) typography, maximizing data visibility and visual hierarchy against standard `text-xs` (12px) table contents.
  - **Refined Status Badges**: `Enabled` and `Disabled` badges in the Auto Approve column are styled at `text-2xs` font size with compact `px-1.5 py-0.5` padding, standard `h-5` height, and `size-2.5` inline status icons, integrating harmoniously into compact `h-8` table rows.
  - **Strict shadcn `<Button>` Compliance**: All interactive buttons—including search clear crosses, date range dismiss buttons, and sortable chip remove triggers—strictly utilize shadcn `<Button>` primitives (`variant="ghost" size="icon-xs"`) with zero raw `<button>` HTML elements.
  - **Clean Responsive Toolbar Layout**: Pure Tailwind CSS responsive stacking with zero JS hooks (`sm:flex-row`): on mobile (`< sm`), Search input occupies full-width (`w-full`), followed by full-width Auto Approve combobox, and responsive Date Picker / Columns action controls; automatically aligns to clean left-vs-right split on tablet/desktop.
  - **Date Range Picker with Responsive Dual-Calendar & Presets**: Pure Tailwind CSS adaptive popover layout with zero JS hooks: on mobile screens (`< sm`), displays a single-month calendar (`numberOfMonths={1}`) with top horizontal scrollable preset chips; on tablet/desktop (`sm+`), displays a dual-month calendar (`numberOfMonths={2}`) with left vertical preset sidebar. Eliminates horizontal popover clipping and layout shifts during hydration.
  - **Horizontally Scrollable Criteria Bar**: Active filter and multi-sort criteria chips scroll horizontally in a single sleek line (`overflow-x-auto no-scrollbar whitespace-nowrap`) on mobile with `shrink-0` chips and pin-right "Clear all", preventing multi-row badge stacking and keeping the table visible above the fold.
  - **Fluid Responsive Pagination**: Clean 2-row layout on mobile viewports: selection summary on row 1 and spaced rows-per-page, page count, and icon-only previous/next controls on row 2, smoothly transitioning to single-line on desktop.
  - **Server-Side Pagination**: TanStack Table `manualPagination` with Base UI `Select` rows-per-page selector (`10, 20, 30, 40, 50`) and spaced Previous/Next buttons (`gap-2`).
  - **Accurate Selection Counter**: Selection count displays `{selectedCount} of {currentRowsCount} row(s) selected.` representing the number of rows currently in the datatable on this page.
  - **Auto Approve Combobox**: Base UI Combobox component for filtering by Auto Approve status.
  - **Unified Multi-Table State Persistence**: Powered by Zustand (`stores/use-data-table-store.ts`) with `persist` middleware storing all entity tables (`centers`, `entries`, etc.) under a single `localStorage` key (`gluvok-tables-state`). Retains `search`, `filters`, `dateRange`, `sorting`, `pagination`, and `columnVisibility` across browser restarts and route transitions.
  - **Zero Layout Shift Hydration Guard**: Utilizes `useTableHydrated` hook to render a centered spinner card until `localStorage` rehydration completes, ensuring zero layout shift, zero flash of default state, and zero duplicate API requests.
  - **Column Visibility & Actions**: Columns dropdown toggle, indeterminate select-all checkbox, and row actions dropdown (`Copy Center ID`, `Copy Center Name`).

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

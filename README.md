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
  - Server-side sorting: `?sort=<col>&order=asc|desc` (`.order(...)`)
- **Schema Mapping**: Maps directly to `centers` table in `schema.sql` (`id`, `name`, `auto_approve`, `created_at`, `updated_at`).
- **Features**:
  - **Zero Layout Shift Loading**: Clean centered `Spinner` card during data fetch; mounts table headers, rows, and pagination simultaneously only after data is ready.
  - **Compact & Sleek Height**: Streamlined row styling (`h-9` rows with `py-1.5 px-3` cell padding; `h-9 px-3` header) for an efficient data display.
  - **Page Header Refresh Button**: Dedicated reload button (`CentersRefreshButton`) located on the complete right side of the "Centers" heading, invoking a full page reload (`window.location.reload()`).
  - **Axios API Client**: Native `fetch` replaced with typed `axios.get()` requests.
  - **Debounced Search Hook**: Reusable `useDebounce` custom hook (`hooks/use-debounce.ts`) with a 300ms debounce.
  - **Decluttered Toolbar & Active Filter Chips**: Clear top toolbar with Search, Auto-Approve Combobox, and DatePickerWithRange on the left; View Options on the right. When filters are active, displays responsive `<Badge variant="secondary">` chips with individual dismiss buttons and a "Clear all" action.
  - **Server-Side Pagination**: TanStack Table `manualPagination` with Base UI `Select` rows-per-page selector (`10, 20, 30, 40, 50`) and spaced Previous/Next buttons (`gap-2`).
  - **Accurate Selection Counter**: Selection count displays `{selectedCount} of {currentRowsCount} row(s) selected.` representing the number of rows currently in the datatable on this page.
  - **Auto Approve Combobox**: Base UI Combobox component for filtering by Auto Approve status.
  - **Date Picker Range**: `DatePickerWithRange` component featuring shadcn `Field` and `FieldLabel`, Base UI `Popover`, 2-month side-by-side calendar (`numberOfMonths={2}`), and Hugeicons `Calendar01Icon` with server-side date range filtering.
  - **Column Visibility & Sorting**: Columns dropdown toggle and asc/desc header sorting.
  - **Row Selection & Actions**: Indeterminate select-all checkbox and row actions dropdown (`Copy Center ID`, `Copy Center Name`).

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

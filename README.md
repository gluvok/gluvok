# Gluvok

Industrial Weighing, Procurement & Multi-Tenant Center Management System.

Gluvok is a high-performance operations platform designed for factories, weighbridges, and agricultural/commodity collection centers. It automates ticket generation, weighment tracking (gross, tare, and net weights), rate computation, customer accounts, and camera/sensor device integrations.

---

## Features

- **Multi-Tenant Factory Isolation**: Complete data separation across factories (`factory_id` scoping) with PostgreSQL Row Level Security (RLS).
- **Role-Based Access Control (RBAC)**: Fine-grained permission model supporting `admin`, `manager`, `operator`, `base`, and edge `hardware` roles. Edge IoT devices authenticate as dedicated hardware users scoped to factories (`role = 'hardware'`), with physical collection centers specified on weighment entries (`center_id`). See [PERMISSIONS.md](PERMISSIONS.md) for the complete access matrix.
- **Weighbridge Lifecycle Management**:
  - Unassigned, Inbound (gross), and Outbound (tare/net) weighing cycles.
  - Automatic net weight and total price calculation.
  - Indian vehicle registration number validation supporting standard state series (e.g. `MH12AB1234`, `TG09AB1234`), Bharat series (`22BH1234AA`), vintage series (`DLVAAB0001`), 1-to-4 digit numbers, and early letter-less RTO series.
- **Ticketing & Approval Workflow**: Automated ticket generation for center entries with status tracking (`pending`, `approved`, `rejected`), with explicit `created_by` and `approved_by` audit fields. Entry approval strictly enforces valid Indian vehicle registration format, preventing approval of entries with unreadable or missing plates (`NO_PLATE_DETECTED`) until corrected.
- **Commodity & Rate Masters**: Dynamic rate configuration per commodity and center.
- **Hardware & IoT Ingestion**: High-throughput API workflows for Raspberry Pi scales and automated license plate recognition (ALPR) cameras. Devices authenticate via HTTP Basic Auth (`username`/`password`) or session Bearer tokens, bound to physical collection centers, capturing an immutable point-in-time center snapshot. See [docs/raspberry_pi_curl.md](docs/raspberry_pi_curl.md) and [docs/postman_hardware_testing.md](docs/postman_hardware_testing.md).
- **Data Export**: Built-in CSV and PDF export capabilities for audit reports and center registries.
- **Database-Backed Session & Instant Revocation Model**:
  - Central `sessions` table tracks active tokens (`id`, `token`, `user_id`, `expires_at`, `created_at`, `updated_at`, `deleted_at`) for 0-second instant revocation upon logout, password updates, or account deactivation/deletion (enforced by both application routes and PostgreSQL database triggers).
  - Web UI Personnel: HTTP-only secure cookie-based session tokens with 400-day sliding expiration (RFC 6265bis browser maximum), automatically refreshed in lockstep in both the database and cookies upon active usage (`GET /api/auth/me`).
  - Edge Ingestion Devices: HTTP Basic Auth (`Authorization: Basic <credentials>`), multipart form-data credentials (`username`/`password`), or Bearer session tokens with zero cookie dependency.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/), Radix UI / Shadcn primitives, Lucide Icons
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with custom hydration and authentication store
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, Supabase Storage buckets)
- **Authentication**: Database-backed sessions with immediate revocation via `sessions` table and password hashing via [argon2](https://github.com/ranisalt/node-argon2)
- **Tooling & Quality**:
  - Linter: [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)
  - Formatter: [Oxfmt](https://oxc.rs/)
  - Testing: [Vitest](https://vitest.dev/) with Happy-DOM and React Testing Library

---

## Environment Variables

Configure environment variables in `.env.local`:

| Variable                    | Description                                     | Required | Example                          |
| :-------------------------- | :---------------------------------------------- | :------- | :------------------------------- |
| `SUPABASE_URL`              | Supabase project API URL                        | Yes      | `https://xyzcompany.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for server operations | Yes      | `eyJhbGciOi...`                  |
| `FACTORY_NAME`              | Initial factory name for seed scripts           | Optional | `Default Factory`                |

---

## Getting Started

### Prerequisites

- **Node.js**: `v20+`
- **pnpm**: `v9+` (package manager required across this repository)

### Installation

```bash
pnpm install
```

### Database Setup

1. Execute [schema.sql](schema.sql) in your Supabase SQL Editor to provision tables, enums, indexes, integrity constraints, and RLS policies:
   - **Unified Hardware Users**: Hardware scale devices exist as `role = 'hardware'` in `users`, associated with a `factory_id` (collection centers are specified on weighment entries).
   - **Sessions Table**: Real-time database sessions (`id SERIAL PRIMARY KEY`, `token TEXT NOT NULL UNIQUE`, `user_id INT REFERENCES users(id) ON DELETE CASCADE`) enabling instantaneous session revocation.
   - **Audit Trail**: Entries track creator and approver directly via `created_by` and `approved_by` referencing `users(id)`.
   - **Data Integrity Constraints**: Enforces positive weights (`weight > 0`), non-negative pricing (`unit_price >= 0`), and distinct weighment entries (`in_entry_id <> out_entry_id`).
   - **Partial Unique Indexes**: Enforces uniqueness on active (`WHERE deleted_at IS NULL`) records for commodities, centers per factory, rates per commodity/unit, and usernames.
   - **Query Optimization**: Composite indexes on `(factory_id, center_id, created_at DESC)` and `(factory_id, vehicle_number, status, created_at DESC)`.
   - **Inlined Computed Columns**: High-performance `LANGUAGE sql STABLE PARALLEL SAFE` functions for `gross_weight`, `tare_weight`, and `net_weight`.
   - **Automatic Timestamps**: Automated `BEFORE UPDATE` trigger on all tables keeping `updated_at` timestamps accurate.
2. Execute [storage.sql](storage.sql) to create the required storage bucket (`gluvok`) and factory object policies (`<factory_id>/<file_id>.<ext>`):
   - **Public CDN Reads**: Open for rapid image delivery.
   - **Restricted Mutations**: `INSERT`, `UPDATE`, and `DELETE` restricted to `authenticated` and `service_role` clients with regex validation on folder prefixes.
3. Seed default factory data, commodities, centers, and administrative accounts:

```bash
pnpm seed
```

Other available database utilities:

- `pnpm db:clear`: Safely truncate database tables in reverse dependency order (including active sessions).
- `pnpm seed:test`: Seed controlled data fixtures for test environments (provisions 6 centers and 6 hardware scale users).

### Testing & Utilities

The test suite leverages shared mock utilities and fixtures located in `tests/test-utils.ts`:

- `createMockSupabase`: Pre-configured Supabase client with chainable query mocks (`select`, `eq`, `maybeSingle`, etc.).
- `createMockUser`, `createMockEntry`, `createMockWeighment`: Type-safe test factories.
- `createMockJsonRequest`: Request helper for route handler tests.

### Development Server

Start the local Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

---

## API Endpoints Catalog

All API endpoints are located under `/api/*`:

### Authentication

- `POST /api/auth/login` - Authenticate users and hardware devices, returning a database-backed session token and setting HTTP-only cookie for web browsers.
- `POST /api/auth/logout` - Invalidate active session immediately in database and clear authentication cookies.
- `GET /api/auth/me` - Retrieve current authenticated user profile and permissions.

### Master Data & Entities

- `GET /api/centers` - List collection centers (creating and deleting centers are disallowed).
- `GET, PATCH /api/centers/:id` - Retrieve or update a center (deleting centers is disallowed).
- `GET /api/commodities` - List available commodities (used for rates selection and filtering; commodities frontend data table route is removed).
- `GET, POST /api/customers` - List customers or create a customer record.
- `GET, PATCH, DELETE /api/customers/:id` - Retrieve, update, or soft-delete a customer.
- `GET, POST /api/rates` - Query current rates or configure rates for a commodity/center.
- `GET, PATCH, DELETE /api/rates/:id` - Retrieve, update, or delete rate definitions.
- `GET, POST /api/users` - List factory personnel (hardware accounts are filtered out from UI).
- `GET, PATCH, DELETE /api/users/:id` - Retrieve, update, or delete a user account. Updating a password invalidates all active database sessions for that user. Unauthorized client API calls cleanly clear Zustand authentication state and redirect to `/login` with explanatory banners and return redirect handling.
- `GET, POST /api/settings` - Retrieve or update factory operational settings.
- `GET, PATCH, DELETE /api/settings/:id` - Manage specific settings records.

### Operations & Weighments

- `GET, POST /api/entries` - List entries (with derived `source` based on creator role) or ingest a new entry. `POST` exclusively accepts `multipart/form-data` with attached images, uploading them to Supabase Storage before DB commit with compensating rollback (resilient against transient network failures using `p-retry` exponential backoff). Supports HTTP Basic Auth and form-data credentials (`username`/`password`) for hardware devices.
- `GET, PATCH, DELETE /api/entries/:id` - Retrieve, update, approve, or reject an entry. Automatically manages storage image additions and purges on patch and delete.
- `GET, POST /api/tickets` - List ticketing records or create new tickets.
- `GET, PATCH, DELETE /api/tickets/:id` - Ticket details, status updates, and resolutions.
- `GET, POST /api/weighments` - Retrieve weighments with factory/customer filters.
- `GET, PATCH, DELETE /api/weighments/:id` - Weighment record details and lifecycle updates.
- `GET /api/health` - Public service health and database connectivity probe.

---

## Quality & Verification Gates

Per [AGENTS.md](AGENTS.md), all modifications must satisfy the project's quality verification commands:

```bash
# 1. Lint code with Oxlint
pnpm run lint:fix

# 2. Check code formatting with Oxfmt
pnpm run fmt:check

# 3. Type-check with TypeScript compiler
pnpm run type-check

# 4. Run test suite with Vitest
pnpm test

# 5. Production build compilation
pnpm run build
```

---

## Related Documentation

- [AGENTS.md](AGENTS.md) — Agent coding guidelines, simplicity standards, and verification gates.
- [docs/raspberry_pi_curl.md](docs/raspberry_pi_curl.md) — Hardware device integration guide and sample curl commands.

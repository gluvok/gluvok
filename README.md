# Gluvok

Industrial Weighing, Procurement & Multi-Tenant Center Management System.

Gluvok is a high-performance operations platform designed for factories, weighbridges, and agricultural/commodity collection centers. It automates ticket generation, weighment tracking (gross, tare, and net weights), rate computation, customer accounts, and camera/sensor device integrations.

---

## Features

- **Multi-Tenant Factory Isolation**: Complete data separation across factories (`factory_id` scoping) with PostgreSQL Row Level Security (RLS).
- **Role-Based Access Control (RBAC)**: Fine-grained human permission model supporting `admin`, `manager`, `operator`, and `base` roles. Edge IoT devices authenticate independently against the dedicated `devices` table. See [PERMISSIONS.md](PERMISSIONS.md) for the complete access matrix.
- **Weighbridge Lifecycle Management**:
  - Unassigned, Inbound (gross), and Outbound (tare/net) weighing cycles.
  - Automatic net weight and total price calculation.
  - Indian vehicle registration number validation (e.g. `MH12AB1234`, `22BH1234AA`).
- **Ticketing & Approval Workflow**: Automated ticket generation for center entries with status tracking (`pending`, `approved`, `rejected`).
- **Commodity & Rate Masters**: Dynamic rate configuration per commodity and center.
- **Hardware & IoT Ingestion**: Dedicated header-authenticated API workflows for Raspberry Pi scales and automated license plate recognition (ALPR) cameras. Devices are bound to physical collection centers, and weighment events capture an immutable point-in-time center snapshot. See [docs/raspberry_pi_curl.md](docs/raspberry_pi_curl.md).
- **Data Export**: Built-in CSV and PDF export capabilities for audit reports and center registries.
- **Dual Authentication Model**:
  - Web UI Personnel: HTTP-only Secure Cookie-based JWT sessions (`admin`, `manager`, `operator`, `base`).
  - Edge Ingestion Devices: Constant-time SHA-256 verified header authentication (`x-device-id` and `x-device-key`) with heartbeat tracking (`last_seen_at`), center assignment, and central deactivation (`deleted_at = NOW()`).

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/), Radix UI / Shadcn primitives, Lucide Icons
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with custom hydration and authentication store
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, Supabase Storage buckets)
- **Authentication**: Custom JWT using [jose](https://github.com/panva/jose) and password hashing via [argon2](https://github.com/ranisalt/node-argon2)
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
| `JWT_SECRET`                | Secret key used to sign and verify JWT tokens   | Yes      | `your-secure-jwt-secret`         |
| `JWT_ACCESS_EXPIRES_IN`     | Access token lifespan (e.g. `5m`, `15m`, `1h`)  | Optional | `5m` (default)                   |
| `JWT_REFRESH_EXPIRES_IN`    | Refresh token lifespan (e.g. `7d`, `30d`)       | Optional | `7d` (default)                   |
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

1. Execute [schema.sql](schema.sql) in your Supabase SQL Editor to provision tables, enums, indexes, and RLS policies.
2. Execute [storage.sql](storage.sql) to create the required storage bucket (`gluvok`) and hierarchical object policies (`f_<factory_id>/c_<center_id>/weighments/...`).
3. Seed default factory data, commodities, and administrative accounts:

```bash
pnpm seed
```

Other available database utilities:

- `pnpm db:clear`: Safely truncate database tables in reverse dependency order.
- `pnpm seed:test`: Seed controlled data fixtures for test environments (configured via `scripts/fixtures/seed-data.ts`).

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

- `POST /api/auth/login` - Authenticate users with secure HTTP-only cookies.
- `POST /api/auth/refresh` - Refresh an expired access token using a valid refresh token.
- `POST /api/auth/logout` - Invalidate active session and clear authentication cookies.
- `GET /api/auth/me` - Retrieve current authenticated user profile and permissions.

### Master Data & Entities

- `GET, POST /api/centers` - List collection centers or create a new center.
- `GET, PUT, DELETE /api/centers/:id` - Retrieve, update, or soft-delete a center.
- `GET, POST /api/commodities` - List available commodities or add a commodity.
- `GET, POST /api/customers` - List customers or create a customer record.
- `GET, PUT, DELETE /api/customers/:id` - Retrieve, update, or soft-delete a customer.
- `GET, POST /api/rates` - Query current rates or configure rates for a commodity/center.
- `GET, PUT, DELETE /api/rates/:id` - Retrieve, update, or delete rate definitions.
- `GET, POST /api/users` - List factory users or create user accounts.
- `GET, PUT, DELETE /api/users/:id` - Retrieve, update, or delete a user account.
- `GET, POST /api/settings` - Retrieve or update factory operational settings.
- `GET, PUT, DELETE /api/settings/:id` - Manage specific settings records.

### Operations & Weighments

- `GET, POST /api/entries` - List entries (derived `source` from `device_id != null`) or ingest a new entry (manual operator or device header auth).
- `GET, PUT, DELETE /api/entries/:id` - Retrieve, update, approve, or reject an entry.
- `GET, POST /api/tickets` - List ticketing records or create new tickets.
- `GET, PUT, DELETE /api/tickets/:id` - Ticket details, status updates, and resolutions.
- `GET, POST /api/weighments` - Retrieve weighments with factory/customer filters.
- `GET, PUT, DELETE /api/weighments/:id` - Weighment record details and lifecycle updates.
- `POST /api/storage/upload` - Upload image files or base64 payloads to Supabase storage.
- `GET /api/health` - Service health status probe.

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
- [PERMISSIONS.md](PERMISSIONS.md) — Role-based access control (RBAC) permission matrix.
- [docs/raspberry_pi_curl.md](docs/raspberry_pi_curl.md) — Hardware device integration guide and sample curl commands.

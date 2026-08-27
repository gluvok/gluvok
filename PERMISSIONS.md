# Permissions Matrix

This document maps CRUD permissions (Read / Write / Delete) for each project entity per role.

Legend: R = Read, W = Write (Create + Update), D = Delete. - = Denied.

Source: [lib/store/access.ts](lib/store/access.ts) (RBAC_MATRIX)

| Entity (slug)             |   ADMIN | MANAGER | OPERATOR | BASE |
| ------------------------- | ------: | ------: | -------: | ---: |
| Users (users)             | R, W, D | R, W, D |        R |    R |
| Centers (centers)         | R, W, D | R, W, D |  R, W, D |    - |
| Commodities (commodities) |       R |       R |        R |    - |
| Rates (rates)             | R, W, D |    R, W |        R |    - |
| Customers (customers)     | R, W, D |    R, W |     R, W |    - |
| Entries (entries)         | R, W, D |    R, W |     R, W |    - |
| Weighments (weighments)   | R, W, D |    R, W |     R, W |    R |
| Settings (settings)       | R, W, D |    R, W |     R, W |    - |

Notes:

- `Write` covers both Create and Update operations in the codebase (`write: boolean`).
- The matrix is authoritative as defined in `lib/store/access.ts`.

### Data Isolation (Row Level Security)

- **Multi-Tenant Model:** The application implements a multi-tenant isolation strategy based on `factory_id`.
- **Factory Scope:** `Users`, `Customers`, `Centers`, `Rates`, and `Weighments` in Shared mode are strictly isolated so users can only access data belonging to their assigned `factory_id`.
- **Weighments for Customers:** Customers can only view weighment records where `weighment.customer_id` matches their own `customer_id`.

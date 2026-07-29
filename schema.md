# Database Schema Documentation

This document describes the PostgreSQL database schema as implemented in `db/schema.ts` using Drizzle ORM.

---

### Custom Enums

- **`role_enum`**: `'super_admin'`, `'admin'`, `'manager'`, `'operator'`, `'base'`, `'hardware'`
- **`unit_enum`**: `'kg'`, `'q'`, `'gal'`
- **`weighment_type`**: `'in'`, `'out'`
- **`field_requirement_mode`**: `'mandatory'`, `'optional'`, `'not_required'`

---

### Entity A: factories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique factory identifier. |
| `name` | `VARCHAR(255)` | Not Null | Display label (e.g., "Silo Terminal C"). |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last structural update time. |

---

### Entity B: configs

Per-factory dynamic field requirement configuration for optional/mandatory toggles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique config identifier. |
| `factory_id` | `INTEGER` | FK → `factories.id` (ON DELETE RESTRICT), Unique, Not Null | Associated factory ID (1:1 with factory). |
| `aadhar_number_mode` | `field_requirement_mode` | Not Null, Default: `'optional'` | Mode requirement for profile Aadhaar numbers (`mandatory`, `optional`, `not_required`). |
| `govt_id_mode` | `field_requirement_mode` | Not Null, Default: `'optional'` | Mode requirement for customer Govt IDs (`mandatory`, `optional`, `not_required`). |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity C: centers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique center identifier. |
| `name` | `VARCHAR(255)` | Not Null | Display name. |
| `factory_id` | `INTEGER` | FK → `factories.id` (ON DELETE RESTRICT), Not Null | Associated factory ID. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last structural update time. |

---

### Entity D: commodities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique commodity identifier. |
| `name` | `VARCHAR(255)` | Unique, Not Null | Display name of the commodity (e.g., "Wheat", "Corn"). |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity E: rates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique rate record identifier. |
| `commodity_id` | `INTEGER` | FK → `commodities.id` (ON DELETE RESTRICT, ON UPDATE CASCADE), Not Null | Associated commodity ID. |
| `unit_price` | `DECIMAL(12,2)` | Not Null | Unit price amount. |
| `unit` | `unit_enum` | Not Null | Price unit ('kg', 'q', 'gal'). |
| `factory_id` | `INTEGER` | FK → `factories.id` (ON DELETE RESTRICT), Not Null | Associated factory ID. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity F: users

Represents authentication user accounts with Argon2 credentials, roles, and optional factory assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | Primary Key, Default: `gen_random_uuid()` | Unique user account UUID. |
| `username` | `VARCHAR(255)` | Unique, Not Null | Login username. |
| `password_hash` | `TEXT` | Not Null | Hashed password string. |
| `role` | `role_enum` | Not Null, Default: `'base'` | User role defining access permissions. |
| `factory_id` | `INTEGER` | FK → `factories.id` (ON DELETE RESTRICT), Nullable | Associated factory ID (null for super admins). |
| `is_active` | `BOOLEAN` | Not Null, Default: `TRUE` | User account active status toggle. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity G: customers

Represents workers/customers identified by government ID. Optional link to a user account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique customer ID. |
| `govt_id` | `INTEGER` | Nullable, Partial Unique Index (`govt_id`, `factory_id`) | Government-issued ID (unique per factory when non-null). |
| `name` | `VARCHAR(255)` | Not Null | Full name of the customer. |
| `father_name` | `VARCHAR(255)` | Not Null | Father's full name. |
| `user_id` | `UUID` | Unique, FK → `users.id` (ON DELETE RESTRICT), Nullable | Optional link to an auth user account. |
| `factory_id` | `INTEGER` | FK → `factories.id` (ON DELETE RESTRICT), Not Null | Associated factory ID. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity H: profiles

Details of human resources/staff linked to login accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | Primary Key, Generated Always | Unique profile ID. |
| `user_id` | `UUID` | Unique, Not Null, FK → `users.id` (ON DELETE RESTRICT) | Associated user account UUID. |
| `aadhar_number` | `VARCHAR(12)` | Nullable | 12-digit Aadhaar number. |
| `name` | `VARCHAR(255)` | Not Null | Full name of the profile owner. |
| `role` | `role_enum` | Not Null, Default: `'base'` | Profile role label. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity I: weighments

Transaction records of vehicle weighment operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGINT` | Primary Key, Generated Always | Scaled key for weighment records. |
| `vehicle_number` | `VARCHAR(10)` | Not Null | Transport vehicle registration number. |
| `weight` | `DECIMAL(12,3)` | Not Null | Measured weight value. |
| `images` | `JSONB` | Default: `[]` | Array of stored image URLs. |
| `unit` | `unit_enum` | Not Null, Default: `'kg'` | Weight measurement unit ('kg', 'q', 'gal'). |
| `type` | `weighment_type` | Not Null, Default: `'in'` | Transaction direction ('in', 'out'). |
| `rate_id` | `INTEGER` | FK → `rates.id` (ON DELETE RESTRICT), Not Null | Associated rate record ID. |
| `center_id` | `INTEGER` | FK → `centers.id` (ON DELETE RESTRICT), Not Null | Associated center ID. |
| `profile_id` | `INTEGER` | FK → `profiles.id` (ON DELETE RESTRICT), Not Null | Associated profile ID. |
| `customer_id` | `INTEGER` | FK → `customers.id` (ON DELETE RESTRICT), Not Null | Associated customer ID. |
| `is_active` | `BOOLEAN` | Not Null, Default: `TRUE` | Active status toggle. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Transaction timestamp. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |
### Entity B: factories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique depot ID. |
| `name` | `VARCHAR(255)` | Not Null | Display label (e.g., "Silo Terminal C"). |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last structural update time. |

---

### Entity C: centers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique identifier. |
| `name` | `VARCHAR(255)` | Not Null | Display name. |
| `factory_id` | `INTEGER` | FK → `factories.id`, Not Null | Associated factory. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last structural update time. |

---

### Entity D: commodities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique identifier. |
| `name` | `VARCHAR(255)` | Unique, Not Null | Display name of the commodity (e.g., "Wheat", "Corn"). |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity H: rates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique price record identifier. |
| `commodity_id` | `INTEGER` | FK → `commodities.id`, Not Null, On Delete Cascade, On Update Cascade | Associated commodity ID. |
| `unit_price` | `DECIMAL(12,2)` | Not Null | Price per metric ton. |
| `factory_id` | `INTEGER` | FK → `factories.id`, Not Null | Associated factory. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

### Entity A: users
Represents authentication user accounts with Argon2 credentials, roles, and factory assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | Primary Key | Unique user account ID. |
| `username` | `VARCHAR(255)` | Unique, Not Null | Login username. |
| `password_hash` | `TEXT` | Not Null | Argon2 password hash. |
| `role` | `role_enum` | Not Null, Default: `'base'` | User role defining access permissions. |
| `factory_id` | `INTEGER` | FK → `factories.id`, Not Null, On Delete Restrict | Associated factory. |
| `is_active` | `BOOLEAN` | Not Null, Default: `TRUE` | User account status. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity E: customers
Represents workers/customers identified by government ID. Login credentials are optional.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique customer ID. |
| `govt_id` | `INTEGER` | Unique, Not Null | Government-issued ID, unique per customer. |
| `name` | `VARCHAR(255)` | Not Null | Full name of the customer. |
| `father_name` | `VARCHAR(255)` | Not Null | Father's full name (additional identifier). |
| `user_id` | `UUID` | Unique, FK → `users.id`, On Delete Restrict | Optional link to a user account. |
| `factory_id` | `INTEGER` | FK → `factories.id`, Not Null, On Delete Restrict | Associated factory. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity F: profiles
Details of human resources/users linked to login accounts. Mandatory user account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique profile ID. |
| `user_id` | `UUID` | Unique, Not Null, FK → `users.id`, On Delete Restrict | References public user. |
| `aadhar_number` | `CHAR(12)` | Unique, Not Null, CHECK (`aadhar_number ~ '^\d{12}$'`) | Aadhar number — unique profile identifier. |
| `name` | `VARCHAR(255)` | Not Null | Full name of the profile owner. |
| `role` | `role_enum` | Not Null, Default: `'base'` | User role defining access permissions. |

| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity G: weighments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | Primary Key | Scaled key for millions of transactions. |
| `vehicle_number` | `VARCHAR(10)` | Indexed, Non-Unique | Plate or tag of the transport unit. |
| `weight` | `DECIMAL` | Not Null | Precise measured weight. |
| `images` | `JSONB` | Nullable | Array of object-storage paths. |
| `unit` | `unit_enum` | Not Null, Default: `'kg'` | Price unit (e.g. 'kg', 'q', 'gal'). |
| `type` | `ENUM('in', 'out')` | Not Null, Default: `'in'` | Whether the weighment is incoming or outgoing. |
| `rate_id` | `INTEGER` | FK → `rates.id`, Not Null | Link to the specific commodity price rate. |
| `center_id` | `INTEGER` | FK → `centers.id`, Not Null | Physical location where weighing occurred. |
| `profile_id` | `INTEGER` | FK → `profiles.id`, Not Null | Profile who managed the scale/vehicle. |
| `customer_id` | `INTEGER` | FK → `customers.id`, Not Null | Customer who was there. |
| `is_active` | `BOOLEAN` | Not Null, Default: `TRUE` | Transaction status toggle. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Immutable transaction timestamp. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last update time. |

---

### Entity I: assignments
Represents factory assignments that map factories to profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL` | Primary Key | Unique assignment ID. |
| `factory_id` | `INTEGER` | FK → `factories.id`, Not Null | Associated factory. |
| `profile_id` | `INTEGER` | FK → `profiles.id`, Not Null | Associated operator/admin profile ID. |
| `created_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Record creation time. |
| `updated_at` | `TIMESTAMP` | Not Null, Default: `CURRENT_TIMESTAMP` | Last structural update time. |
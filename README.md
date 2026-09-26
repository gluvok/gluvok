# Gluvok

Industrial Weighing, Procurement & Multi-Tenant Center Management System.

---

## 1. Prerequisites & Environment

- **Runtime**: Node.js `v20+` and `pnpm v9+`
- Create `.env.local` with your Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 2. How to Run

### Install Dependencies

```bash
pnpm install
```

### Database Schema Setup

For a new database instance, run the following SQL scripts in your Supabase SQL Editor:

1. `schema.sql` — provisions tables, enums, triggers, and RLS policies.
2. `storage.sql` — provisions the `gluvok` storage bucket and file access policies.

### Start Development Server

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

## 3. How to Seed Data for a New Client

### Optional: Reset Existing Data

If starting from scratch:

```bash
pnpm db:clear
```

### Seed Client Factory & Admin

Run the seed script with custom environment variables for the new client:

```bash
FACTORY_NAME="Client Factory Name" \
CENTER_NAME="Main Center" \
ADMIN_USERNAME="clientadmin" \
ADMIN_PASSWORD="securepassword123" \
pnpm seed
```

**Environment Variables for Seeding:**

| Variable         | Description                    | Default if Omitted |
| :--------------- | :----------------------------- | :----------------- |
| `FACTORY_NAME`   | Name of the tenant factory     | `Default Factory`  |
| `CENTER_NAME`    | Primary collection center name | `Main Center`      |
| `ADMIN_USERNAME` | Admin account username         | `admin1`           |
| `ADMIN_PASSWORD` | Admin account password         | `admin123`         |
| `ADMIN_NAME`     | Display name of the admin user | `Admin User 1`     |

**What Gets Created:**

- **Factory & Center**: Configures the tenant factory and collection center.
- **Admin User**: Created with the specified username/password (Role: `admin`).
- **Hardware Edge Users**: Usernames `pi1`, `pi2`, Password `hardware123` (Role: `hardware`).
- **Commodities**: Default commodity catalog (Wheat, Scrap Copper, Corn, etc.).

### Optional: Full QA / Test Dataset

To seed full rich multi-factory fixtures (entries, tickets, weighments):

```bash
pnpm seed:test
```

---

## 4. Verification Gates

```bash
pnpm run lint:fix && pnpm run fmt:check && pnpm run type-check && pnpm test && pnpm run build
```

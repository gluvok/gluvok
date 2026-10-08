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
# Seed test data (idempotent / additive)
pnpm run seed

# Clean reset and re-seed all tables & sequence counters
pnpm run seed:clean
```

### Seeded Test Credentials

**Factory 1**:

- **Admin**: `admin1` / `admin123`
- **Manager**: `manager1` / `manager123`
- **Operator**: `operator1` / `operator123`
- **Customer (Base)**: `customer1` / `user123`
- **Hardware (Edge Scale)**: `pi1` / `pi123`

**Factory 2**:

- **Admin**: `admin2` / `admin123`
- **Operator**: `operator2` / `operator123`
- **Hardware (Edge Scale)**: `pi2` / `pi123`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

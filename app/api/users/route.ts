import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { getTables, sharedSchema } from "@/db/schema"
import { withAuth } from "@/db/helpers"
import { Role, TenantMode } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, db, mode) => {
  const { users } = getTables(mode)
  const conditions = [eq(users.isActive, true)]
  if (mode === TenantMode.SHARED && user.role !== Role.SUPER_ADMIN && user.factory_id != null) {
    conditions.push(eq((users as typeof sharedSchema.users).factoryId, user.factory_id))
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      ...(mode === TenantMode.SHARED ? { factoryId: (users as typeof sharedSchema.users).factoryId } : {}),
    })
    .from(users)
    .where(and(...conditions))

  return NextResponse.json({ data: rows })
})

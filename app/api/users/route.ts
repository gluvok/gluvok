import { NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { withAuth } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user) => {
  const conditions = [eq(users.isActive, true)]
  if (user.role !== Role.SUPER_ADMIN) conditions.push(eq(users.factoryId, user.factory_id != null ? user.factory_id : 0))

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      factoryId: users.factoryId,
    })
    .from(users)
    .where(and(...conditions))

  return NextResponse.json({ data: rows })
})

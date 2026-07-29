import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { requireAuth } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const conditions = [eq(users.isActive, true)]
    if (authUser.role !== Role.SUPER_ADMIN) {
      conditions.push(eq(users.factoryId, authUser.factory_id))
    }

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
  } catch (error) {
    console.error("GET /api/users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

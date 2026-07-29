import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { factories } from "@/db/schema"
import { getAuthUser } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser || authUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const factoryId = parseInt(id, 10)
    const body = await req.json()
    const { name } = body

    const [updated] = await db
      .update(factories)
      .set({
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(factories.id, factoryId))
      .returning()

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("PUT /api/factories/[id] error:", error)
    return NextResponse.json({ error: "Failed to update factory" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser || authUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const factoryId = parseInt(id, 10)

    await db.delete(factories).where(eq(factories.id, factoryId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/factories/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete factory" }, { status: 500 })
  }
}

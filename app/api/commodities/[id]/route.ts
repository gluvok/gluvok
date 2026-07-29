import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { getAuthUser } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const commodityId = parseInt(id, 10)
    const body = await req.json()
    const { name } = body

    const [updated] = await db
      .update(commodities)
      .set({
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(commodities.id, commodityId))
      .returning()

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("PUT /api/commodities/[id] error:", error)
    return NextResponse.json({ error: "Failed to update commodity" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const commodityId = parseInt(id, 10)

    await db.delete(commodities).where(eq(commodities.id, commodityId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/commodities/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete commodity" }, { status: 500 })
  }
}

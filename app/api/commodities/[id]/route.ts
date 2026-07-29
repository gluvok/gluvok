import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

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

    if (!updated) {
      return NextResponse.json({ error: "Commodity not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
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
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const commodityId = parseInt(id, 10)

    await db.delete(commodities).where(eq(commodities.id, commodityId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/commodities/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this commodity because it is referenced by existing rates or weighments. Please reassign or delete dependent records first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete commodity" }, { status: 500 })
  }
}

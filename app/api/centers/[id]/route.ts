import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { centers } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const centerId = parseInt(id, 10)
    const body = await req.json()
    const { name } = body

    const [updated] = await db
      .update(centers)
      .set({
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(centers.id, centerId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Center not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        factory_id: updated.factoryId,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error("PUT /api/centers/[id] error:", error)
    return NextResponse.json({ error: "Failed to update center" }, { status: 500 })
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
    const centerId = parseInt(id, 10)

    await db.delete(centers).where(eq(centers.id, centerId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/centers/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this center because it is referenced by existing weighments or records. Please reassign or delete dependent records first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete center" }, { status: 500 })
  }
}

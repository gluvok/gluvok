import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { factories } from "@/db/schema"
import { requireAuth } from "@/db/helpers"
import { Role } from "@/lib/constants/enums"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req, Role.SUPER_ADMIN)
    if (errorResponse) return errorResponse

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

    if (!updated) {
      return NextResponse.json({ error: "Factory not found" }, { status: 404 })
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
    console.error("PUT /api/factories/[id] error:", error)
    return NextResponse.json({ error: "Failed to update factory" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req, Role.SUPER_ADMIN)
    if (errorResponse) return errorResponse

    const { id } = await params
    const factoryId = parseInt(id, 10)

    await db.delete(factories).where(eq(factories.id, factoryId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/factories/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this factory because it is referenced by existing centers, users, or rates. Please reassign or delete dependent records first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete factory" }, { status: 500 })
  }
}

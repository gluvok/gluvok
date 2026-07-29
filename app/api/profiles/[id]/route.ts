import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const profileId = parseInt(id, 10)
    const body = await req.json()
    const { name, is_active } = body

    const [updated] = await db
      .update(profiles)
      .set({
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (is_active !== undefined) {
      await db
        .update(users)
        .set({ isActive: Boolean(is_active), updatedAt: new Date() })
        .where(eq(users.id, updated.userId))
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        user_id: updated.userId,
        name: updated.name,
        aadhar_number: updated.aadharNumber,
        role: updated.role,
        is_active: is_active ?? true,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error("PUT /api/profiles/[id] error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
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
    const profileId = parseInt(id, 10)

    await db.delete(profiles).where(eq(profiles.id, profileId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/profiles/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this profile because it is referenced by existing weighments or records. Please reassign or delete dependent records first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 })
  }
}

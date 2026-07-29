import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profiles, users } from "@/db/schema"
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

    return NextResponse.json({ data: updated })
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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const profileId = parseInt(id, 10)

    await db.delete(profiles).where(eq(profiles.id, profileId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { weighments } from "@/db/schema"
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
    const weighmentId = parseInt(id, 10)
    const body = await req.json()
    const { vehicleNumber, weight, isActive } = body

    const [updated] = await db
      .update(weighments)
      .set({
        ...(vehicleNumber ? { vehicleNumber } : {}),
        ...(weight ? { weight: String(weight) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(weighments.id, weighmentId))
      .returning()

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("PUT /api/weighments/[id] error:", error)
    return NextResponse.json({ error: "Failed to update weighment" }, { status: 500 })
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
    const weighmentId = parseInt(id, 10)

    await db.delete(weighments).where(eq(weighments.id, weighmentId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/weighments/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete weighment" }, { status: 500 })
  }
}

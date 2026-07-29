import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { weighments } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const weighmentId = parseInt(id, 10)
    const body = await req.json()
    const { vehicleNumber, vehicle_number, weight, isActive, is_active } = body

    const targetVehicleNumber = vehicleNumber ?? vehicle_number
    const targetIsActive = isActive ?? is_active

    const [updated] = await db
      .update(weighments)
      .set({
        ...(targetVehicleNumber ? { vehicleNumber: targetVehicleNumber } : {}),
        ...(weight ? { weight: String(weight) } : {}),
        ...(targetIsActive !== undefined ? { isActive: Boolean(targetIsActive) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(weighments.id, weighmentId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Weighment not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        vehicle_number: updated.vehicleNumber,
        weight: updated.weight,
        unit: updated.unit,
        type: updated.type,
        images: updated.images,
        rate_id: updated.rateId,
        center_id: updated.centerId,
        profile_id: updated.profileId,
        customer_id: updated.customerId,
        is_active: updated.isActive,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
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
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const weighmentId = parseInt(id, 10)

    await db.delete(weighments).where(eq(weighments.id, weighmentId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/weighments/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this weighment because it is referenced by other records." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete weighment" }, { status: 500 })
  }
}

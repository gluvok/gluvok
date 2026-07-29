import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { weighments } from "@/db/schema"
import { withAuth, apiError, isFKViolation, StatusCodes } from "@/db/helpers"

export const PUT = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params
  const weighmentId = parseInt(id, 10)
  const { vehicleNumber, vehicle_number, weight, isActive, is_active } = await req.json()
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

  if (!updated) return apiError("Weighment not found", StatusCodes.NOT_FOUND)

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
})

export const DELETE = withAuth(async (_req, _user, ctx) => {
  try {
    const { id } = await ctx.params
    await db.delete(weighments).where(eq(weighments.id, parseInt(id, 10)))
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete this weighment because it is referenced by other records.",
        StatusCodes.BAD_REQUEST
      )
    }
    throw error
  }
})

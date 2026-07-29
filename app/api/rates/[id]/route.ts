import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { rates } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const rateId = parseInt(id, 10)
    const body = await req.json()
    const { unitPrice, unit_price, unit } = body

    const targetUnitPrice = unitPrice ?? unit_price

    const [updated] = await db
      .update(rates)
      .set({
        ...(targetUnitPrice ? { unitPrice: String(targetUnitPrice) } : {}),
        ...(unit ? { unit } : {}),
        updatedAt: new Date(),
      })
      .where(eq(rates.id, rateId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        commodity_id: updated.commodityId,
        unit_price: updated.unitPrice,
        unit: updated.unit,
        factory_id: updated.factoryId,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error("PUT /api/rates/[id] error:", error)
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 })
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
    const rateId = parseInt(id, 10)

    await db.delete(rates).where(eq(rates.id, rateId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/rates/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this rate because it is referenced by existing weighments. Please reassign or delete dependent weighments first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}

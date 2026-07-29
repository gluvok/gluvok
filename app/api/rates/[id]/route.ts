import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { rates } from "@/db/schema"
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
    const rateId = parseInt(id, 10)
    const body = await req.json()
    const { unitPrice, unit } = body

    const [updated] = await db
      .update(rates)
      .set({
        ...(unitPrice ? { unitPrice: String(unitPrice) } : {}),
        ...(unit ? { unit } : {}),
        updatedAt: new Date(),
      })
      .where(eq(rates.id, rateId))
      .returning()

    return NextResponse.json({ data: updated })
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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const rateId = parseInt(id, 10)

    await db.delete(rates).where(eq(rates.id, rateId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/rates/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}

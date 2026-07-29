import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { customers, users } from "@/db/schema"
import { requireAuth } from "@/db/helpers"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAuth(req)
    if (errorResponse) return errorResponse

    const { id } = await params
    const customerId = parseInt(id, 10)
    const body = await req.json()
    const { name, fatherName, father_name, is_active } = body

    const targetFatherName = fatherName ?? father_name

    const [updated] = await db
      .update(customers)
      .set({
        ...(name ? { name } : {}),
        ...(targetFatherName ? { fatherName: targetFatherName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    if (is_active !== undefined && updated.userId) {
      await db
        .update(users)
        .set({ isActive: Boolean(is_active), updatedAt: new Date() })
        .where(eq(users.id, updated.userId))
    }

    return NextResponse.json({
      data: {
        id: updated.id,
        govt_id: updated.govtId,
        name: updated.name,
        father_name: updated.fatherName,
        user_id: updated.userId,
        factory_id: updated.factoryId,
        is_active: is_active ?? true,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error("PUT /api/customers/[id] error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
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
    const customerId = parseInt(id, 10)

    await db.delete(customers).where(eq(customers.id, customerId))
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("DELETE /api/customers/[id] error:", error)
    const errObj = error as { code?: string; message?: string }
    if (errObj.code === "23503" || errObj.message?.includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete this customer because they are referenced by existing weighments. Please reassign or delete dependent weighments first." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { customers, users } from "@/db/schema"
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
    const customerId = parseInt(id, 10)
    const body = await req.json()
    const { name, fatherName, is_active } = body

    const [updated] = await db
      .update(customers)
      .set({
        ...(name ? { name } : {}),
        ...(fatherName ? { fatherName } : {}),
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

    return NextResponse.json({ data: updated })
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
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id, 10)

    await db.delete(customers).where(eq(customers.id, customerId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/customers/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}

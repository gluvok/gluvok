import { NextResponse } from "next/server"
import { db } from "@/db"
import { TableName } from "@/lib/constants/enums"

export async function GET() {
  try {
    const { error } = await db.from(TableName.FACTORIES).select("id").limit(1)

    if (error) throw error

    return NextResponse.json({
      status: "ok",
      database: "connected",
    })
  } catch (error: unknown) {
    console.error("Database health check error:", error)
    const errObj = error as { message?: string }
    return NextResponse.json(
      {
        status: "error",
        message: errObj.message || "Database connection failed",
      },
      { status: 500 }
    )
  }
}

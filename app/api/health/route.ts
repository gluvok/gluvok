import { NextResponse } from "next/server"
import { db } from "@/db"
import { factories } from "@/db/schema"

export async function GET() {
  try {
    const factoryRecords = await db
      .select({
        id: factories.id,
        name: factories.name,
        createdAt: factories.createdAt,
        updatedAt: factories.updatedAt,
      })
      .from(factories)
      .limit(10)

    return NextResponse.json({
      status: "ok",
      database: "Supabase PostgreSQL via Drizzle ORM",
      count: factoryRecords.length,
      factories: factoryRecords,
    })
  } catch (error: unknown) {
    console.error("Drizzle factories health check error:", error)
    const errObj = error as { message?: string; cause?: unknown }
    return NextResponse.json(
      {
        status: "error",
        message: errObj.message || "Database query failed",
        cause: errObj.cause ? String(errObj.cause) : undefined,
      },
      { status: 500 }
    )
  }
}

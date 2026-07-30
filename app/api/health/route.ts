import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { getWorkspace } from "@/lib/tenant/workspace"
import { resolveTenant } from "@/lib/tenant"
import { getDb } from "@/db"

export async function GET(req: NextRequest) {
  try {
    const workspace = getWorkspace(req)
    const tenantCtx = resolveTenant(workspace)
    const tenantDb = getDb(tenantCtx)

    await tenantDb.execute(sql`SELECT 1`)

    return NextResponse.json({
      status: "ok",
      database: "connected",
      tenant: {
        mode: tenantCtx.mode,
        workspace: tenantCtx.workspace,
      },
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

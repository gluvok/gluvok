import { NextResponse } from "next/server"
import { withAuth } from "@/db/helpers"
import { TableName, EntityKey } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, client) => {
  let query = client
    .from(TableName.USERS)
    .select(`id, username, role, ${EntityKey.FACTORY_ID}, is_active`)
    .eq("is_active", true)
    .eq(EntityKey.FACTORY_ID, user.factory_id!)

  const { data: rows, error } = await query
  if (error) {
    console.error("GET users error:", error)
    return NextResponse.json({ data: [] })
  }

  return NextResponse.json({ data: rows || [] })
})

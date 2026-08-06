import { NextResponse } from "next/server"
import { withAuth } from "@/db/helpers"
import { TableName } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, client) => {
  let query = client
    .from(TableName.USERS)
    .select("id, username, role, factory_id, is_active")
    .eq("is_active", true)

  if (user.factory_id) {
    query = query.eq("factory_id", user.factory_id)
  }

  const { data: rows, error } = await query
  if (error) {
    console.error("GET users error:", error)
    return NextResponse.json({ data: [] })
  }

  return NextResponse.json({ data: rows || [] })
})

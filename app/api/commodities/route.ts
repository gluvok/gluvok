import { NextRequest, NextResponse } from "next/server"
import { ilike, count, desc } from "drizzle-orm"
import { db } from "@/db"
import { commodities } from "@/db/schema"
import { getAuthUser, getPaginationParams } from "@/db/helpers"

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { page, limit, offset } = getPaginationParams(req.nextUrl)
    const search = req.nextUrl.searchParams.get("search")

    const whereClause = search ? ilike(commodities.name, `%${search}%`) : undefined

    const [totalCountResult] = await db
      .select({ count: count() })
      .from(commodities)
      .where(whereClause)

    const data = await db
      .select()
      .from(commodities)
      .where(whereClause)
      .orderBy(desc(commodities.createdAt))
      .limit(limit)
      .offset(offset)

    const total = Number(totalCountResult?.count || 0)

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/commodities error:", error)
    return NextResponse.json({ error: "Failed to fetch commodities" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [newCommodity] = await db
      .insert(commodities)
      .values({ name })
      .returning()

    return NextResponse.json({ data: newCommodity }, { status: 201 })
  } catch (error) {
    console.error("POST /api/commodities error:", error)
    return NextResponse.json({ error: "Failed to create commodity" }, { status: 500 })
  }
}

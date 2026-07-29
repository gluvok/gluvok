import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { configs } from "@/db/schema"
import { withAuth } from "@/db/helpers"
import { FieldRequirementMode } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user) => {
  const factoryId = user.factory_id ?? 0

  const defaultConfig = {
    factoryId,
    aadharNumberMode: FieldRequirementMode.OPTIONAL,
    govtIdMode: FieldRequirementMode.OPTIONAL,
  }

  if (!factoryId) {
    return NextResponse.json({ config: defaultConfig })
  }

  try {
    const [existingConfig] = await db
      .select({
        id: configs.id,
        factoryId: configs.factoryId,
        aadharNumberMode: configs.aadharNumberMode,
        govtIdMode: configs.govtIdMode,
      })
      .from(configs)
      .where(eq(configs.factoryId, factoryId))
      .limit(1)

    return NextResponse.json({ config: existingConfig || defaultConfig })
  } catch (err) {
    console.error("Failed to fetch active config from DB:", err)
    return NextResponse.json({ config: defaultConfig })
  }
})

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { configs } from "@/db/schema"
import { withAuth } from "@/db/helpers"
import { TenantMode, FieldRequirementMode } from "@/lib/constants/enums"

export const GET = withAuth(async (_req, user, db, mode) => {
  const defaultConfig = {
    aadharNumberMode: FieldRequirementMode.OPTIONAL,
    govtIdMode: FieldRequirementMode.OPTIONAL,
  }

  try {
    if (mode === TenantMode.DEDICATED) {
      // Dedicated: single global config row
      const [existingConfig] = await db
        .select({
          id: configs.id,
          aadharNumberMode: configs.aadharNumberMode,
          govtIdMode: configs.govtIdMode,
        })
        .from(configs)
        .limit(1)
      return NextResponse.json({ config: existingConfig || defaultConfig })
    }

    // Shared: factory-scoped
    const factoryId = user.factory_id ?? 0
    if (!factoryId) {
      return NextResponse.json({ config: { factoryId, ...defaultConfig } })
    }

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

    return NextResponse.json({ config: existingConfig || { factoryId, ...defaultConfig } })
  } catch (err) {
    console.error("Failed to fetch active config from DB:", err)
    return NextResponse.json({ config: defaultConfig })
  }
})

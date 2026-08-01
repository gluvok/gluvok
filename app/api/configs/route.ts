import { NextResponse } from "next/server"
import { eq, and, inArray } from "drizzle-orm";
import { sharedSchema, standaloneSchema } from "@/db/schema"
import {
  withAuth,
  validateRequiredFields,
  forbiddenError,
  hasPermission,
  StatusCodes,
  apiError,
  formatEntityResponse,
  getFactoryWhereClause,
  parseBulkIds,
  getOrderByClause,
} from "@/db/helpers";
import { TenantMode, ProjectSlug, PermissionKey, FieldRequirementMode, QueryParam } from "@/lib/constants/enums"

export const GET = withAuth(async (req, user, db, mode) => {
  try {
    const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN)
    const sortDesc = req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"

    if (mode === TenantMode.DEDICATED) {
      // Single global config — no factory scoping
      const orderByClause = getOrderByClause(standaloneSchema.configs, sortColumn, sortDesc, standaloneSchema.configs.created_at)

      const [row] = await db
        .select({
          id: standaloneSchema.configs.id,
          aadhar_number_mode: standaloneSchema.configs.aadhar_number_mode,
          govt_id_mode: standaloneSchema.configs.govt_id_mode,
          created_at: standaloneSchema.configs.created_at,
          updated_at: standaloneSchema.configs.updated_at,
        })
        .from(standaloneSchema.configs)
        .orderBy(orderByClause)
        .limit(1)
      const data = row ? [row] : []
      return NextResponse.json({
        data,
        pagination: { page: 1, limit: 100, total: data.length },
      })
    }

    // Shared mode — factory-scoped
    const sharedConfigs = sharedSchema.configs
    const factoryCond = getFactoryWhereClause(user, mode, sharedConfigs.factory_id)
    const conditions = []
    if (factoryCond) conditions.push(factoryCond)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const orderByClause = getOrderByClause(sharedConfigs, sortColumn, sortDesc, sharedConfigs.created_at)

    const rows = await db
      .select({
        id: sharedConfigs.id,
        factory_id: sharedConfigs.factory_id,
        aadhar_number_mode: sharedConfigs.aadhar_number_mode,
        govt_id_mode: sharedConfigs.govt_id_mode,
        created_at: sharedConfigs.created_at,
        updated_at: sharedConfigs.updated_at,
      })
      .from(sharedConfigs)
      .orderBy(orderByClause)
      .where(whereClause)

    return NextResponse.json({
      data: rows,
      pagination: { page: 1, limit: rows.length || 10, total: rows.length },
    })
  } catch (err) {
    console.error("Failed to query configs table:", err)
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0 },
    })
  }
})

/**
 * POST /api/configs
 * Creates configuration resource.
 * Rules:
 * - Dedicated mode: no factory_id needed.
 * - Shared mode: factory_id is derived automatically from user.factory_id.
 */
export const POST = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.CREATE) && !hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.WRITE)) {
    return forbiddenError()
  }

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.CONFIGS)
    if (err) return err

    const { aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.MANDATORY
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.MANDATORY

    // 1. Dedicated Mode
    if (mode === TenantMode.DEDICATED) {
      const [existing] = await db.select({ id: standaloneSchema.configs.id }).from(standaloneSchema.configs).limit(1)
      let newConfig
      if (existing) {
        ;[newConfig] = await db
          .update(standaloneSchema.configs)
          .set({ aadhar_number_mode: aMode, govt_id_mode: gMode, updated_at: new Date() })
          .where(eq(standaloneSchema.configs.id, existing.id))
          .returning()
      } else {
        ;[newConfig] = await db
          .insert(standaloneSchema.configs)
          .values({ aadhar_number_mode: aMode, govt_id_mode: gMode })
          .returning()
      }
      return formatEntityResponse(newConfig, mode, StatusCodes.CREATED)
    }

    // 2. Shared Mode
    const targetFactoryId = user.factory_id ?? 0
    if (!targetFactoryId || targetFactoryId <= 0) {
      return apiError("User is not associated with a factory", StatusCodes.BAD_REQUEST)
    }

    const [newConfig] = await db
      .insert(sharedSchema.configs)
      .values({ factory_id: targetFactoryId, aadhar_number_mode: aMode, govt_id_mode: gMode })
      .onConflictDoUpdate({
        target: sharedSchema.configs.factory_id,
        set: { aadhar_number_mode: aMode, govt_id_mode: gMode, updated_at: new Date() },
      })
      .returning()

    return formatEntityResponse(newConfig, mode, StatusCodes.CREATED)
  } catch (err) {
    console.error("Failed to save config:", err)
    return apiError("Failed to save configuration in database. Ensure the configs table exists.", StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );

  try {
    const deletedCount = await db.transaction(async (tx) => {
      if (mode === TenantMode.DEDICATED) {
        const deleted = await tx
          .delete(standaloneSchema.configs)
          .where(inArray(standaloneSchema.configs.id, ids))
          .returning({ id: standaloneSchema.configs.id });
        if (deleted.length !== ids.length)
          throw new Error("BULK_DELETE_INCOMPLETE");
        return deleted.length;
      }

      if (user.factory_id == null) throw new Error("BULK_DELETE_FORBIDDEN");
      const deleted = await tx
        .delete(sharedSchema.configs)
        .where(
          and(
            inArray(sharedSchema.configs.id, ids),
            eq(sharedSchema.configs.factory_id, user.factory_id),
          ),
        )
        .returning({ id: sharedSchema.configs.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_FORBIDDEN")
      return forbiddenError();
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more configurations were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    throw error;
  }
});


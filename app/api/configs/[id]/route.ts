import { NextResponse } from "next/server"
import { eq } from "drizzle-orm";
import { sharedSchema, standaloneSchema } from "@/db/schema"
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
} from "@/db/helpers";
import { TenantMode, ProjectSlug, PermissionKey, FieldRequirementMode } from "@/lib/constants/enums"

/**
 * PATCH /api/configs/[id]
 * Partially updates an existing configuration resource by ID.
 */
export const PATCH = withAuth(
  withEntityScope(
    (mode) =>
      mode === TenantMode.DEDICATED
        ? standaloneSchema.configs
        : sharedSchema.configs,
    sharedSchema.configs.factoryId,
    async (
      req,
      user,
      db,
      mode,
      _context,
      { entityId: configId, whereClause },
    ) => {
      if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.WRITE))
        return forbiddenError();

      try {
        const body = await req.json();
        const { aadhar_number_mode, govt_id_mode } = body;

        const validModes = Object.values(FieldRequirementMode);
        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (aadhar_number_mode && validModes.includes(aadhar_number_mode)) {
          updates.aadharNumberMode = aadhar_number_mode;
        }
        if (govt_id_mode && validModes.includes(govt_id_mode)) {
          updates.govtIdMode = govt_id_mode;
        }

        if (mode === TenantMode.DEDICATED) {
          const [existing] = await db
            .select()
            .from(standaloneSchema.configs)
            .where(eq(standaloneSchema.configs.id, configId))
            .limit(1);

          if (!existing)
            return apiError("Config not found", StatusCodes.NOT_FOUND);

          const [updated] = await db
            .update(standaloneSchema.configs)
            .set(updates)
            .where(eq(standaloneSchema.configs.id, configId))
            .returning();

          return NextResponse.json({
            data: {
              id: updated.id,
              aadhar_number_mode: updated.aadharNumberMode,
              govt_id_mode: updated.govtIdMode,
              created_at: updated.createdAt,
              updated_at: updated.updatedAt,
            },
          });
        }

        // Shared Mode
        const sharedConfigs = sharedSchema.configs;

        const [existing] = await db
          .select()
          .from(sharedConfigs)
          .where(whereClause)
          .limit(1);

        if (!existing)
          return apiError("Config not found", StatusCodes.NOT_FOUND);

        const [updated] = await db
          .update(sharedConfigs)
          .set(updates)
          .where(whereClause)
          .returning();

        return NextResponse.json({
          data: {
            id: updated.id,
            factory_id: updated.factoryId,
            aadhar_number_mode: updated.aadharNumberMode,
            govt_id_mode: updated.govtIdMode,
            created_at: updated.createdAt,
            updated_at: updated.updatedAt,
          },
        });
      } catch (err) {
        console.error("Failed to update config:", err);
        return apiError(
          "Database error while updating config",
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }
    },
  ),
);

export const DELETE = withAuth(
  withEntityScope(
    (mode) =>
      mode === TenantMode.DEDICATED
        ? standaloneSchema.configs
        : sharedSchema.configs,
    sharedSchema.configs.factoryId,
    async (
      _req,
      user,
      db,
      mode,
      _context,
      { entityId: configId, whereClause },
    ) => {
      if (!hasPermission(user, ProjectSlug.CONFIGS, PermissionKey.DELETE))
        return forbiddenError();

      try {
        if (mode === TenantMode.DEDICATED) {
          await db
            .delete(standaloneSchema.configs)
            .where(eq(standaloneSchema.configs.id, configId));
          return NextResponse.json({
            success: true,
            message: "Config deleted successfully",
          });
        }

        const sharedConfigs = sharedSchema.configs;

        const [existing] = await db
          .select()
          .from(sharedConfigs)
          .where(whereClause)
          .limit(1);

        if (!existing)
          return apiError("Config not found", StatusCodes.NOT_FOUND);

        await db.delete(sharedConfigs).where(whereClause);

        return NextResponse.json({
          success: true,
          message: "Config deleted successfully",
        });
      } catch (err) {
        console.error("Failed to delete config:", err);
        return apiError(
          "Database error while deleting config",
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }
    },
  ),
);

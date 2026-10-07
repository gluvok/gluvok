import {
  withAuth,
  withEntityScope,
  apiError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { editSettingsSchema } from "@/lib/validation";
import { invalidateFactorySessionsInCache } from "@/lib/auth/session";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    // Enforce: only admin has permission to modify factory settings
    if (
      user.role !== Role.ADMIN ||
      !hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)
    ) {
      return apiError(ApiErrorMessage.ONLY_ADMIN_MODIFY_SETTINGS, StatusCodes.FORBIDDEN);
    }

    // Verify target entity matches caller's scoped factory
    if (entityId !== factoryId) {
      return apiError(ApiErrorMessage.FACTORY_SETTINGS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = editSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, check_center_on_merge, receipt_images_per_row } = parsed.data;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (check_center_on_merge !== undefined) updates.check_center_on_merge = check_center_on_merge;
    if (receipt_images_per_row !== undefined)
      updates.receipt_images_per_row = receipt_images_per_row;

    const { data: updated, error } = await client
      .from("factories")
      .update(updates)
      .eq("id", factoryId)
      .is("deleted_at", null)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return apiError(ApiErrorMessage.FACTORY_SETTINGS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    invalidateFactorySessionsInCache(factoryId);

    return formatEntityResponse(updated);
  }),
);

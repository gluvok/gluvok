import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { editSettingsSchema } from "@/lib/validation";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)) return forbiddenError();

    // Verify target entity matches caller's scoped factory
    if (entityId !== factoryId) {
      return apiError("Factory settings not found", StatusCodes.NOT_FOUND);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = editSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, check_center_on_merge } = parsed.data;

    // Enforce: only admin has permission to modify the name of the factory
    if (name !== undefined && user.role !== Role.ADMIN) {
      return apiError(
        "Only admin has permission to modify the name of the factory.",
        StatusCodes.FORBIDDEN,
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (check_center_on_merge !== undefined) updates.check_center_on_merge = check_center_on_merge;

    const { data: updated, error } = await client
      .from("factories")
      .update(updates)
      .eq("id", factoryId)
      .is("deleted_at", null)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return apiError("Factory settings not found", StatusCodes.NOT_FOUND);
    }

    return formatEntityResponse(updated);
  }),
);

import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
  isUniqueConstraintError,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { editCenterSchema } from "@/lib/validation";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CENTERS, PermissionKey.WRITE)) return forbiddenError();

    const body = await req.json();
    const parsed = editCenterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, auto_approve } = parsed.data;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (auto_approve !== undefined) updates.auto_approve = auto_approve;

    const query = client
      .from("centers")
      .update(updates)
      .eq("id", entityId)
      .is("deleted_at", null)
      .eq("factory_id", factoryId);

    const { data: updated, error } = await query.select().maybeSingle();
    if (error) {
      if (isUniqueConstraintError(error)) {
        return apiError(ApiErrorMessage.CENTER_NAME_EXISTS, StatusCodes.CONFLICT);
      }
      return apiError(error.message, StatusCodes.BAD_REQUEST);
    }
    if (!updated) return apiError(ApiErrorMessage.CENTER_NOT_FOUND, StatusCodes.NOT_FOUND);

    return formatEntityResponse(updated);
  }),
);

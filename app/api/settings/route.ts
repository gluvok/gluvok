import {
  withAuth,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
  getFactory,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { editSettingsSchema } from "@/lib/validation";

export const GET = withAuth(async (_req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.READ)) {
    return forbiddenError();
  }

  const factory = await getFactory(client, user.factory_id);
  if (!factory) {
    return apiError(ApiErrorMessage.SETTING_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return formatEntityResponse(factory);
});

export const PATCH = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)) {
    return forbiddenError();
  }

  try {
    const body = await req.json();
    const parsed = editSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, aadhar_number_mode, govt_id_mode } = parsed.data;

    const { data: updated, error } = await client
      .from("factories")
      .update({
        ...(name ? { name } : {}),
        ...(aadhar_number_mode ? { aadhar_number_mode } : {}),
        ...(govt_id_mode ? { govt_id_mode } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.factory_id)
      .select()
      .single();

    if (error) throw error;
    return formatEntityResponse(updated, StatusCodes.OK);
  } catch (err) {
    console.error("Failed to save factory settings:", err);
    return apiError(ApiErrorMessage.SAVE_CONFIGURATION_FAILED, StatusCodes.INTERNAL_SERVER_ERROR);
  }
});

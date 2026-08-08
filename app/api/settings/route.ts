import {
  withAuth,
  apiError,
  validateRequiredFields,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers"
import { ProjectSlug, PermissionKey, FieldRequirementMode, TableName, EntityKey } from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const GET = withAuth(async (_req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.READ)) {
    return forbiddenError()
  }

  const { data: factory, error } = await client
    .from(TableName.FACTORIES)
    .select("id, name, aadhar_number_mode, govt_id_mode, created_at, updated_at")
    .eq(EntityKey.ID, user.factory_id!)
    .maybeSingle()

  if (error || !factory) {
    return apiError(ApiErrorMessage.SETTING_NOT_FOUND, StatusCodes.NOT_FOUND)
  }

  return formatEntityResponse(factory)
})

export const POST = withAuth(async (req, user, client) => {
  if (
    !hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.CREATE) &&
    !hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)
  ) {
    return forbiddenError()
  }

  try {
    const body = await req.json()
    const err = validateRequiredFields(body, ProjectSlug.SETTINGS)
    if (err) return err

    const { name, aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode)
      ? aadhar_number_mode
      : FieldRequirementMode.MANDATORY
    const gMode = validModes.includes(govt_id_mode)
      ? govt_id_mode
      : FieldRequirementMode.MANDATORY

    const targetFactoryId = user.factory_id!

    const { data: updated, error } = await client
      .from(TableName.FACTORIES)
      .update({
        ...(name ? { name } : {}),
        aadhar_number_mode: aMode,
        govt_id_mode: gMode,
        updated_at: new Date().toISOString(),
      })
      .eq(EntityKey.ID, targetFactoryId)
      .select()
      .single()

    if (error) throw error
    return formatEntityResponse(updated, StatusCodes.OK)
  } catch (err) {
    console.error("Failed to save setting:", err)
    return apiError(ApiErrorMessage.SAVE_CONFIGURATION_FAILED, StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

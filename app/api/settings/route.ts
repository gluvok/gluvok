import {
  withAuth,
  apiError,
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
    .select(`${EntityKey.ID}, ${EntityKey.NAME}, ${EntityKey.AADHAR_NUMBER_MODE}, ${EntityKey.GOVT_ID_MODE}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`)
    .eq(EntityKey.ID, user.factory_id!)
    .maybeSingle()

  if (error || !factory) {
    return apiError(ApiErrorMessage.SETTING_NOT_FOUND, StatusCodes.NOT_FOUND)
  }

  return formatEntityResponse(factory)
})

export const PATCH = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE)) {
    return forbiddenError()
  }

  try {
    const body = await req.json()
    const { name, aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const aMode = validModes.includes(aadhar_number_mode) ? aadhar_number_mode : FieldRequirementMode.MANDATORY
    const gMode = validModes.includes(govt_id_mode) ? govt_id_mode : FieldRequirementMode.MANDATORY

    const { data: updated, error } = await client
      .from(TableName.FACTORIES)
      .update({
        ...(name ? { [EntityKey.NAME]: name } : {}),
        [EntityKey.AADHAR_NUMBER_MODE]: aMode,
        [EntityKey.GOVT_ID_MODE]: gMode,
        [EntityKey.UPDATED_AT]: new Date().toISOString(),
      })
      .eq(EntityKey.ID, user.factory_id!)
      .select()
      .single()

    if (error) throw error
    return formatEntityResponse(updated, StatusCodes.OK)
  } catch (err) {
    console.error("Failed to save factory settings:", err)
    return apiError(ApiErrorMessage.SAVE_CONFIGURATION_FAILED, StatusCodes.INTERNAL_SERVER_ERROR)
  }
})

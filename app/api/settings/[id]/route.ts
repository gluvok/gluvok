import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  formatEntityResponse,
} from "@/db/helpers"
import { ProjectSlug, PermissionKey, FieldRequirementMode, TableName, EntityKey } from "@/lib/constants/enums"
import { ApiErrorMessage } from "@/lib/constants/messages"

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { factoryId }) => {
    if (!hasPermission(user, ProjectSlug.SETTINGS, PermissionKey.WRITE))
      return forbiddenError()

    const body = await req.json()
    const { name, aadhar_number_mode, govt_id_mode } = body

    const validModes = Object.values(FieldRequirementMode)
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updatePayload[EntityKey.NAME] = name
    if (aadhar_number_mode !== undefined) {
      updatePayload[EntityKey.AADHAR_NUMBER_MODE] = validModes.includes(aadhar_number_mode)
        ? aadhar_number_mode
        : FieldRequirementMode.MANDATORY
    }
    if (govt_id_mode !== undefined) {
      updatePayload[EntityKey.GOVT_ID_MODE] = validModes.includes(govt_id_mode)
        ? govt_id_mode
        : FieldRequirementMode.MANDATORY
    }

    const { data: updated, error } = await client
      .from(TableName.FACTORIES)
      .update(updatePayload)
      .eq(EntityKey.ID, factoryId!)
      .select()
      .maybeSingle()

    if (error || !updated) return apiError(ApiErrorMessage.SETTING_NOT_FOUND, StatusCodes.NOT_FOUND)

    return formatEntityResponse(updated)
  })
)

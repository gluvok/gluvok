import { NextResponse } from "next/server";
import {
  withAuth,
  withEntityScope,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactory,
  formatEntityResponse,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { getDynamicCustomerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";

export const PATCH = withAuth(
  withEntityScope(async (req, user, client, _ctx, { entityId, factoryId }) => {
    const existingQuery = client
      .from("customers")
      .select("id, user_id, name")
      .eq("id", entityId)
      .eq("factory_id", factoryId)
      .is("deleted_at", null);

    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing) return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND);

    const isOwn = existing?.user_id != null && String(existing.user_id) === String(user.sub);

    if (!isOwn && !hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.WRITE)) {
      return forbiddenError();
    }

    const body = await req.json();
    const factory = await getFactory(client, user.factory_id);
    const dynamicSchema = getDynamicCustomerSchema(factory, true);
    const parsed = dynamicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const { name, father_name, govt_id, username, password } = body;

    if (username && typeof username === "string" && username.trim().length > 0) {
      const cleanUsername = username.trim();
      let userQuery = client
        .from("users")
        .select("id")
        .eq("username", cleanUsername)
        .is("deleted_at", null);
      if (existing?.user_id != null) {
        userQuery = userQuery.neq("id", existing.user_id);
      }
      const { data: takenUser } = await userQuery.maybeSingle();
      if (takenUser) {
        return apiError(ApiErrorMessage.USERNAME_TAKEN, StatusCodes.BAD_REQUEST);
      }
    }

    let passwordHash: string | null = null;
    if (password && typeof password === "string" && password.trim().length > 0) {
      passwordHash = await hashPassword(password.trim());
    }

    const { data: updated, error } = await client.rpc("update_customer_with_user", {
      p_customer_id: entityId,
      p_factory_id: factoryId,
      p_name: name ? String(name).trim() : null,
      p_father_name: father_name ? String(father_name).trim() : null,
      p_govt_id: govt_id != null ? Number(govt_id) : null,
      p_username: username && typeof username === "string" ? username.trim() : null,
      p_password_hash: passwordHash,
    });

    if (error || !updated) {
      return apiError(error?.message || ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return formatEntityResponse(updated);
  }),
);

export const DELETE = withAuth(
  withEntityScope(async (_req, user, client, _ctx, { entityId, factoryId }) => {
    if (!hasPermission(user, ProjectSlug.CUSTOMERS, PermissionKey.DELETE)) return forbiddenError();

    // Check if any active entries are linked to this customer
    const { data: linkedEntry } = await client
      .from("entries")
      .select("id")
      .eq("customer_id", entityId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (linkedEntry) {
      return apiError(ApiErrorMessage.CANNOT_DELETE_CUSTOMER(entityId), StatusCodes.BAD_REQUEST);
    }

    const { data: deletedCount, error } = await client.rpc("delete_customers_with_user", {
      p_customer_ids: [entityId],
      p_factory_id: factoryId,
    });

    if (error) {
      return apiError(
        error.message || ApiErrorMessage.CANNOT_DELETE_CUSTOMER(entityId),
        StatusCodes.BAD_REQUEST,
      );
    }

    if (!deletedCount || deletedCount === 0) {
      return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, id: entityId });
  }),
);

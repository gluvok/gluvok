import { NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
  parseBulkIds,
} from "@/db/helpers";
import { ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { formatWeighmentRecord, deleteWeighments } from "@/lib/services/weighments";
import { fetchWeighmentsList } from "@/lib/services/weighments/query";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.READ)) return forbiddenError();

  const pagination = getPaginationParams(req.nextUrl);
  const searchParams = req.nextUrl.searchParams;

  const result = await fetchWeighmentsList(client, {
    searchParams,
    user,
    pagination,
  });

  if (result.emptyResult) {
    return NextResponse.json({
      data: [],
      pagination: { page: pagination.page, limit: pagination.limit, total: 0 },
    });
  }

  if (result.error) {
    console.error("Supabase query error:", result.error);
    return apiError(
      result.error.message || ApiErrorMessage.DATABASE_QUERY_FAILED,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  const formattedData = (result.data || []).map((row: Record<string, unknown>) =>
    formatWeighmentRecord(row),
  );

  const total = result.count ?? formattedData.length;
  return NextResponse.json({
    data: formattedData,
    pagination: { page: pagination.page, limit: pagination.limit, total },
  });
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.WEIGHMENTS, PermissionKey.DELETE)) return forbiddenError();

  const ids = parseBulkIds(await req.json().catch(() => null));
  if (!ids) {
    return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);
  }

  const { deletedIds } = await deleteWeighments(client, user.factory_id!, ids);

  if (deletedIds.length === 0) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_WEIGHMENTS_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedIds.length });
});

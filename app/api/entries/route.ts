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
import {
  TableName,
  QueryParam,
  EntryStatus,
  EntryType,
  FilterValue,
  ProjectSlug,
  PermissionKey,
} from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { validateSequentialApproval, tryMergeEntries } from "@/lib/services/weighments";
import { uploadBase64ImagesToStorage } from "@/lib/services/storage";
import { addEntrySchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const startDate = req.nextUrl.searchParams.get(QueryParam.START_DATE);
  const endDate = req.nextUrl.searchParams.get(QueryParam.END_DATE);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN) || "created_at";
  const sortDesc = req.nextUrl.searchParams.has(QueryParam.SORT_DESC)
    ? req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true"
    : true;

  let query = client
    .from(TableName.ENTRIES)
    .select(
      `*, ${TableName.CENTERS}(name), ${TableName.USERS}(name), ${TableName.CUSTOMERS}(name)`,
      { count: "exact" },
    )
    .eq("factory_id", user.factory_id)
    .is("deleted_at", null)
    .order(sortColumn, { ascending: !sortDesc });

  const filterParams: Record<string, string | null> = {
    status: req.nextUrl.searchParams.get("status"),
    type: req.nextUrl.searchParams.get("type"),
    center_id: req.nextUrl.searchParams.get("center_id"),
    user_id: req.nextUrl.searchParams.get("user_id"),
    customer_id: req.nextUrl.searchParams.get("customer_id"),
  };

  for (const [key, val] of Object.entries(filterParams)) {
    if (val && val !== FilterValue.ALL) {
      const num = Number(val);
      query = query.eq(key, isNaN(num) ? val : num);
    }
  }

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  if (search) {
    const searchNum = parseInt(search, 10);
    query = isNaN(searchNum)
      ? query.or(`vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%`)
      : query.or(
          `vehicle_number.ilike.%${search}%,detected_vehicle_number.ilike.%${search}%,id.eq.${searchNum}`,
        );
  }

  const { page, limit, offset } = pagination;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error("Supabase query error:", error);
    return apiError(
      error.message || ApiErrorMessage.DATABASE_QUERY_FAILED,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  const formattedData = (data || []).map((row: Record<string, unknown>) => {
    const centers = row.centers as Record<string, unknown> | undefined;
    const users = row.users as Record<string, unknown> | undefined;
    const customers = row.customers as Record<string, unknown> | undefined;

    return {
      ...row,
      center_name: centers?.name || "",
      user_name: users?.name || "",
      customer_name: customers?.name || "",
    };
  });

  const total = count ?? formattedData.length;
  return NextResponse.json({
    data: formattedData,
    pagination: { page, limit, total },
  });
});

export const POST = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.CREATE)) return forbiddenError();
  try {
    const body = await req.json();
    const parsed = addEntrySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }

    const {
      vehicle_number,
      weight,
      center_id,
      customer_id,
      status = EntryStatus.PENDING,
      images = [],
    } = parsed.data;

    // Verify center_id belongs to the user's factory and is active
    const { data: centerRecord } = await client
      .from(TableName.CENTERS)
      .select("id")
      .eq("id", Number(center_id))
      .eq("factory_id", user.factory_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!centerRecord) {
      return apiError(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND, StatusCodes.BAD_REQUEST);
    }

    // Verify customer_id belongs to the user's factory and is active (if provided)
    if (customer_id) {
      const { data: customerRecord } = await client
        .from(TableName.CUSTOMERS)
        .select("id")
        .eq("id", Number(customer_id))
        .eq("factory_id", user.factory_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!customerRecord) {
        return apiError(ApiErrorMessage.CUSTOMER_NOT_FOUND, StatusCodes.BAD_REQUEST);
      }
    }

    const userId = parseInt(user.sub, 10);
    const nowStr = new Date().toISOString();
    const uploadedImageUrls = await uploadBase64ImagesToStorage(images, user.factory_id);

    if (status === EntryStatus.APPROVED) {
      await validateSequentialApproval(
        client,
        Number(center_id),
        vehicle_number,
        nowStr,
        0,
        EntryType.MANUAL,
      );
    }

    const { data: newEntry, error: insertErr } = await client
      .from(TableName.ENTRIES)
      .insert({
        detected_vehicle_number: null,
        vehicle_number,
        weight: Number(weight),
        type: EntryType.MANUAL,
        center_id: Number(center_id),
        user_id: userId,
        customer_id: customer_id ? Number(customer_id) : null,
        factory_id: user.factory_id,
        status,
        images: uploadedImageUrls,
        created_at: nowStr,
        updated_at: nowStr,
      })
      .select("*")
      .single();

    if (insertErr || !newEntry) {
      console.error("Failed to insert manual entry:", insertErr);
      return apiError(ApiErrorMessage.CREATE_ENTRY_FAILED, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (status === EntryStatus.APPROVED) {
      await tryMergeEntries(client, user.factory_id, newEntry.id);
    }

    return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ApiErrorMessage.PROCESS_ENTRY_FAILED;
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
});

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  // Check if any active weighments are linked to these entries
  const { data: linkedWeighments } = await client
    .from(TableName.WEIGHMENTS)
    .select("id")
    .or(`in_entry_id.in.(${ids.join(",")}),out_entry_id.in.(${ids.join(",")})`)
    .is("deleted_at", null)
    .limit(1);

  if (linkedWeighments && linkedWeighments.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedEntries, error } = await client
    .from(TableName.ENTRIES)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .is("deleted_at", null)
    .eq("factory_id", user.factory_id)
    .select("id");

  if (error) {
    return apiError(
      error.message || ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES,
      StatusCodes.BAD_REQUEST,
    );
  }

  const deletedCount = deletedEntries?.length || 0;
  if (deletedCount !== ids.length) {
    return apiError(ApiErrorMessage.ONE_OR_MORE_ENTRIES_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ success: true, deleted_count: deletedCount });
});

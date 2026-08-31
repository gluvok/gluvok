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
import { EntryStatus, EntryType, ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { createEntry } from "@/lib/services/entries";
import { addEntrySchema, addDeviceEntrySchema } from "@/lib/validation";

export const GET = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.READ)) return forbiddenError();
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search");
  const startDate = req.nextUrl.searchParams.get("start_date");
  const endDate = req.nextUrl.searchParams.get("end_date");
  const sortColumn = req.nextUrl.searchParams.get("sort_column") || "created_at";
  const sortDesc = req.nextUrl.searchParams.has("sort_desc")
    ? req.nextUrl.searchParams.get("sort_desc") === "true"
    : true;

  let query = client
    .from("entries")
    .select(`*, centers(name), users(name), customers(name)`, { count: "exact" })
    .eq("factory_id", user.factory_id)
    .is("deleted_at", null)
    .order(sortColumn, { ascending: !sortDesc });

  const filterParams: Record<string, string | null> = {
    status: req.nextUrl.searchParams.get("status"),
    type: req.nextUrl.searchParams.get("type"),
    center_id: req.nextUrl.searchParams.get("center_id"),
    user_id: req.nextUrl.searchParams.get("user_id"),
    customer_id: req.nextUrl.searchParams.get("customer_id"),
    auto_approved: req.nextUrl.searchParams.get("auto_approved"),
    edited: req.nextUrl.searchParams.get("edited"),
  };

  for (const [key, val] of Object.entries(filterParams)) {
    if (val && val !== "all") {
      if (val === "true" || val === "false") {
        query = query.eq(key, val === "true");
      } else {
        const num = Number(val);
        query = query.eq(key, isNaN(num) ? val : num);
      }
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
  try {
    const isHardware = user.role === Role.HARDWARE;
    const body = await req.json();

    if (isHardware) {
      const parsed = addDeviceEntrySchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
      }

      const { detected_vehicle_number, vehicle_number, weight, center_id, status, images } =
        parsed.data;

      const newEntry = await createEntry(client, {
        factoryId: user.factory_id,
        userId: parseInt(user.sub, 10),
        type: EntryType.AUTOMATIC,
        detectedVehicleNumber: detected_vehicle_number,
        vehicleNumber: vehicle_number,
        weight,
        centerId: center_id,
        status,
        images,
      });

      return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
    }

    if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.CREATE)) return forbiddenError();

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

    const newEntry = await createEntry(client, {
      factoryId: user.factory_id,
      userId: parseInt(user.sub, 10),
      type: EntryType.MANUAL,
      vehicleNumber: vehicle_number,
      weight,
      centerId: center_id,
      customerId: customer_id,
      status,
      images,
    });

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
    .from("weighments")
    .select("id")
    .or(`in_entry_id.in.(${ids.join(",")}),out_entry_id.in.(${ids.join(",")})`)
    .is("deleted_at", null)
    .limit(1);

  if (linkedWeighments && linkedWeighments.length > 0) {
    return apiError(ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES, StatusCodes.BAD_REQUEST);
  }

  const { data: deletedEntries, error } = await client
    .from("entries")
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

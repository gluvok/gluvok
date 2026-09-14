import { type NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  getPaginationParams,
  apiError,
  StatusCodes,
  forbiddenError,
  hasPermission,
  parseBulkIds,
  type RouteContext,
} from "@/db/helpers";
import { type JWTPayload } from "@/lib/auth/jwt";
import { EntrySource, EntryStatus, ProjectSlug, PermissionKey, Role } from "@/lib/constants/enums";
import { ApiErrorMessage } from "@/lib/constants/messages";
import { createEntry, deleteEntries } from "@/lib/services/entries";
import { verifyDeviceRequest } from "@/lib/auth/device";
import { supabase } from "@/db";
import { addEntrySchema, addDeviceEntrySchema, type AddDeviceEntryInput } from "@/lib/validation";

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

  const selectString =
    user.role === Role.BASE
      ? `*, centers(name), created_by_user:users!created_by(name, role), approved_by_user:users!approved_by(name, role), customers!inner(name, user_id)`
      : `*, centers(name), created_by_user:users!created_by(name, role), approved_by_user:users!approved_by(name, role), customers(name)`;

  let query = client
    .from("entries")
    .select(selectString, { count: "exact" })
    .eq("factory_id", user.factory_id)
    .is("deleted_at", null)
    .order(sortColumn, { ascending: !sortDesc });

  if (user.role === Role.BASE) {
    query = query.eq("customers.user_id", parseInt(user.sub, 10));
  }

  const sourceParam = req.nextUrl.searchParams.get("source");
  const filterParams: Record<string, string | null> = {
    status: req.nextUrl.searchParams.get("status"),
    center_id: req.nextUrl.searchParams.get("center_id"),
    created_by:
      req.nextUrl.searchParams.get("created_by") || req.nextUrl.searchParams.get("user_id"),
    customer_id: req.nextUrl.searchParams.get("customer_id"),
    auto_approved: req.nextUrl.searchParams.get("auto_approved"),
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
      ? query.ilike("vehicle_number", `%${search}%`)
      : query.or(`vehicle_number.ilike.%${search}%,id.eq.${searchNum}`);
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

  let formattedData = (data || []).map((row: Record<string, unknown>) => {
    const centers = row.centers as Record<string, unknown> | undefined;
    const createdByUser = (row.created_by_user || row.users) as Record<string, unknown> | undefined;
    const approvedByUser = row.approved_by_user as Record<string, unknown> | undefined;
    const customers = row.customers as Record<string, unknown> | undefined;

    const isHardware = createdByUser?.role === Role.HARDWARE;

    return {
      ...row,
      source: isHardware ? EntrySource.DEVICE : EntrySource.MANUAL,
      center_name: centers?.name || "",
      created_by_name: createdByUser?.name || "",
      approved_by_name: approvedByUser?.name || "",
      user_name: createdByUser?.name || "",
      customer_name: customers?.name || "",
    };
  });

  if (sourceParam && sourceParam !== "all") {
    formattedData = formattedData.filter((item) => item.source === sourceParam);
  }

  const total = count ?? formattedData.length;
  return NextResponse.json({
    data: formattedData,
    pagination: { page, limit, total },
  });
});

async function handleEntryPost(req: NextRequest, user: JWTPayload, client: typeof supabase) {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.CREATE)) {
    return forbiddenError();
  }

  const body = await req.json();
  const isHardware = user.role === Role.HARDWARE;

  const parsed = isHardware ? addDeviceEntrySchema.safeParse(body) : addEntrySchema.safeParse(body);

  if (!parsed.success) {
    const fallbackParsed = addEntrySchema.safeParse(body);
    if (!fallbackParsed.success) {
      return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
    }
  }

  const rawData = body as Record<string, unknown>;
  const centerId = rawData.center_id ? Number(rawData.center_id) : undefined;

  if (!centerId) {
    return apiError(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND, StatusCodes.BAD_REQUEST);
  }

  const vehicleNumber =
    ((rawData.vehicle_number || rawData.detected_vehicle_number) as string) || "";
  const detectedVehicleNumber =
    (rawData.detected_vehicle_number as string) || (isHardware ? vehicleNumber : null);
  const weight = Number(rawData.weight);
  const customerId = rawData.customer_id ? Number(rawData.customer_id) : null;
  const status = (rawData.status as EntryStatus) || EntryStatus.PENDING;
  const images = (rawData.images as string[]) || [];

  const newEntry = await createEntry(client, {
    factoryId: user.factory_id!,
    centerId,
    createdBy: parseInt(user.sub, 10),
    vehicleNumber,
    detectedVehicleNumber,
    weight,
    customerId,
    status: isHardware ? EntryStatus.PENDING : status,
    images,
  });

  return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
}

const authedPostHandler = withAuth(handleEntryPost);

export async function POST(req: NextRequest, ...rest: unknown[]) {
  try {
    const hasDeviceHeaders = req.headers.has("x-device-id") || req.headers.has("x-device-key");
    if (hasDeviceHeaders) {
      const authResult = await verifyDeviceRequest(req, supabase);
      if (!authResult.success || !authResult.device) {
        return apiError(
          authResult.error || ApiErrorMessage.UNAUTHORIZED_DEVICE,
          authResult.status || StatusCodes.FORBIDDEN,
        );
      }

      const device = authResult.device;
      const body = await req.json();
      const parsed = addDeviceEntrySchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
      }

      const centerId = (parsed.data as AddDeviceEntryInput).center_id;
      const { data: centerRecord } = await supabase
        .from("centers")
        .select("id, factory_id")
        .eq("id", centerId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!centerRecord) {
        return apiError(ApiErrorMessage.SELECTED_CENTER_NOT_FOUND, StatusCodes.BAD_REQUEST);
      }

      const newEntry = await createEntry(supabase, {
        factoryId: centerRecord.factory_id,
        centerId,
        createdBy: device.id,
        detectedVehicleNumber: (parsed.data as AddDeviceEntryInput).detected_vehicle_number,
        vehicleNumber: (parsed.data as AddDeviceEntryInput).detected_vehicle_number,
        weight: (parsed.data as AddDeviceEntryInput).weight,
        images: (parsed.data as AddDeviceEntryInput).images,
      });

      return NextResponse.json({ data: newEntry }, { status: StatusCodes.CREATED });
    }

    // Direct invocation support in unit test environments
    if (rest.length >= 1 && typeof rest[0] === "object" && rest[0] !== null && "role" in rest[0]) {
      const user = rest[0] as JWTPayload;
      const client = (rest[1] as typeof supabase) || supabase;
      return await handleEntryPost(req, user, client);
    }

    return await authedPostHandler(req, rest[0] as RouteContext);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ApiErrorMessage.PROCESS_ENTRY_FAILED;
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
}

export const DELETE = withAuth(async (req, user, client) => {
  if (!hasPermission(user, ProjectSlug.ENTRIES, PermissionKey.DELETE)) return forbiddenError();

  const ids = parseBulkIds(await req.json());
  if (!ids) return apiError(ApiErrorMessage.PROVIDE_VALID_IDS, StatusCodes.BAD_REQUEST);

  try {
    const { deletedIds } = await deleteEntries(client, user.factory_id!, ids);

    if (deletedIds.length !== ids.length) {
      return apiError(ApiErrorMessage.ONE_OR_MORE_ENTRIES_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true, deleted_count: deletedIds.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ApiErrorMessage.CANNOT_DELETE_SELECTED_ENTRIES;
    return apiError(msg, StatusCodes.BAD_REQUEST);
  }
});

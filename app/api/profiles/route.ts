import { NextResponse } from "next/server";
import { eq, ilike, and, or, count, inArray } from "drizzle-orm";
import { getTables, sharedSchema } from "@/db/schema";
import {
  withAuth,
  getPaginationParams,
  apiError,
  forbiddenError,
  hasPermission,
  StatusCodes,
  getFactoryConfig,
  getFactoryWhereClause,
  fetchPaginatedResult,
  formatEntityResponse,
  isFKViolation,
  parseBulkIds,
  getOrderByClause,
} from "@/db/helpers";
import {
  Role,
  TenantMode,
  ProjectSlug,
  PermissionKey,
  QueryParam,
  EntityKey,
  FilterValue,
  FieldRequirementMode,
} from "@/lib/constants/enums";
import { getDynamicProfileSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";

export const GET = withAuth(async (req, user, db, mode) => {
  const pagination = getPaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get(QueryParam.SEARCH);
  const sortColumn = req.nextUrl.searchParams.get(QueryParam.SORT_COLUMN);
  const sortDesc =
    req.nextUrl.searchParams.get(QueryParam.SORT_DESC) === "true";
  const roleParam = req.nextUrl.searchParams.get(EntityKey.ROLE);

  const { profiles, users } = getTables(mode);

  const activeConfig = await getFactoryConfig(user.factory_id, db, mode);
  const isAadharNotRequired =
    activeConfig?.aadharNumberMode === FieldRequirementMode.NOT_REQUIRED;

  const factoryCond = getFactoryWhereClause(
    user,
    mode,
    sharedSchema.users.factory_id,
  );
  const conditions = [];
  if (factoryCond) conditions.push(factoryCond);
  if (roleParam && roleParam !== FilterValue.ALL)
    conditions.push(eq(profiles.role, roleParam as Role));

  if (search) {
    const searchNum = parseInt(search, 10);
    const searchConds = [
      ilike(users.name, `%${search}%`),
      ...(isAadharNotRequired
        ? []
        : [ilike(profiles.aadhar_number, `%${search}%`)]),
      ilike(users.username, `%${search}%`),
    ];
    if (!isNaN(searchNum)) {
      searchConds.push(eq(profiles.id, searchNum));
    }
    conditions.push(or(...searchConds));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: profiles.id,
      user_id: profiles.user_id,
      name: users.name,
      ...(isAadharNotRequired ? {} : { aadhar_number: profiles.aadhar_number }),
      role: profiles.role,
      created_at: profiles.created_at,
      updated_at: profiles.updated_at,
      username: users.username,
      ...(mode === TenantMode.SHARED
        ? { factory_id: sharedSchema.users.factory_id }
        : {}),
      is_active: users.is_active,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.user_id, users.id))
    .$dynamic();

  const countQuery = db
    .select({ count: count() })
    .from(profiles)
    .innerJoin(users, eq(profiles.user_id, users.id))
    .$dynamic();

  const sortable = { ...profiles, ...users };
  const orderByClause = getOrderByClause(sortable, sortColumn, sortDesc, profiles.created_at);

  return fetchPaginatedResult(
    db,
    countQuery,
    baseQuery,
    whereClause,
    pagination,
    orderByClause,
  );
});

export const POST = withAuth(async (req, user, db, mode) => {
  const body = await req.json();
  const targetFactoryId = user.factory_id;
  const activeConfig = await getFactoryConfig(targetFactoryId, db, mode);

  const dynamicSchema = getDynamicProfileSchema(activeConfig);
  const parsed = dynamicSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return apiError(firstIssue.message, StatusCodes.BAD_REQUEST);
  }

  const { name, aadhar_number, username, password, role } = parsed.data as {
    name: string;
    aadhar_number?: string | null;
    username: string;
    password: string;
    role: Role;
  };

  const { profiles, users } = getTables(mode);

  const [existingUser] = await db
    .select({ id: sharedSchema.users.id })
    .from(users)
    .where(eq(sharedSchema.users.username, username));
  if (existingUser)
    return apiError("Username is already taken", StatusCodes.BAD_REQUEST);

  if (aadhar_number) {
    const aadharConditions = [
      eq(sharedSchema.profiles.aadhar_number, aadhar_number),
    ];
    if (mode === TenantMode.SHARED && targetFactoryId) {
      aadharConditions.push(eq(sharedSchema.users.factory_id, targetFactoryId));
    }
    const [existingProfile] = await db
      .select({ id: sharedSchema.profiles.id })
      .from(profiles)
      .innerJoin(users, eq(sharedSchema.profiles.user_id, sharedSchema.users.id))
      .where(and(...aadharConditions));
    if (existingProfile)
      return apiError(
        mode === TenantMode.SHARED
          ? "Aadhar number is already registered in this factory"
          : "Aadhar number is already registered",
        StatusCodes.BAD_REQUEST,
      );
  }

  const passwordHash = await hashPassword(password);
  const userValues = {
    name,
    username,
    password_hash: passwordHash,
    role,
    ...(mode === TenantMode.SHARED ? { factory_id: targetFactoryId } : {}),
  };
  const [newUser] = await db
    .insert(users as typeof sharedSchema.users)
    .values(userValues as typeof sharedSchema.users.$inferInsert)
    .returning();

  const [newProfile] = await db
    .insert(profiles as typeof sharedSchema.profiles)
    .values({
      user_id: newUser.id,
      ...(aadhar_number ? { aadhar_number: aadhar_number } : {}),
      role,
    } as typeof sharedSchema.profiles.$inferInsert)
    .returning();

  return formatEntityResponse(
    {
      ...(newProfile as Record<string, unknown>),
      name: newUser.name,
      username: newUser.username,
      is_active: newUser.is_active,
      ...(mode === TenantMode.SHARED ? { factory_id: targetFactoryId } : {}),
    },
    mode,
    StatusCodes.CREATED,
  );
});

export const DELETE = withAuth(async (req, user, db, mode) => {
  if (!hasPermission(user, ProjectSlug.PROFILES, PermissionKey.DELETE))
    return forbiddenError();
  const ids = parseBulkIds(await req.json());
  if (!ids)
    return apiError(
      "Provide between 1 and 100 valid IDs",
      StatusCodes.BAD_REQUEST,
    );
  if (mode === TenantMode.SHARED && user.factory_id == null)
    return forbiddenError();
  const factoryId = user.factory_id as number;

  const { profiles, users } = getTables(mode);
  const ownershipScope =
    mode === TenantMode.SHARED
      ? and(
          inArray(profiles.id, ids),
          eq(sharedSchema.users.factory_id, factoryId),
        )
      : inArray(profiles.id, ids);
  const scopedProfileIds = db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(users, eq(profiles.user_id, users.id))
    .where(ownershipScope);

  try {
    const deletedCount = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(profiles)
        .where(inArray(profiles.id, scopedProfileIds))
        .returning({ id: profiles.id });
      if (deleted.length !== ids.length)
        throw new Error("BULK_DELETE_INCOMPLETE");
      return deleted.length;
    });
    return NextResponse.json({ success: true, deleted_count: deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "BULK_DELETE_INCOMPLETE") {
      return apiError(
        "One or more profiles were not found",
        StatusCodes.NOT_FOUND,
      );
    }
    if (isFKViolation(error)) {
      return apiError(
        "Cannot delete selected profiles because they are referenced by existing weighments.",
        StatusCodes.BAD_REQUEST,
      );
    }
    throw error;
  }
});

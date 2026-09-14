/**
 * @file tests/mocks/supabase.ts
 * @description Shared Supabase mock client and query builder utilities for unit and integration testing.
 */

import { vi, type Mock } from "vitest";
import { Role, EntryStatus, EntrySource, Unit, WeighmentType } from "@/lib/constants/enums";

export interface MockQueryResult<T = unknown> {
  data?: T | null;
  error?: unknown;
  count?: number | null;
}

export interface MockQueryBuilderOptions<T = unknown> {
  data?: T | null;
  error?: unknown;
  count?: number | null;
  singleData?: T | null;
  singleError?: unknown;
  maybeSingleData?: T | null;
  maybeSingleError?: unknown;
}

export type MockQueryBuilder<T = unknown> = Promise<MockQueryResult<T>> & {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  upsert: Mock;
  eq: Mock;
  neq: Mock;
  gt: Mock;
  gte: Mock;
  lt: Mock;
  lte: Mock;
  is: Mock;
  in: Mock;
  or: Mock;
  order: Mock;
  limit: Mock;
  range: Mock;
  single: Mock;
  maybeSingle: Mock;
  [key: string]: unknown;
};

/**
 * Creates a chainable mock Supabase query builder.
 * Any method call like .select(), .eq(), .order() returns the builder itself by default.
 * Terminal calls like .single(), .maybeSingle(), or `await query` return the configured data/error.
 */
export function createMockQueryBuilder<T = unknown>(
  options: MockQueryBuilderOptions<T> = {},
): MockQueryBuilder<T> {
  const {
    data = null,
    error = null,
    count = null,
    singleData,
    singleError,
    maybeSingleData,
    maybeSingleError,
  } = options;

  const defaultResult: MockQueryResult<T> = { data, error, count };
  const singleResult: MockQueryResult<T> = {
    data: singleData !== undefined ? singleData : data,
    error: singleError !== undefined ? singleError : error,
  };
  const maybeSingleResult: MockQueryResult<T> = {
    data: maybeSingleData !== undefined ? maybeSingleData : data,
    error: maybeSingleError !== undefined ? maybeSingleError : error,
  };

  const promise = (error
    ? Promise.reject(error).catch((err) => ({ data: null, error: err, count: null }))
    : Promise.resolve(defaultResult)) as unknown as MockQueryBuilder<T>;

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "is",
    "in",
    "contains",
    "containedBy",
    "or",
    "not",
    "match",
    "filter",
    "order",
    "limit",
  ];

  chainMethods.forEach((method) => {
    (promise as unknown as Record<string, unknown>)[method] = vi.fn().mockReturnValue(promise);
  });

  promise.range = vi.fn().mockResolvedValue(defaultResult);
  promise.single = vi.fn().mockResolvedValue(singleResult);
  promise.maybeSingle = vi.fn().mockResolvedValue(maybeSingleResult);

  return promise;
}

export type TableHandlerMap = Record<
  string,
  MockQueryBuilder | ((table: string) => MockQueryBuilder | unknown)
>;

export interface MockSupabaseClient {
  from: Mock;
  rpc: Mock;
  auth: {
    getUser: Mock;
    getSession: Mock;
  };
}

/**
 * Creates a mock Supabase client with a spyable `.from(table)` dispatcher.
 */
export function createMockSupabase(
  tablesOrHandler?: TableHandlerMap | ((table: string) => unknown),
): MockSupabaseClient {
  const fromMock = vi.fn((table: string) => {
    if (typeof tablesOrHandler === "function") {
      return tablesOrHandler(table);
    }
    if (tablesOrHandler && table in tablesOrHandler) {
      const handler = tablesOrHandler[table];
      return typeof handler === "function" ? handler(table) : handler;
    }
    return createMockQueryBuilder();
  });

  return {
    from: fromMock,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };
}

// ---------------------------------------------------------------------------
// Common Domain Fixtures
// ---------------------------------------------------------------------------

export interface MockUserContext {
  sub: string;
  username: string;
  role: Role;
  factory_id: number;
  factory_name?: string;
  name?: string;
}

export function createMockUser(overrides: Partial<MockUserContext> = {}): MockUserContext {
  return {
    sub: "1",
    username: "operator",
    role: Role.OPERATOR,
    factory_id: 1,
    factory_name: "Default Factory",
    ...overrides,
  };
}

export interface MockEntryRecord {
  id: number;
  vehicle_number: string;
  detected_vehicle_number: string | null;
  weight: number;
  status: EntryStatus;
  source: EntrySource;
  device_id?: number | null;
  user_id?: number | null;
  auto_approved: boolean;
  customer_id: number | null;
  center_id: number;
  factory_id: number;
  images: string[];
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export function createMockEntry(overrides: Partial<MockEntryRecord> = {}): MockEntryRecord {
  const deviceId =
    overrides.device_id !== undefined
      ? overrides.device_id
      : overrides.source === EntrySource.MANUAL
        ? null
        : 1;
  return {
    id: 10,
    vehicle_number: "KA01AB1111",
    detected_vehicle_number: "KA01AB1111",
    weight: 15000,
    status: EntryStatus.APPROVED,
    device_id: deviceId,
    user_id: overrides.user_id !== undefined ? overrides.user_id : null,
    source: overrides.source ?? (deviceId != null ? EntrySource.DEVICE : EntrySource.MANUAL),
    auto_approved: true,
    customer_id: null,
    center_id: 1,
    factory_id: 1,
    images: [],
    created_at: "2026-08-31T00:00:00Z",
    updated_at: "2026-08-31T00:00:00Z",
    ...overrides,
  };
}

export interface MockWeighmentRecord {
  id: number;
  unit: Unit;
  type: WeighmentType;
  rate_id: number | null;
  in_entry_id: number;
  out_entry_id: number;
  created_at: string;
  updated_at: string;
  in_entry?: Partial<MockEntryRecord>;
  out_entry?: Partial<MockEntryRecord>;
  [key: string]: unknown;
}

export function createMockWeighment(
  overrides: Partial<MockWeighmentRecord> = {},
): MockWeighmentRecord {
  return {
    id: 10,
    unit: Unit.KG,
    type: WeighmentType.UNASSIGNED,
    rate_id: 5,
    in_entry_id: 1,
    out_entry_id: 2,
    created_at: "2026-08-31T10:00:00Z",
    updated_at: "2026-08-31T10:00:00Z",
    in_entry: {
      center_id: 1,
      weight: 15000,
      vehicle_number: "KA01AB1234",
      status: EntryStatus.APPROVED,
      device_id: 1,
      source: EntrySource.DEVICE,
      created_at: "2026-08-31T08:00:00Z",
    },
    out_entry: {
      center_id: 1,
      weight: 5000,
      vehicle_number: "KA01AB1234",
      status: EntryStatus.APPROVED,
      device_id: 1,
      source: EntrySource.DEVICE,
      created_at: "2026-08-31T10:00:00Z",
    },
    ...overrides,
  };
}

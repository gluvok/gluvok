import { describe, it, expect } from "vitest";
import {
  createMockQueryBuilder,
  createMockSupabase,
  createMockUser,
  createMockEntry,
  createMockWeighment,
  createMockJsonRequest,
} from "./test-utils";
import { Role, EntryStatus, EntrySource, Unit, WeighmentType } from "@/lib/constants/enums";

describe("Test Utils & Mocks", () => {
  it("creates a chainable query builder with thenable resolution", async () => {
    const query = createMockQueryBuilder({ data: [{ id: 1 }] });

    const result = await query.select("*").eq("id", 1).limit(5);
    expect(result).toEqual({ data: [{ id: 1 }], error: null, count: null });
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("id", 1);
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("handles single() and maybeSingle() with dedicated overrides", async () => {
    const query = createMockQueryBuilder({
      data: [{ id: 1 }],
      singleData: { id: 1, name: "Single" },
      maybeSingleData: { id: 1, name: "MaybeSingle" },
    });

    const singleRes = await query.select().eq("id", 1).single();
    expect(singleRes.data).toEqual({ id: 1, name: "Single" });

    const maybeSingleRes = await query.select().eq("id", 1).maybeSingle();
    expect(maybeSingleRes.data).toEqual({ id: 1, name: "MaybeSingle" });
  });

  it("creates mock Supabase client with table routing", async () => {
    const client = createMockSupabase({
      entries: createMockQueryBuilder({ data: [{ id: 10 }] }),
      weighments: createMockQueryBuilder({ data: [{ id: 20 }] }),
    });

    const entriesRes = await client.from("entries").select();
    expect(entriesRes.data).toEqual([{ id: 10 }]);

    const weighmentsRes = await client.from("weighments").select();
    expect(weighmentsRes.data).toEqual([{ id: 20 }]);
  });

  it("generates standard domain mock fixtures", () => {
    const user = createMockUser({ role: Role.ADMIN });
    expect(user.role).toBe(Role.ADMIN);
    expect(user.username).toBe("operator");

    const entry = createMockEntry({ weight: 25000 });
    expect(entry.weight).toBe(25000);
    expect(entry.status).toBe(EntryStatus.APPROVED);
    expect(entry.source).toBe(EntrySource.DEVICE);

    const weighment = createMockWeighment({ unit: Unit.Q });
    expect(weighment.unit).toBe(Unit.Q);
    expect(weighment.type).toBe(WeighmentType.UNASSIGNED);
  });

  it("creates mock json request", async () => {
    const req = createMockJsonRequest("http://localhost/api/test", "POST", { test: true });
    expect(req.method).toBe("POST");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    const json = await req.json();
    expect(json).toEqual({ test: true });
  });
});

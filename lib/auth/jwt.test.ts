import { afterEach, describe, expect, it } from "vitest"
import { TenantMode } from "@/lib/constants/enums"
import { signJWT, verifyJWT } from "./jwt"

const originalJwtSecret = process.env.JWT_SECRET

afterEach(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = originalJwtSecret
  }
})

describe("JWT profile claims", () => {
  it("preserves an operator profile ID for device weighment submissions", async () => {
    process.env.JWT_SECRET = "test-secret"

    const token = await signJWT({
      sub: "42",
      username: "operator_01",
      role: "operator",
      factory_id: 7,
      profile_id: 18,
      tenant_mode: TenantMode.SHARED,
    }, "1d")

    await expect(verifyJWT(token)).resolves.toEqual({
      sub: "42",
      username: "operator_01",
      role: "operator",
      factory_id: 7,
      profile_id: 18,
      tenant_mode: TenantMode.SHARED,
    })
  })
})
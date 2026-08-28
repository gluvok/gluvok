import { afterEach, describe, expect, it } from "vitest";
import { getTokenExpiresIn, signJWT, verifyJWT, signRefreshToken, verifyRefreshToken } from "./jwt";

const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

describe("JWT claims", () => {
  it("preserves user claims including name and factory_id", async () => {
    process.env.JWT_SECRET = "test-secret";

    const token = await signJWT(
      {
        sub: "42",
        username: "operator_01",
        name: "Operator 01",
        role: "operator",
        factory_id: 7,
      },
      "1d",
    );

    await expect(verifyJWT(token)).resolves.toEqual({
      sub: "42",
      username: "operator_01",
      name: "Operator 01",
      role: "operator",
      factory_id: 7,
    });
  });

  it("reports the signed token lifetime for client responses", async () => {
    process.env.JWT_SECRET = "test-secret";

    const token = await signJWT(
      {
        sub: "42",
        username: "operator_01",
        name: "Operator 01",
        role: "operator",
        factory_id: 7,
      },
      "1h",
    );

    expect(getTokenExpiresIn(token)).toBe(3600);
  });

  it("signs and verifies refresh tokens with token_version", async () => {
    process.env.JWT_SECRET = "test-secret";

    const refreshToken = await signRefreshToken(
      {
        sub: "42",
        token_version: 3,
      },
      "7d",
    );

    const verified = await verifyRefreshToken(refreshToken);
    expect(verified).toEqual({
      sub: "42",
      token_version: 3,
    });
  });

  it("returns null for invalid or corrupted refresh tokens", async () => {
    process.env.JWT_SECRET = "test-secret";
    const verified = await verifyRefreshToken("invalid.token.payload");
    expect(verified).toBeNull();
  });
});

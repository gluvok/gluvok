import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { getWorkspace } from "./workspace"

describe("getWorkspace", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.APP_DOMAIN = "gluvok.com"
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createReq(host: string): NextRequest {
    return new NextRequest(`https://${host}/api/weighments`, {
      headers: { host },
    })
  }

  it("should extract subdomain as workspace name", () => {
    const req = createReq("neon.gluvok.com")
    expect(getWorkspace(req)).toBe("neon")
  })

  it("should return null for root domain", () => {
    const req = createReq("gluvok.com")
    expect(getWorkspace(req)).toBeNull()
  })

  it("should return null for ignored subdomains like www", () => {
    const req = createReq("www.gluvok.com")
    expect(getWorkspace(req)).toBeNull()
  })

  it("should return null for localhost without APP_DOMAIN set", () => {
    delete process.env.APP_DOMAIN
    const req = createReq("localhost:3000")
    expect(getWorkspace(req)).toBeNull()
  })

  it("should support subdomain on localhost when APP_DOMAIN=localhost", () => {
    process.env.APP_DOMAIN = "localhost"
    const req = createReq("neon.localhost:3000")
    expect(getWorkspace(req)).toBe("neon")
  })
})

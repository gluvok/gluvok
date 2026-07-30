import { defineConfig } from "drizzle-kit"

export function createDrizzleConfig(type: "shared" | "standalone") {
  return defineConfig({
    dialect: "postgresql",
    schema: `./db/schema/${type}.ts`,
    out: `./drizzle/${type}`,
    dbCredentials: {
      url: process.env.DATABASE_URL || "",
    },
  })
}

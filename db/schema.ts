/**
 * @file db/schema.ts
 * @description Backwards-compatible re-export from db/schema/shared.ts and schema index.
 */
export * from "./schema/shared"
export { getTables, sharedSchema, standaloneSchema } from "./schema/index"

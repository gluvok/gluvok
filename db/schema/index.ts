/**
 * @file db/schema/index.ts
 * @description Re-exports both shared and standalone schemas by name, plus getTables(mode) helper.
 */

import { TenantMode } from "@/lib/constants/enums"
import * as sharedSchema from "./shared"
import * as standaloneSchema from "./standalone"

export * as sharedSchema from "./shared"
export * as standaloneSchema from "./standalone"

/**
 * Returns the appropriate Drizzle schema table mapping for the given TenantMode.
 */
export function getTables(mode: TenantMode) {
  return mode === TenantMode.DEDICATED ? standaloneSchema : sharedSchema
}

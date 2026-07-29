/**
 * @file lib/services/customers/query.ts
 * @description Query definition and row mapping for the customers entity.
 */

import { supabase } from "@/lib/supabase"
import { type Customer } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export const TABLE_NAME = ProjectSlug.CUSTOMERS

export const SELECT_QUERY = "*"

export const buildListQuery = () => supabase.from(TABLE_NAME).select(SELECT_QUERY)

export const buildPaginatedQuery = () => supabase.from(TABLE_NAME).select(SELECT_QUERY, { count: "exact" })

export async function enrichCustomer(item: {
  user_id?: string | null
}): Promise<Customer> {
  return item as Customer
}

export async function enrichCustomers(data: {
  user_id?: string | null
}[]): Promise<Customer[]> {
  return data as Customer[]
}

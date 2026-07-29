import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Customer } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCustomersPaginated(params: PaginatedParams): Promise<{ data: Customer[]; count: number }> {
  return fetchEntityPaginatedFromApi<Customer>(ProjectSlug.CUSTOMERS, params)
}

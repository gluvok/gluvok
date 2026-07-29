import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Customer } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCustomersPaginated(params: PaginatedParams): Promise<{ data: Customer[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Customer[]; pagination: { total: number } }>(ApiRoutes.CUSTOMERS, {
    params: {
      page: page + 1,
      limit: pageSize,
      search,
    },
  })

  return {
    data: res.data.data,
    count: res.data.pagination.total,
  }
}

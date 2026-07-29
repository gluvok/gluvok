import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Factory } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchFactoriesPaginated(params: PaginatedParams): Promise<{ data: Factory[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Factory[]; pagination: { total: number } }>(ApiRoutes.FACTORIES, {
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

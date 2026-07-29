import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Commodity } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCommoditiesPaginated(params: PaginatedParams): Promise<{ data: Commodity[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Commodity[]; pagination: { total: number } }>(ApiRoutes.COMMODITIES, {
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

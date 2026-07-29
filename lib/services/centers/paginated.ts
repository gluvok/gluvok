import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Center } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCentersPaginated(params: PaginatedParams): Promise<{ data: Center[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Center[]; pagination: { total: number } }>(ApiRoutes.CENTERS, {
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

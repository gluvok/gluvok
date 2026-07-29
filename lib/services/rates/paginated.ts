import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Rate } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchRatesPaginated(params: PaginatedParams): Promise<{ data: Rate[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Rate[]; pagination: { total: number } }>(ApiRoutes.RATES, {
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

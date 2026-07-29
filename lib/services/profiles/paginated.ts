import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Profile } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchProfilesPaginated(params: PaginatedParams): Promise<{ data: Profile[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Profile[]; pagination: { total: number } }>(ApiRoutes.PROFILES, {
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

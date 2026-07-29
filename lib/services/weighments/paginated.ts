import axios from "axios"
import { type PaginatedParams } from "../scoping"
import { type Weighment } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchWeighmentsPaginated(params: PaginatedParams): Promise<{ data: Weighment[]; count: number }> {
  const { page, pageSize, search } = params
  const res = await axios.get<{ data: Weighment[]; pagination: { total: number } }>(ApiRoutes.WEIGHMENTS, {
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

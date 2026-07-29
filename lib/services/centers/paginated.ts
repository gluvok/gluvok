import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Center } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCentersPaginated(params: PaginatedParams): Promise<{ data: Center[]; count: number }> {
  return fetchEntityPaginatedFromApi<Center>(ProjectSlug.CENTERS, params)
}

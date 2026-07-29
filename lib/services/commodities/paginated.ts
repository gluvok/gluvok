import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Commodity } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCommoditiesPaginated(params: PaginatedParams): Promise<{ data: Commodity[]; count: number }> {
  return fetchEntityPaginatedFromApi<Commodity>(ProjectSlug.COMMODITIES, params)
}

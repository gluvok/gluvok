import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Factory } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchFactoriesPaginated(params: PaginatedParams): Promise<{ data: Factory[]; count: number }> {
  return fetchEntityPaginatedFromApi<Factory>(ProjectSlug.FACTORIES, params)
}

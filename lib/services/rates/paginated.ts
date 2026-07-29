import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Rate } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchRatesPaginated(params: PaginatedParams): Promise<{ data: Rate[]; count: number }> {
  return fetchEntityPaginatedFromApi<Rate>(ProjectSlug.RATES, params)
}

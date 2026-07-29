import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Weighment } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchWeighmentsPaginated(params: PaginatedParams): Promise<{ data: Weighment[]; count: number }> {
  return fetchEntityPaginatedFromApi<Weighment>(ProjectSlug.WEIGHMENTS, params)
}

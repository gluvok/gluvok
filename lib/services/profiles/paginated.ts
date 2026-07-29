import { fetchEntityPaginatedFromApi } from "../common"
import { type PaginatedParams } from "../scoping"
import { type Profile } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchProfilesPaginated(params: PaginatedParams): Promise<{ data: Profile[]; count: number }> {
  return fetchEntityPaginatedFromApi<Profile>(ProjectSlug.PROFILES, params)
}

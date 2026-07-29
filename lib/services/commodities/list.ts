import { fetchEntityListFromApi } from "../common"
import { type Commodity } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCommodities(): Promise<Commodity[]> {
  return fetchEntityListFromApi<Commodity>(ProjectSlug.COMMODITIES)
}

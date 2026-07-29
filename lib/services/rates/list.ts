import { fetchEntityListFromApi } from "../common"
import { type Rate } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchRates(): Promise<Rate[]> {
  return fetchEntityListFromApi<Rate>(ProjectSlug.RATES)
}

import { fetchEntityListFromApi } from "../common"
import { type Center } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCenters(): Promise<Center[]> {
  return fetchEntityListFromApi<Center>(ProjectSlug.CENTERS)
}

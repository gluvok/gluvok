import { fetchEntityListFromApi } from "../common"
import { type Factory } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchFactories(): Promise<Factory[]> {
  return fetchEntityListFromApi<Factory>(ProjectSlug.FACTORIES)
}

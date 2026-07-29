import { fetchEntityListFromApi } from "../common"
import { type Weighment } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchWeighments(): Promise<Weighment[]> {
  return fetchEntityListFromApi<Weighment>(ProjectSlug.WEIGHMENTS)
}

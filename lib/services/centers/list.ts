import { fetchEntityListFromApi } from "../common"
import { type Center } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCenters(): Promise<Center[]> {
  return fetchEntityListFromApi<Center>(ProjectSlug.CENTERS)
}

export async function fetchCenterById(id: number): Promise<Center> {
  const list = await fetchCenters()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Center with ID ${id} not found`)
  return found
}

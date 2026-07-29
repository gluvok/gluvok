import { fetchEntityListFromApi } from "../common"
import { type Commodity } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCommodities(): Promise<Commodity[]> {
  return fetchEntityListFromApi<Commodity>(ProjectSlug.COMMODITIES)
}

export async function fetchCommodityById(id: number): Promise<Commodity> {
  const list = await fetchCommodities()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Commodity with ID ${id} not found`)
  return found
}

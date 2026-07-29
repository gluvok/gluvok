import { fetchEntityListFromApi } from "../common"
import { type Rate } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchRates(): Promise<Rate[]> {
  return fetchEntityListFromApi<Rate>(ProjectSlug.RATES)
}

export async function fetchRateById(id: number): Promise<Rate> {
  const list = await fetchRates()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Rate with ID ${id} not found`)
  return found
}

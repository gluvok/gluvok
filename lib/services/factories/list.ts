import { fetchEntityListFromApi } from "../common"
import { type Factory } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchFactories(): Promise<Factory[]> {
  return fetchEntityListFromApi<Factory>(ProjectSlug.FACTORIES)
}

export async function fetchFactoryById(id: number): Promise<Factory> {
  const list = await fetchFactories()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Factory with ID ${id} not found`)
  return found
}

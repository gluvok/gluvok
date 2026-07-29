import { fetchEntityListFromApi } from "../common"
import { type Weighment } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchWeighments(): Promise<Weighment[]> {
  return fetchEntityListFromApi<Weighment>(ProjectSlug.WEIGHMENTS)
}

export async function fetchWeighmentById(id: number): Promise<Weighment> {
  const list = await fetchWeighments()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Weighment with ID ${id} not found`)
  return found
}

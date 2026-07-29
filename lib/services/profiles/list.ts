import { fetchEntityListFromApi } from "../common"
import { type Profile } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchProfiles(): Promise<Profile[]> {
  return fetchEntityListFromApi<Profile>(ProjectSlug.PROFILES)
}

export async function fetchProfileById(id: number): Promise<Profile> {
  const list = await fetchProfiles()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Profile with ID ${id} not found`)
  return found
}

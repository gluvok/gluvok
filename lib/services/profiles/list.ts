import { fetchEntityListFromApi } from "../common"
import { type Profile } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchProfiles(): Promise<Profile[]> {
  return fetchEntityListFromApi<Profile>(ProjectSlug.PROFILES)
}

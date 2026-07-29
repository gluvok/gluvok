import axios from "axios"
import { type Profile } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await axios.get<{ data: Profile[] }>(ApiRoutes.PROFILES)
  return res.data.data
}

export async function fetchProfileById(id: number): Promise<Profile> {
  const res = await axios.get<{ data: Profile[] }>(ApiRoutes.PROFILES)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Profile with ID ${id} not found`)
  return found
}

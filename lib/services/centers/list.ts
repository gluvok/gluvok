import axios from "axios"
import { type Center } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCenters(): Promise<Center[]> {
  const res = await axios.get<{ data: Center[] }>(ApiRoutes.CENTERS)
  return res.data.data
}

export async function fetchCenterById(id: number): Promise<Center> {
  const res = await axios.get<{ data: Center[] }>(ApiRoutes.CENTERS)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Center with ID ${id} not found`)
  return found
}

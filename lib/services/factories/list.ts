import axios from "axios"
import { type Factory } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchFactories(): Promise<Factory[]> {
  const res = await axios.get<{ data: Factory[] }>(ApiRoutes.FACTORIES)
  return res.data.data
}

export async function fetchFactoryById(id: number): Promise<Factory> {
  const res = await axios.get<{ data: Factory[] }>(ApiRoutes.FACTORIES)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Factory with ID ${id} not found`)
  return found
}

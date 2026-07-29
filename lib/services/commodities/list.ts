import axios from "axios"
import { type Commodity } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCommodities(): Promise<Commodity[]> {
  const res = await axios.get<{ data: Commodity[] }>(ApiRoutes.COMMODITIES)
  return res.data.data
}

export async function fetchCommodityById(id: number): Promise<Commodity> {
  const res = await axios.get<{ data: Commodity[] }>(ApiRoutes.COMMODITIES)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Commodity with ID ${id} not found`)
  return found
}

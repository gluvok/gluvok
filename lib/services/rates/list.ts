import axios from "axios"
import { type Rate } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchRates(): Promise<Rate[]> {
  const res = await axios.get<{ data: Rate[] }>(ApiRoutes.RATES)
  return res.data.data
}

export async function fetchRateById(id: number): Promise<Rate> {
  const res = await axios.get<{ data: Rate[] }>(ApiRoutes.RATES)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Rate with ID ${id} not found`)
  return found
}

import axios from "axios"
import { type Weighment } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchWeighments(): Promise<Weighment[]> {
  const res = await axios.get<{ data: Weighment[] }>(ApiRoutes.WEIGHMENTS)
  return res.data.data
}

export async function fetchWeighmentById(id: number): Promise<Weighment> {
  const res = await axios.get<{ data: Weighment[] }>(ApiRoutes.WEIGHMENTS)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Weighment with ID ${id} not found`)
  return found
}

import axios from "axios"
import { type Customer } from "@/types"
import { ApiRoutes } from "@/lib/constants/enums"

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await axios.get<{ data: Customer[] }>(ApiRoutes.CUSTOMERS)
  return res.data.data
}

export async function fetchCustomerById(id: number): Promise<Customer> {
  const res = await axios.get<{ data: Customer[] }>(ApiRoutes.CUSTOMERS)
  const found = res.data.data.find((item) => item.id === id)
  if (!found) throw new Error(`Customer with ID ${id} not found`)
  return found
}

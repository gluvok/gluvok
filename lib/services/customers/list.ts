import { fetchEntityListFromApi } from "../common"
import { type Customer } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCustomers(): Promise<Customer[]> {
  return fetchEntityListFromApi<Customer>(ProjectSlug.CUSTOMERS)
}

export async function fetchCustomerById(id: number): Promise<Customer> {
  const list = await fetchCustomers()
  const found = list.find((item) => item.id === id)
  if (!found) throw new Error(`Customer with ID ${id} not found`)
  return found
}

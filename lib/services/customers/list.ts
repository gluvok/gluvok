import { fetchEntityListFromApi } from "../common"
import { type Customer } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"

export async function fetchCustomers(): Promise<Customer[]> {
  return fetchEntityListFromApi<Customer>(ProjectSlug.CUSTOMERS)
}

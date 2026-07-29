/**
 * @file lib/services/index.ts
 * @description Database service logic for CRUD operations of services.
 */

export * from "./common"
export * from "./scoping"

export { fetchCenters, fetchCentersPaginated } from "./centers"
export { fetchCommodities, fetchCommoditiesPaginated } from "./commodities"
export { fetchRates, fetchRatesPaginated } from "./rates"
export { fetchCustomers, fetchCustomersPaginated } from "./customers"
export { fetchWeighments, fetchWeighmentsPaginated } from "./weighments"
export { fetchFactories, fetchFactoriesPaginated } from "./factories"
export { fetchProfiles, fetchProfilesPaginated } from "./profiles"

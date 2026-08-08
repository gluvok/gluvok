/**
 * @file lib/constants/messages.ts
 * @description Centralized user-facing error and notification message constants.
 */

export const AuthErrorMessage = {
  INVALID_CREDENTIALS: "Invalid username or password",
  SIGN_IN_ERROR: "An error occurred during sign in. Please try again",
  REQUIRED_FIELDS: "Username and password are required",
  INTERNAL_SERVER_ERROR: "Internal server error",
} as const

export const ApiErrorMessage = {
  // Entity Not Found
  CENTER_NOT_FOUND: "Center not found",
  CUSTOMER_NOT_FOUND: "Customer not found",
  PROFILE_NOT_FOUND: "Profile not found",
  RATE_NOT_FOUND: "Rate not found",
  WEIGHMENT_NOT_FOUND: "Weighment not found",
  COMMODITY_NOT_FOUND: "Commodity not found",
  SETTING_NOT_FOUND: "Setting not found",
  USER_NOT_FOUND: "User not found",

  // Single Entity FK Violations
  CANNOT_DELETE_CENTER: "Cannot delete this center because it is referenced by existing weighments.",
  CANNOT_DELETE_CUSTOMER: "Cannot delete this customer because they are referenced by existing weighments.",
  CANNOT_DELETE_PROFILE: "Cannot delete this profile because it is referenced by existing weighments.",
  CANNOT_DELETE_RATE: "Cannot delete this rate because it is referenced by existing weighments.",
  CANNOT_DELETE_WEIGHMENT: "Cannot delete this weighment because it is referenced by other records.",
  CANNOT_DELETE_COMMODITY: "Cannot delete this commodity because it is referenced by existing rates or weighments.",

  // Bulk Delete FK Violations
  CANNOT_DELETE_SELECTED_CENTERS: "Cannot delete selected centers because they are referenced by existing weighments.",
  CANNOT_DELETE_SELECTED_CUSTOMERS: "Cannot delete selected customers because they are referenced by existing weighments.",
  CANNOT_DELETE_SELECTED_PROFILES: "Cannot delete selected profiles because they are referenced by existing weighments.",
  CANNOT_DELETE_SELECTED_RATES: "Cannot delete selected rates because they are referenced by existing weighments.",
  CANNOT_DELETE_SELECTED_WEIGHMENTS: "Cannot delete selected weighments because they are referenced by other records.",
  CANNOT_DELETE_SELECTED_COMMODITIES: "Cannot delete selected commodities because they are referenced by existing rates or weighments.",

  // Bulk Delete Not Found
  ONE_OR_MORE_CENTERS_NOT_FOUND: "One or more centers were not found",
  ONE_OR_MORE_CUSTOMERS_NOT_FOUND: "One or more customers were not found",
  ONE_OR_MORE_PROFILES_NOT_FOUND: "One or more profiles were not found",
  ONE_OR_MORE_RATES_NOT_FOUND: "One or more rates were not found",
  ONE_OR_MORE_WEIGHMENTS_NOT_FOUND: "One or more weighments were not found",
  ONE_OR_MORE_COMMODITIES_NOT_FOUND: "One or more commodities were not found",
  ONE_OR_MORE_SETTINGS_NOT_FOUND: "One or more settings were not found",

  // Generic & Validation
  PROVIDE_VALID_IDS: "Provide between 1 and 100 valid IDs",
  USERNAME_TAKEN: "Username is already taken",
} as const

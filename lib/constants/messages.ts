/**
 * @file lib/constants/messages.ts
 * @description Centralized user-facing error and notification message constants.
 */

export const AuthErrorMessage = {
  INVALID_CREDENTIALS: "Invalid username or password",
  SIGN_IN_ERROR: "An error occurred during sign in. Please try again",
  REQUIRED_FIELDS: "Username and password are required",
  INTERNAL_SERVER_ERROR: "Internal server error",
  TOKEN_REFRESH_FAILED: "Token refresh failed",
} as const;

export const ApiErrorMessage = {
  // Entity Not Found
  CENTER_NOT_FOUND: "Center not found",
  CUSTOMER_NOT_FOUND: "Customer not found",
  RATE_NOT_FOUND: "Rate not found",
  WEIGHMENT_NOT_FOUND: "Weighment not found",
  COMMODITY_NOT_FOUND: "Commodity not found",
  SETTING_NOT_FOUND: "Setting not found",
  USER_NOT_FOUND: "User not found",
  ENTRY_NOT_FOUND: "Entry not found",

  // Single Entity FK Violations
  CANNOT_DELETE_CENTER: (id?: string | number) =>
    id
      ? `Cannot delete this center (${id}) because it is referenced by existing entries or weighments.`
      : "Cannot delete this center because it is referenced by existing entries or weighments.",
  CANNOT_DELETE_CUSTOMER: (id?: string | number) =>
    id
      ? `Cannot delete this customer (${id}) because they are referenced by existing entries or weighments.`
      : "Cannot delete this customer because they are referenced by existing entries or weighments.",
  CANNOT_DELETE_USER: (id?: string | number) =>
    id
      ? `Cannot delete this user (${id}) because they are referenced by existing entries or weighments.`
      : "Cannot delete this user because they are referenced by existing entries or weighments.",
  CANNOT_DELETE_RATE: (id?: string | number) =>
    id
      ? `Cannot delete this rate (${id}) because it is referenced by existing weighments.`
      : "Cannot delete this rate because it is referenced by existing weighments.",
  CANNOT_DELETE_WEIGHMENT: (id?: string | number) =>
    id
      ? `Cannot delete this weighment (${id}) because it is referenced by other records.`
      : "Cannot delete this weighment because it is referenced by other records.",
  CANNOT_DELETE_COMMODITY: (id?: string | number) =>
    id
      ? `Cannot delete this commodity (${id}) because it is referenced by existing rates or weighments.`
      : "Cannot delete this commodity because it is referenced by existing rates or weighments.",
  CANNOT_DELETE_ENTRY: (id?: string | number) =>
    id
      ? `Cannot delete this entry (${id}) because it is part of a merged weighment record.`
      : "Cannot delete this entry because it is part of a merged weighment record.",

  // Bulk Delete FK Violations
  CANNOT_DELETE_SELECTED_CENTERS:
    "Cannot delete selected centers because they are referenced by existing entries or weighments.",
  CANNOT_DELETE_SELECTED_CUSTOMERS:
    "Cannot delete selected customers because they are referenced by existing entries or weighments.",
  CANNOT_DELETE_SELECTED_USERS:
    "Cannot delete selected users because they are referenced by existing entries or weighments.",
  CANNOT_DELETE_SELECTED_RATES:
    "Cannot delete selected rates because they are referenced by existing weighments.",
  CANNOT_DELETE_SELECTED_WEIGHMENTS:
    "Cannot delete selected weighments because they are referenced by other records.",
  CANNOT_DELETE_SELECTED_COMMODITIES:
    "Cannot delete selected commodities because they are referenced by existing rates or weighments.",
  CANNOT_DELETE_SELECTED_ENTRIES:
    "Cannot delete selected entries because one or more are part of a merged weighment record.",

  // Bulk Delete Not Found
  ONE_OR_MORE_CENTERS_NOT_FOUND: "One or more centers were not found",
  ONE_OR_MORE_CUSTOMERS_NOT_FOUND: "One or more customers were not found",
  ONE_OR_MORE_USERS_NOT_FOUND: "One or more users were not found",
  ONE_OR_MORE_RATES_NOT_FOUND: "One or more rates were not found",
  ONE_OR_MORE_WEIGHMENTS_NOT_FOUND: "One or more weighments were not found",
  ONE_OR_MORE_COMMODITIES_NOT_FOUND: "One or more commodities were not found",
  ONE_OR_MORE_SETTINGS_NOT_FOUND: "One or more settings were not found",
  ONE_OR_MORE_ENTRIES_NOT_FOUND: "One or more entries were not found",

  // Generic & Validation
  PROVIDE_VALID_IDS: "Provide between 1 and 100 valid IDs",
  USERNAME_TAKEN: "Username is already taken",
  GOVT_ID_EXISTS: "Govt ID already exists in this factory",
  AADHAR_NUMBER_EXISTS: "Aadhar number is already registered in this factory",

  // Creation Failures
  CREATE_USER_RECORD_FAILED: "Failed to create user record",
  CREATE_CUSTOMER_USER_FAILED: "Failed to create customer user account",
  CREATE_CUSTOMER_FAILED: "Failed to create customer",
  CREATE_CENTER_FAILED: "Failed to create center",
  CREATE_RATE_FAILED: "Failed to create rate",
  CREATE_WEIGHMENT_FAILED: "Failed to create weighment",
  CREATE_COMMODITY_FAILED: "Failed to create commodity",
  SELECTED_CENTER_NOT_FOUND: "Selected center not found",
  SAVE_CONFIGURATION_FAILED: "Failed to save configuration in database.",
  DELETE_SETTINGS_FAILED: "Failed to delete selected setting(s)",

  // Entry Specific
  ENTRY_REJECTED_LOCKED: "Rejected entries cannot be modified or approved.",
  ENTRY_APPROVED_CUSTOMER_LOCKED:
    "Approved entries with an assigned customer are fully locked and cannot be edited.",
  CANNOT_MODIFY_APPROVED_ENTRY: (field: string) => `Cannot modify ${field} on approved entries.`,
  FAILED_TO_UPDATE_ENTRY: "Failed to update entry",
  SEQUENTIAL_APPROVAL_FAILED: "Sequential approval validation failed.",
} as const;

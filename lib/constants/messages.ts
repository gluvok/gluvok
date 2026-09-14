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
  INVALID_DEVICE_SECRET: "Access denied: Invalid or missing microcontroller device secret.",
  FORBIDDEN: "You do not have permission to perform this action.",
} as const;

export const ApiErrorMessage = {
  // HTTP Protocol & Client Errors
  METHOD_NOT_ALLOWED: "This action is not supported or not allowed for this record.",
  FORBIDDEN: "You do not have permission to perform this action.",
  CREATE_USER_FAILED: "Failed to create user",
  FAILED_TO_UPDATE_USER: "Failed to update user",
  RECORD_NOT_FOUND: "The requested record was not found.",
  UNAUTHORIZED_DEVICE: "Unauthorized or disabled device",
  INVALID_DEVICE_KEY: "Invalid device key",

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
  CENTER_NAME_EXISTS: "A collection center with this name already exists in this factory.",
  RATE_EXISTS: "A rate for this commodity and unit already exists in this factory.",

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
  ENTRY_FULLY_LOCKED: "This entry is fully locked and cannot be edited.",
  CANNOT_MODIFY_MANUALLY_APPROVED_VEHICLE:
    "Vehicle number cannot be modified on manually approved entries.",
  VEHICLE_ALREADY_EDITED_LOCKED:
    "Vehicle number on this auto-approved entry has already been edited and is locked.",
  CANNOT_MODIFY_APPROVED_ENTRY: (field: string) => `Cannot modify ${field} on approved entries.`,
  FAILED_TO_UPDATE_ENTRY: "Failed to update entry",
  SEQUENTIAL_APPROVAL_FAILED: "Sequential approval validation failed.",
  VALIDATE_SEQUENCE_FAILED: "Failed to validate entry sequence.",
  CANNOT_APPROVE_PENDING_EARLIER_ENTRY: (
    targetEntryId: number | string,
    earlierId: number | string,
    dateStr: string,
    vehicleNumber: string,
    typeLabel = "",
  ) =>
    `Cannot approve entry #${targetEntryId} because earlier ${typeLabel}entry #${earlierId} (from ${dateStr}) for vehicle "${vehicleNumber}" is still pending. Please approve entries in sequential order.`,
  INVALID_DEVICE_SECRET: "Access denied: Invalid or missing microcontroller device secret.",
  UNAUTHORIZED: "Unauthorized",
  MISSING_REQUIRED_ENTRY_FIELDS: "Missing required entry fields.",
  CREATE_ENTRY_FAILED: "Failed to create entry.",
  PROCESS_DEVICE_ENTRY_FAILED: "Failed to process device entry creation.",
  PROCESS_ENTRY_FAILED: "Failed to process entry creation.",
  CANNOT_APPROVE_NO_PLATE:
    "Cannot approve an entry with no detected license plate. Please assign a valid vehicle number first.",
  CANNOT_MODIFY_DEVICE_FIELD: (field: string) => `Cannot modify ${field} on a device entry.`,

  // Weighments Specific
  RATE_ASSOCIATED_WITH_WEIGHMENT:
    "This rate is associated with weighment record(s) and cannot be edited.",
  WEIGHMENT_TYPE_ALREADY_SET: "Weighment type is already set and cannot be modified further.",
  WEIGHMENT_RATE_ALREADY_SET: "Rate is already set for this weighment and cannot be modified.",
  WEIGHMENT_RATE_NOT_FOUND: "Rate not found or does not belong to your factory.",
  WEIGHMENT_ONLY_TYPE_RATE_EDITABLE:
    "Only the 'type' and 'rate_id' fields can be edited on a weighment record.",
  WEIGHMENT_NO_VALID_FIELDS: "No valid fields provided for update.",
  FAILED_TO_UPDATE_WEIGHMENT: "Failed to update weighment record.",

  // Settings Specific
  ONLY_ADMIN_MODIFY_SETTINGS: "Only admin has permission to modify factory settings.",
  FACTORY_SETTINGS_NOT_FOUND: "Factory settings not found",

  // Storage / Uploads
  NO_IMAGE_FILES_PROVIDED: "No image files provided for upload.",
  FILE_EXCEEDS_MAX_SIZE: (fileName: string, maxMB = 10) =>
    `File "${fileName}" exceeds maximum allowed size of ${maxMB}MB.`,
  INVALID_IMAGE_FILE_TYPE: (fileType: string) =>
    `Invalid file type "${fileType}". Only image files are permitted.`,
  FAILED_TO_UPLOAD_IMAGE: "Failed to upload image to storage.",
  FAILED_TO_DELETE_IMAGES: "Failed to delete images from storage.",
  CENTER_ID_REQUIRED_FOR_UPLOAD: "Collection center ID is required for image uploads.",
  DEVICE_NOT_ASSIGNED_TO_CENTER: "Device is not assigned to a collection center.",

  DATABASE_QUERY_FAILED: "Database query failed",
} as const;

export const ValidationMessage = {
  REQUIRED: (fieldName: string) => `${fieldName} is required`,
  MIN_LENGTH: (fieldName: string, min: number) => `${fieldName} must be at least ${min} characters`,
  MAX_LENGTH: (fieldName: string, max: number) => `${fieldName} must be ${max} characters or less`,
  MUST_BE_INTEGER: (fieldName: string) => `${fieldName} must be an integer`,
  MUST_BE_POSITIVE_INTEGER: (fieldName: string) => `${fieldName} must be a positive integer`,
  POSITIVE_INTEGER_REQUIRED: (fieldName: string) =>
    `${fieldName} is required and must be a positive number`,
  MUST_BE_NUMBER: (fieldName: string) => `${fieldName} must be a number`,
  MUST_BE_POSITIVE_NUMBER: (fieldName: string) => `${fieldName} must be a positive number`,
  VALID_UUID: (fieldName: string) => `${fieldName} must be a valid UUID`,
  EXACT_DIGITS: (fieldName: string, digits: number) =>
    `${fieldName} must be exactly ${digits} digits`,
  DIGITS_ONLY: (fieldName: string) => `${fieldName} must contain only digits`,
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
  CONFIRM_PASSWORD_REQUIRED: "Please confirm your password",
  VALID_ROLE_REQUIRED: "Please select a valid role",
  VALID_UNIT_REQUIRED: "Unit must be a valid unit (kg, q, or gal)",
  VALID_AADHAR_MODE_REQUIRED: "Please select a valid Aadhaar Number mode",
  VALID_GOVT_ID_MODE_REQUIRED: "Please select a valid Govt ID mode",
  FACTORY_NAME_REQUIRED: "Factory Name is required",
  INDIAN_PLATE_REQUIRED: (fieldName: string) => `${fieldName} plate number is required`,
  INDIAN_PLATE_MAX: (fieldName: string, max = 15) =>
    `${fieldName} plate must be ${max} characters or less`,
  INDIAN_PLATE_FORMAT:
    "Must match standard Indian plate (e.g. MH04BG6491, PB10XY1234) or BH series (e.g. 22BH1234AA)",
  INDIAN_PLATE_STATE: "First two characters must be a valid Indian state or union territory code",
  USERNAME_REQUIRED_WITH_PASSWORD: (fieldName: string) =>
    `${fieldName} is required when setting a password`,
  PASSWORD_REQUIRED_WITH_USERNAME: (fieldName: string) =>
    `${fieldName} is required when providing a username`,
} as const;

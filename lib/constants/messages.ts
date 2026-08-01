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

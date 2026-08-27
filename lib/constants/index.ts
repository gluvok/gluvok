/**
 * @file lib/constants/index.ts
 * @description General configuration constants and barrel exports.
 */

export * from "./enums";
export * from "./routes";
export * from "./messages";

/** Default avatar image path used throughout the platform */
export const DEFAULT_AVATAR = "/avatars/default.jpg";

/** Unified token expiration configurations (for both web and device clients) */
export const AuthTokenExpiry = {
  ACCESS_TOKEN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "5m",
  REFRESH_TOKEN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
} as const;

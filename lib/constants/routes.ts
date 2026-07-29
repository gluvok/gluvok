/**
 * @file lib/constants/routes.ts
 * @description Constants registry and configuration values for routes.
 */

import { AppRoutes, ApiRoutes } from "@/lib/constants/enums"

export const AUTH_ROUTES = [
  AppRoutes.LOGIN,
]

export const PUBLIC_ROUTES = [
  AppRoutes.SERVICES,
]

export const PUBLIC_API_ROUTES = [
  ApiRoutes.AUTH_LOGIN,
]



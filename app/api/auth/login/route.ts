/**
 * @file app/api/auth/login/route.ts
 * @description API route for browser authentication.
 */

import { NextRequest } from "next/server"
import { handleLogin } from "./handler"

export async function POST(request: NextRequest) {
  return handleLogin(request, "browser")
}
